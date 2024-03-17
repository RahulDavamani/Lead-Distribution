import type { Prisma } from '@prisma/client';
import sendSMSConfig from './sendSMS/sendSMS.config';
import type { SendSMS } from './sendSMS/sendSMS.schema';
import scheduleCallbackConfig from './scheduleCallback/scheduleCallback.config';
import type { ScheduleCallback } from './scheduleCallback/scheduleCallback.schema';
import completeLeadConfig from './completeLead/completeLead.config';
import type { CompleteLead } from './completeLead/completeLead.schema';

export type ActionKey = 'sendSMS' | 'scheduleCallback' | 'completeLead';

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

export type Action<K extends ActionKey> = K extends 'sendSMS'
	? SendSMS
	: K extends 'scheduleCallback'
		? ScheduleCallback
		: CompleteLead;

export const actionsConfig: ActionsConfig = {
	...sendSMSConfig,
	...scheduleCallbackConfig,
	...completeLeadConfig
};

export const actionKeys = Object.keys(actionsConfig) as ActionKey[];
export const actionsConfigList = Object.values(actionsConfig);
export const keyActionsList = actionsConfigList.map(({ labels }) => labels.keyActions);
export const actionsInclude: { include: Prisma.LdRuleActionsInclude } = {
	include: Object.fromEntries(keyActionsList.map((k) => [k, true]))
};
