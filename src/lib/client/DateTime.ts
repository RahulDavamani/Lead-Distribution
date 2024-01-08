export const timeToText = (seconds: number): string => {
	const hours = Math.floor(seconds / 3600);
	const minutes = Math.floor((seconds % 3600) / 60);
	const remainingSeconds = seconds % 60;

	let formattedTime = '';
	if (hours > 0) formattedTime += `${hours} hrs`;
	if (minutes > 0) formattedTime += `${formattedTime.length > 0 ? ', ' : ''}${minutes} mins`;
	if (remainingSeconds > 0 || formattedTime === '')
		formattedTime += `${formattedTime.length > 0 ? ', ' : ''}${remainingSeconds} secs`;

	return formattedTime;
};

export const getTimeElapsedText = (startDate: Date, endDate: Date) =>
	timeToText(Math.floor((endDate.getTime() - startDate.getTime()) / 1000));
