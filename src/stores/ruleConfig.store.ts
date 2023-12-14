import { get, writable } from 'svelte/store';
import type { Rule } from '../zod/rule.schema';
import { trpcClientErrorHandler, type TRPCZodErrors } from '../trpc/trpcErrorhandler';
import { page } from '$app/stores';
import { ui } from './ui.store';
import { trpc } from '../trpc/client';
import { invalidateAll } from '$app/navigation';
import type { Operator } from '../zod/operator.schema';
import type { Affiliate } from '../zod/affiliate.schema';
import cloneDeep from 'lodash.clonedeep';

export interface RuleConfig {
	init: boolean;
	rule: Rule;
	zodErrors?: TRPCZodErrors<Rule>;

	showAddOperators: boolean;
	showAddAffiliates: boolean;

	operators: Operator[];
	affiliates: Affiliate[];
}

export const ruleConfig = (() => {
	const newRule: Rule = {
		id: null,
		name: '',
		description: '',
		outBoundCall: '',
		operators: [],
		affiliates: [],
		ghlContactStatus: '',
		waitTimeForCustomerResponse: null,
		notification: null
	};
	const { subscribe, set, update } = writable<RuleConfig>({
		init: false,
		rule: cloneDeep(newRule),

		showAddOperators: false,
		showAddAffiliates: false,

		operators: [],
		affiliates: []
	});

	const init = (rule: Rule | null, operators: Operator[], affiliates: Affiliate[]) => {
		update((state) => ({
			...state,
			init: true,
			rule: rule ?? cloneDeep(newRule),
			zodErrors: undefined,
			operators,
			affiliates
		}));
	};

	const saveRule = async () => {
		ui.setLoader({ title: 'Saving Rule' });
		const $page = get(page);
		const { rule } = get(ruleConfig);

		const { rule: updatedRule } = await trpc($page)
			.rule.saveRule.query(rule)
			.catch((e) => trpcClientErrorHandler<Rule>(e, (e) => update((state) => ({ ...state, zodErrors: e.zodErrors }))));
		if (!updatedRule) return;

		update((state) => ({ ...state, rule: updatedRule, zodErrors: undefined }));
		window.history.replaceState(history.state, '', `/rules/rule-config?id=${updatedRule.id}`);

		ui.showToast({
			class: 'alert-success',
			title: 'Rule Updated Successfully'
		});
		invalidateAll();
		ui.setLoader();
	};

	const deleteRule = async () => {
		ui.setLoader({ title: 'Deleting Rule' });
		const $page = get(page);
		const {
			rule: { id }
		} = get(ruleConfig);

		if (id) await trpc($page).rule.deleteRole.query({ id }).catch(trpcClientErrorHandler);

		window.location.href = '/rules';
		ui.showToast({
			class: 'alert-success',
			title: 'Rule Deleted Successfully'
		});
		invalidateAll();
		ui.setLoader();
	};

	return { subscribe, set, update, init, saveRule, deleteRule };
})();
