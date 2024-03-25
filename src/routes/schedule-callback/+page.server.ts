import { error } from '@sveltejs/kit';
import { scheduleCallback } from '../../trpc/routers/lead/helpers/scheduleCallback.js';
import { updateLeadFunc } from '../../trpc/routers/lead/helpers/updateLead.js';
import prismaErrorHandler from '../../prisma/prismaErrorHandler.js';
import { unCompleteLead } from '../../trpc/routers/lead/helpers/uncompleteLead.js';
import { insertLead } from '../../trpc/routers/lead/helpers/insertLead.js';

export const load = async (event) => {
	const ProspectKey = event.url.searchParams.get('ProspectKey');
	if (!ProspectKey) throw error(400, 'Bad Request: Missing params "ProspectKey"');
	const ScheduledTime = event.url.searchParams.get('ScheduledTime');
	if (!ScheduledTime) throw error(400, 'Bad Request: Missing params "ScheduledTime"');
	const scheduledTime = new Date(ScheduledTime);
	const Disposition = event.url.searchParams.get('Disposition');

	const lead = await prisma.ldLead
		.findUnique({ where: { ProspectKey }, select: { id: true } })
		.catch(prismaErrorHandler);

	const leadCompleted = await prisma.ldLeadCompleted
		.findUnique({ where: { ProspectKey }, select: { id: true } })
		.catch(prismaErrorHandler);

	let defaultCallbackNum = 0;
	let sms: { smsTemplate: string; smsWaitTime: number } | undefined;
	if (!lead && !leadCompleted) {
		await insertLead(ProspectKey, { isSendSMS: false, dispatchNotification: false });
		const { rule } = await prisma.ldLead
			.findUniqueOrThrow({ where: { ProspectKey }, select: { rule: { select: { smsTemplate: true } } } })
			.catch(prismaErrorHandler);
		sms = rule ? { smsTemplate: rule?.smsTemplate, smsWaitTime: 0 } : undefined;
		defaultCallbackNum = Disposition ? 1 : 0;
	} else if (leadCompleted) {
		await unCompleteLead(ProspectKey);
		defaultCallbackNum = 1;
	}

	await updateLeadFunc(ProspectKey)({
		overrideCallback: lead ? true : false,
		log: { log: `Lead callback manually scheduled at ${scheduledTime.toUTCString()}` },
		response: Disposition
			? { type: 'disposition', responseValue: Disposition, actionType: 'NONE', isCompleted: true }
			: undefined
	});
	await scheduleCallback(ProspectKey, scheduledTime, sms, defaultCallbackNum);

	return {};
};
