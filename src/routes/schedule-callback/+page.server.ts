import { error } from '@sveltejs/kit';
import { scheduleCallback } from '../../trpc/routers/lead/helpers/scheduleCallback.js';

export const load = async (event) => {
	const ProspectKey = event.url.searchParams.get('ProspectKey');
	if (!ProspectKey) throw error(400, 'Bad Request: Missing params "ProspectKey"');
	const ScheduledTime = event.url.searchParams.get('ScheduledTime');
	if (!ScheduledTime) throw error(400, 'Bad Request: Missing params "ScheduledTime"');
	const scheduledTime = new Date(ScheduledTime);

	await prisma.ldLead.update({
		where: { ProspectKey },
		data: { overrideCallback: true }
	});
	await scheduleCallback(ProspectKey, scheduledTime, undefined);

	return {};
};
