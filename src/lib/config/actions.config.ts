import type { Prisma } from '@prisma/client';
import completeLeadConfig from './completeLead/completeLead.config';
import type { CompleteLead } from './completeLead/completeLead.schema';
import requeueLeadConfig from './requeueLead/requeueLead.config';
import type { RequeueLead } from './requeueLead/requeueLead.schema';
import sendSMSConfig from './sendSMS/sendSMS.config';
import type { SendSMS } from './sendSMS/sendSMS.schema';

export type ActionKey = 'requeueLead' | 'sendSMS' | 'completeLead';

export type ActionsConfig = {
	[K in ActionKey]: ActionConfig<K>;
};
export type ActionConfig<K extends ActionKey> = {
	labels: ActionLabels<K>;

	client: {
		getNewAction: (num: number) => Action<K>;
	};
};

export type ActionLabels<K extends ActionKey> = {
	key: K;
	Key: Capitalize<K>;
	name: string;
	keyActions: `${K}Actions`;
};

export type Action<K extends ActionKey> = K extends 'requeueLead'
	? RequeueLead
	: K extends 'sendSMS'
		? SendSMS
		: CompleteLead;

export const actionsConfig: ActionsConfig = {
	...requeueLeadConfig,
	...sendSMSConfig,
	...completeLeadConfig
};

export const actionKeys = Object.keys(actionsConfig) as ActionKey[];
export const actionsConfigList = Object.values(actionsConfig);
export const keyActionsList = actionsConfigList.map(({ labels }) => labels.keyActions);
export const actionsInclude: { include: Prisma.LdRuleActionsInclude } = {
	include: Object.fromEntries(keyActionsList.map((k) => [k, true]))
};
