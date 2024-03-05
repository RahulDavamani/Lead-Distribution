import { prisma } from '../../../../prisma/prisma';
import { scheduleJob } from 'node-schedule';
import prismaErrorHandler from '../../../../prisma/prismaErrorHandler';
import { generateMessage } from './generateMessage';
import { getGHLStatus, updateGHLTemplates } from './ghl';
import { twilioSendSMS } from './twilio';
import { updateLeadFunc } from './updateLead';
import { completeLead } from './completeLead';
import { lcSendSMS } from './liveChat';

export const sendSMS = async (ProspectKey: string, smsTemplate: string) => {
	const updateLead = updateLeadFunc(ProspectKey);
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

	let messageResponse;
	switch (rule.messagingService) {
		case 'twilio':
			await twilioSendSMS(Phone ?? '', message);
			break;

		case 'ghl':
			await updateGHLTemplates(ProspectKey, { bundlesmstemplate: message });
			break;

		case 'liveChat':
			messageResponse = await lcSendSMS(Phone ?? '', message);
			break;
	}

	await updateLead({
		log: { log: `SMS #${messages + 1}: Text message sent to customer ` },
		message: { message, messageResponse: { create: messageResponse } }
	});
};

export const watchGhlSMS = async (ProspectKey: string) => {
	const updateLead = updateLeadFunc(ProspectKey);
	const job = scheduleJob('*/30 * * * * *', async () => {
		const lead = await prisma.ldLead
			.findUnique({ where: { ProspectKey }, select: { id: true } })
			.catch(prismaErrorHandler);
		if (!lead) {
			job.cancel();
			return;
		}

		const ghlStatus = await getGHLStatus(ProspectKey);
		if (ghlStatus === 'Text Received') {
			job.cancel();
			await updateLead({ log: { log: 'GHL: Text Received' } });
			await completeLead({ ProspectKey, success: false, completeStatus: 'GHL Text Received' });
		}
	});
};
