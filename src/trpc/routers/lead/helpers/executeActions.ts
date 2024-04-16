import { getActionsList } from '$lib/config/actions/utils/getActionsList';
import { scheduleJob } from 'node-schedule';
import type { Actions } from '$lib/config/actions/actions.schema';
import { sendSMS } from './message';
import { prisma } from '../../../../prisma/prisma';
import prismaErrorHandler from '../../../../prisma/prismaErrorHandler';
import { updateLeadFunc } from './updateLead';
import { completeLead } from './completeLead';
import { scheduleCallback } from './scheduleCallback';
import { parseScheduleTimes } from './parseScheduleTimes';

export const executeActions = async (ProspectKey: string, actions: Actions) => {
	const updateLead = updateLeadFunc(ProspectKey);
	const { actionsList } = getActionsList(actions);

	const responseCount = await prisma.ldLeadResponse
		.count({ where: { lead: { ProspectKey } } })
		.catch(prismaErrorHandler);

	const { overrideCallback } = await prisma.ldLead.findUniqueOrThrow({
		where: { ProspectKey },
		select: { overrideCallback: true }
	});
	await prisma.ldLead.update({
		where: { ProspectKey },
		data: { overrideCallback: false }
	});

	for (const action of actionsList) {
		// Send SMS
		if (action.sendSMS) {
			const { num, smsTemplate } = action.sendSMS;

			const { scheduleTimeText, scheduledTime } = parseScheduleTimes(action.sendSMS.scheduleTimes, responseCount);
			scheduleJob(scheduledTime, async () => await sendSMS(ProspectKey, smsTemplate));
			await updateLead({ log: { log: `Action #${num}: Send SMS scheduled in ${scheduleTimeText}` } });
		}

		// Schedule Callback
		if (action.scheduleCallback) {
			const { num, scheduleTimes, sendSMS, smsTemplate, smsWaitTime } = action.scheduleCallback;
			if (overrideCallback) await updateLead({ log: { log: `Action #${num}: Schedule callback overridden` } });
			else {
				const { scheduleTimeText, scheduledTime } = parseScheduleTimes(scheduleTimes, responseCount);
				try {
					await scheduleCallback(ProspectKey, scheduledTime, sendSMS ? { smsTemplate, smsWaitTime } : undefined);
					await updateLead({ log: { log: `Action #${num}: Lead callback scheduled in ${scheduleTimeText}` } });
				} catch (error) {
					await updateLead({ log: { log: `Action #${num}: Failed to schedule callback` } });
				}
			}
		}

		// Complete Lead
		if (action.completeLead) {
			const { num, success, completeStatus } = action.completeLead;
			await updateLead({ log: { log: `Action #${num}: Complete Lead` } });
			await completeLead({ ProspectKey, success, completeStatus, notes: '' });
			break;
		}
	}
};
