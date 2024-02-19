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
import { nanoid } from 'nanoid';
import type { Actions } from '$lib/config/actions.schema';
import { actionsConfigList } from '$lib/config/actions.config';

export interface RuleConfig {
	init: boolean;
	rule: Rule;
	zodErrors?: TRPCZodErrors<Rule>;

	affiliates: Affiliate[];
	operators: Operator[];
}

export const ruleConfig = (() => {
	const getNewActions = (): Actions =>
		Object.fromEntries([['id', nanoid()], ...actionsConfigList.map(({ labels: { keyActions } }) => [keyActions, []])]);

	const newRule: Rule = {
		id: null,
		isActive: true,
		name: '',
		description: '',

		outboundCallNumber: '',
		messagingService: 'ghl',
		smsTemplate: '',

		affiliates: [],
		operators: [],
		supervisors: [],

		notificationAttempts: [],
		escalations: [],

		responses: [],
		responseOptions: {
			id: nanoid(),
			totalMaxAttempt: 10,
			responsesNoMatchActions: getNewActions(),
			responsesLimitExceedActions: getNewActions()
		}
	};

	const { subscribe, set, update } = writable<RuleConfig>({
		init: false,
		rule: cloneDeep(newRule),

		affiliates: [],
		operators: []
	});

	const init = (rule: Rule | null, affiliates: Affiliate[], operators: Operator[]) => {
		update((state) => ({
			...state,
			init: true,
			rule: rule ?? cloneDeep(newRule),
			zodErrors: undefined,
			affiliates,
			operators
		}));
	};

	const saveRule = async () => {
		ui.setLoader({ title: 'Saving Rule' });
		const $page = get(page);
		const { rule } = get(ruleConfig);

		const { ruleId } = await trpc($page)
			.rule.saveRule.mutate(rule)
			.catch((e) => trpcClientErrorHandler<Rule>(e, (e) => update((state) => ({ ...state, zodErrors: e.zodErrors }))));

		window.history.replaceState(history.state, '', `/rules/rule-config?id=${ruleId}`);

		await invalidateAll();
		ui.showToast({
			class: 'alert-success',
			title: 'Rule Updated Successfully'
		});
		ui.setLoader();
	};

	const deleteRule = async () => {
		ui.setLoader({ title: 'Deleting Rule' });
		const $page = get(page);
		const {
			rule: { id }
		} = get(ruleConfig);

		if (id) await trpc($page).rule.delete.query({ id }).catch(trpcClientErrorHandler);

		ui.navigate('/rules');
		ui.showToast({
			class: 'alert-success',
			title: 'Rule Deleted Successfully'
		});
	};

	return {
		subscribe,
		set,
		update,
		getNewActions,
		init,
		saveRule,
		deleteRule
	};
})();
