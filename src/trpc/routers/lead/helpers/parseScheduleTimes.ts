import { timeToText } from '$lib/client/DateTime';

export const parseScheduleTimes = (times: string, count: number) => {
	const scheduleTimes = times.split('|');
	const scheduleTime = Number(
		count <= scheduleTimes.length ? scheduleTimes[count - 1] : scheduleTimes[scheduleTimes.length - 1]
	);
	const scheduleTimeText = timeToText(scheduleTime);
	const scheduledTime = new Date(Date.now() + scheduleTime * 1000);

	return { scheduleTime, scheduleTimeText, scheduledTime };
};
