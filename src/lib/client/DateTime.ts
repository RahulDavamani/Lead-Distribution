import { allDays } from '$lib/data/allDays';
import type { QueuedLead } from '../../types/QueuedLead.type';

export type Time = { days: number; hours: number; minutes: number; seconds: number };

export const timeToText = (totalSeconds: number): string => {
	if (totalSeconds === 0) return '0 secs';
	const { days, hours, minutes, seconds } = secondsToTime(totalSeconds);
	const formattedTime: string[] = [];
	if (days > 0) formattedTime.push(`${days} days`);
	if (hours > 0) formattedTime.push(`${hours} hrs`);
	if (minutes > 0) formattedTime.push(`${minutes} mins`);
	if (seconds > 0) formattedTime.push(`${seconds} secs`);
	return formattedTime.join(', ');
};

export const getTimeElapsed = (startDate: Date, endDate: Date) =>
	Math.floor((endDate.getTime() - startDate.getTime()) / 1000);

export const getTimeElapsedText = (startDate: Date, endDate: Date) => timeToText(getTimeElapsed(startDate, endDate));

export const timeToSeconds = ({ days, hours, minutes, seconds }: Time) =>
	days * 86400 + hours * 3600 + minutes * 60 + seconds;

export const secondsToTime = (seconds: number) => {
	const days = Math.floor(seconds / (24 * 3600));
	seconds %= 24 * 3600;
	const hours = Math.floor(seconds / 3600);
	seconds %= 3600;
	const minutes = Math.floor(seconds / 60);
	seconds %= 60;

	return { days, hours, minutes, seconds };
};

export const formatTime = (inputTime: Time) => secondsToTime(timeToSeconds(inputTime));

export const calculateLeadDuration = (startDate: Date, endDate: Date, workingHours: QueuedLead['workingHours']) => {
	if (!workingHours?.length) return getTimeElapsed(startDate, endDate);
	else {
		const date = new Date(startDate.toDateString());
		const startTime = startDate.getTime() - new Date(startDate.toDateString()).getTime();
		const endTime = endDate.getTime() - new Date(endDate.toDateString()).getTime();

		let leadDuration = 0;
		while (date <= endDate) {
			const day = allDays[date.getDay()];
			const workingHour = workingHours.find(({ days }) => days.split(',').includes(day));
			const workingHourStartTime = workingHour
				? workingHour.start.getTime() - new Date(workingHour.start.toDateString()).getTime()
				: 0;
			const workingHourEndTime = workingHour
				? workingHour.end.getTime() - new Date(workingHour.end.toDateString()).getTime()
				: 0;

			const leadStartTime =
				date.toDateString() === startDate.toDateString()
					? startTime < workingHourStartTime
						? workingHourStartTime
						: startTime
					: workingHourStartTime;

			const leadEndTime =
				date.toDateString() === endDate.toDateString()
					? endTime > workingHourEndTime
						? workingHourEndTime
						: endTime
					: workingHourEndTime;

			leadDuration += (leadEndTime - leadStartTime) / 1000;
			date.setDate(date.getDate() + 1);
		}
		return Math.floor(leadDuration);
	}
};
