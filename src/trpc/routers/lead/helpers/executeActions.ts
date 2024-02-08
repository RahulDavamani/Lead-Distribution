import { timeToText } from '$lib/client/DateTime';
import { getActionsList } from '$lib/config/utils/getActionsList';
import { scheduleJob } from 'node-schedule';
import { redistributeLead } from './distributeLead';
import { completeLead, updateLeadFunc } from './lead.helper';
import prismaErrorHandler from '../../../../prisma/prismaErrorHandler';
import { generateMessage } from './generateMessage';
import { sendSMS } from './twilio';
import type { Actions } from '$lib/config/actions.schema';

export const executeActions = async (validateResponseType: string, ProspectKey: string, actions: Actions) => {
	const updateLead = updateLeadFunc(ProspectKey);
	const { actionsList } = getActionsList(actions);

	for (const action of actionsList) {
		if (action.requeueLead) {
			// Requeue Lead
			const scheduleTimeText = timeToText(action.requeueLead.scheduleTime);
			const scheduledTime = new Date(Date.now() + action.requeueLead.scheduleTime * 1000);
			scheduleJob(scheduledTime, async () => await redistributeLead(ProspectKey));
			await updateLead({ log: { log: `${validateResponseType}: Lead requeue scheduled in ${scheduleTimeText}` } });
		}

		// Send SMS
		if (action.sendSMS) {
			const scheduleTimeText = timeToText(action.sendSMS.scheduleTime);
			const scheduledTime = new Date(Date.now() + action.sendSMS.scheduleTime * 1000);
			scheduleJob(scheduledTime, async () => {
				const { Phone } = await prisma.leadProspect
					.findFirstOrThrow({ where: { ProspectKey }, select: { Phone: true } })
					.catch(prismaErrorHandler);
				const message = await generateMessage(ProspectKey, action.sendSMS?.smsTemplate ?? '');
				await sendSMS(Phone ?? '', message);
				const {
					_count: { messages }
				} = await prisma.ldLead
					.findUniqueOrThrow({ where: { ProspectKey }, select: { _count: { select: { messages: true } } } })
					.catch(prismaErrorHandler);
				await updateLead({
					log: { log: `${validateResponseType}: Text message sent to customer (SMS #${messages + 1})` },
					message: { message }
				});
			});
			await updateLead({ log: { log: `${validateResponseType}: Send SMS scheduled in ${scheduleTimeText}` } });
		}

		// Complete Lead
		if (action.completeLead) {
			await completeLead(ProspectKey);
			await updateLead({ log: { log: `Lead completed` } });
			break;
		}

		// Close Lead
		if (action.closeLead) {
			await completeLead(ProspectKey, action.closeLead.closeStatus);
			await updateLead({ log: { log: `Lead closed by response action: ${action.closeLead.closeStatus}` } });
			break;
		}
	}
};
