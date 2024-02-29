import { timeToText } from '$lib/client/DateTime';
import { getActionsList } from '$lib/config/utils/getActionsList';
import { scheduleJob } from 'node-schedule';
import type { Actions } from '$lib/config/actions.schema';
import { sendSMS } from './message';
import { prisma } from '../../../../prisma/prisma';
import prismaErrorHandler from '../../../../prisma/prismaErrorHandler';
import { scheduleCallback } from './scheduleCallback';
import { updateLeadFunc } from './updateLead';
import { completeLead } from './completeLead';

const parseScheduleTimes = (times: string, responseCount: number) => {
	const scheduleTimes = times.split('|');
	const scheduleTime = Number(
		responseCount <= scheduleTimes.length ? scheduleTimes[responseCount - 1] : scheduleTimes[scheduleTimes.length - 1]
	);
	const scheduleTimeText = timeToText(scheduleTime);
	const scheduledTime = new Date(Date.now() + scheduleTime * 1000);

	return { scheduleTime, scheduleTimeText, scheduledTime };
};

export const executeActions = async (ProspectKey: string, actions: Actions) => {
	const updateLead = updateLeadFunc(ProspectKey);
	const responseCount = await prisma.ldLeadResponse
		.count({ where: { lead: { ProspectKey } } })
		.catch(prismaErrorHandler);
	const { actionsList } = getActionsList(actions);

	let i = 1;
	for (const action of actionsList) {
		if (action.requeueLead) {
			const { scheduleTimeText, scheduledTime } = parseScheduleTimes(action.requeueLead.scheduleTimes, responseCount);

			try {
				await scheduleCallback(ProspectKey, scheduledTime);
				await updateLead({ log: { log: `Action #${i}: Lead requeue scheduled in ${scheduleTimeText}` } });
			} catch (error) {
				await updateLead({ log: { log: `Action #${i}: Failed to schedule requeue` } });
			}
		}

		// Send SMS
		if (action.sendSMS) {
			const { smsTemplate } = action.sendSMS;
			const { scheduleTimeText, scheduledTime } = parseScheduleTimes(action.sendSMS.scheduleTimes, responseCount);

			const callCount = await prisma.ldLeadCall.count({ where: { lead: { ProspectKey } } }).catch(prismaErrorHandler);

			scheduleJob(scheduledTime, async () => {
				const { isPicked, calls } = await prisma.ldLead
					.findUniqueOrThrow({
						where: { ProspectKey },
						select: {
							isPicked: true,
							calls: { select: { id: true } }
						}
					})
					.catch(prismaErrorHandler);

				if (!isPicked && callCount === calls.length) await sendSMS(ProspectKey, smsTemplate);
			});
			await updateLead({ log: { log: `Action #${i}: Send SMS scheduled in ${scheduleTimeText}` } });
		}

		// Complete Lead
		if (action.completeLead) {
			const { success, completeStatus } = action.completeLead;
			await updateLead({ log: { log: `Action #${i}: Complete Lead` } });
			await completeLead({ ProspectKey, success, completeStatus });
			break;
		}
		i++;
	}
};
