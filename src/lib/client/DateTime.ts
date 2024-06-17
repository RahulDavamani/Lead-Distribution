import moment from 'moment-timezone';
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

export const calculateLeadDuration = (startDate: Date, endDate: Date, company: NonNullable<QueuedLead['company']>) => {
	const { timezone, workingHours } = company;

	const startMoment = moment.tz(startDate, timezone);
	const endMoment = moment.tz(endDate, timezone);

	const currentMoment = startMoment.clone().startOf('day');
	let leadDuration = 0;
	while (currentMoment.isBefore(endMoment) || currentMoment.isSame(endMoment)) {
		const day = currentMoment.format('ddd').toLowerCase();
		const previousDay = currentMoment.clone().subtract(1, 'day').format('ddd').toLowerCase();

		const workingHour = workingHours.find(({ days }) => days.split(',').includes(day));
		const previousWorkingHour = workingHours.find(({ days }) => days.split(',').includes(previousDay));

		const start = currentMoment.isSame(startMoment, 'date') ? startMoment : currentMoment;
		const end = currentMoment.isSame(endMoment, 'date') ? endMoment : currentMoment.clone().endOf('day');

		if (previousWorkingHour) {
			const previousWorkingStart = moment
				.tz(previousWorkingHour.start, timezone)
				.clone()
				.set({ year: currentMoment.year(), month: currentMoment.month(), date: currentMoment.date() });
			const previousWorkingEnd = moment
				.tz(previousWorkingHour.end, timezone)
				.clone()
				.set({ year: currentMoment.year(), month: currentMoment.month(), date: currentMoment.date() });

			if (previousWorkingEnd.isBefore(previousWorkingStart)) {
				let diff = 0;
				if (start.isBefore(previousWorkingEnd) && end.isBefore(previousWorkingEnd)) diff = end.diff(start, 'seconds');
				else if (start.isBefore(previousWorkingEnd)) diff = previousWorkingEnd.diff(start, 'seconds');
				if (diff > 0) leadDuration += diff;
			}
		}

		if (workingHour) {
			const workingStart = moment
				.tz(workingHour.start, timezone)
				.clone()
				.set({ year: currentMoment.year(), month: currentMoment.month(), date: currentMoment.date() });
			const workingEnd = moment
				.tz(workingHour.end, timezone)
				.clone()
				.set({ year: currentMoment.year(), month: currentMoment.month(), date: currentMoment.date() });

			let diff = 0;
			if (workingEnd.isBefore(workingStart)) {
				if (start.isAfter(workingStart) && end.isAfter(workingStart)) diff = end.diff(start, 'seconds');
				else if (end.isAfter(workingStart)) diff = end.diff(workingStart, 'seconds');
			} else {
				const start =
					currentMoment.isSame(startMoment, 'date') && startMoment.isAfter(workingStart) ? startMoment : workingStart;
				const end = currentMoment.isSame(endMoment, 'date') && endMoment.isBefore(workingEnd) ? endMoment : workingEnd;
				diff = end.diff(start, 'seconds');
			}
			if (diff > 0) leadDuration += diff;
		}
		currentMoment.add(1, 'day');
	}

	return leadDuration;
};
