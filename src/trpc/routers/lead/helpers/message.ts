import { scheduleJob } from 'node-schedule';
import prismaErrorHandler from '../../../../prisma/prismaErrorHandler';
import { generateMessage } from './generateMessage';
import { getGHLStatus, updateGHLTemplates } from './ghl';
import { completeLead, upsertLeadFunc } from './lead';
import { twilioSendSMS } from './twilio';

export const sendSMS = async (ProspectKey: string, smsTemplate: string) => {
	const upsertLead = upsertLeadFunc(ProspectKey);
	const message = await generateMessage(ProspectKey, smsTemplate);

	const {
		rule,
		_count: { messages }
	} = await prisma.ldLead
		.findUniqueOrThrow({
			where: { ProspectKey },
			select: {
				rule: { select: { messagingService: true } },
				_count: { select: { messages: true } }
			}
		})
		.catch(prismaErrorHandler);
	if (!rule) return;

	const { Phone } = await prisma.leadProspect
		.findFirstOrThrow({ where: { ProspectKey }, select: { Phone: true } })
		.catch(prismaErrorHandler);

	console.log(rule.messagingService);
	if (rule.messagingService === 'twilio') await twilioSendSMS(Phone ?? '', message);
	else await updateGHLTemplates(ProspectKey, { bundlesmstemplate: message });

	await upsertLead({
		log: { log: `SMS #${messages + 1}: Text message sent to customer ` },
		message: { message }
	});
};

export const watchGhlSMS = async (ProspectKey: string) => {
	const upsertLead = upsertLeadFunc(ProspectKey);
	const job = scheduleJob('*/30 * * * * *', async () => {
		const lead = await prisma.ldLead
			.findUnique({ where: { ProspectKey }, select: { id: true } })
			.catch(prismaErrorHandler);
		if (!lead) {
			job.cancel();
			return;
		}

		const ghlStatus = await getGHLStatus(ProspectKey);
		console.log(`GHL: ${ghlStatus}`);
		if (ghlStatus === 'Text Received') {
			job.cancel();
			await upsertLead({ log: { log: 'GHL: Text Received' } });
			await completeLead({ ProspectKey, success: false, completeStatus: 'Manual Lead Management' });
		}
	});
};
