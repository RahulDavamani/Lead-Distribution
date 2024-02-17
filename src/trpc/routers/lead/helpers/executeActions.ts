import { timeToText } from '$lib/client/DateTime';
import { getActionsList } from '$lib/config/utils/getActionsList';
import { scheduleJob } from 'node-schedule';
import { callbackRedistribute } from './distributeLead';
import { completeLead, upsertLeadFunc } from './lead';
import type { Actions } from '$lib/config/actions.schema';
import { sendSMS } from './message';

export const executeActions = async (ProspectKey: string, actions: Actions) => {
	const upsertLead = upsertLeadFunc(ProspectKey);
	const { actionsList } = getActionsList(actions);

	let i = 1;
	for (const action of actionsList) {
		if (action.requeueLead) {
			const { scheduleTime } = action.requeueLead;
			const scheduleTimeText = timeToText(scheduleTime);

			await callbackRedistribute(ProspectKey, scheduleTime);
			await upsertLead({ log: { log: `Action #${i}: Lead requeue scheduled in ${scheduleTimeText}` } });
		}

		// Send SMS
		if (action.sendSMS) {
			const { scheduleTime, smsTemplate } = action.sendSMS;

			const scheduleTimeText = timeToText(scheduleTime);
			const scheduledTime = new Date(Date.now() + scheduleTime * 1000);

			scheduleJob(scheduledTime, async () => await sendSMS(ProspectKey, smsTemplate));
			await upsertLead({ log: { log: `Action #${i}: Send SMS scheduled in ${scheduleTimeText}` } });
		}

		// Complete Lead
		if (action.completeLead) {
			const { success, completeStatus } = action.completeLead;
			await upsertLead({ log: { log: `Action #${i}: Complete Lead` } });
			await completeLead({ ProspectKey, success, completeStatus });
			break;
		}
		i++;
	}
};
