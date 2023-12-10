import { writable } from 'svelte/store';
import type { Rule } from '../zod/ruleSchema';
import type { Affiliate, Operator } from '@prisma/client';
import type { TRPCZodErrors } from '../trpc/trpcErrorhandler';

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
	const { subscribe, set, update } = writable<RuleConfig>({
		init: false,
		rule: {
			id: null,
			name: '',
			description: '',
			operators: [],
			affiliates: [],
			ghlContactStatus: '',
			waitTimeForCustomerResponse: null,
			notification: null
		},

		showAddOperators: false,
		showAddAffiliates: false,

		operators: [],
		affiliates: []
	});

	const init = (rule: Rule | null, operators: Operator[], affiliates: Affiliate[]) => {
		update((state) => ({
			...state,
			init: true,
			rule: rule ?? state.rule,
			operators,
			affiliates
		}));
	};

	return { subscribe, set, update, init };
})();
