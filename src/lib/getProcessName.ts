export const getProcessName = (callbackNum: number, requeueNum: number) => {
	let name = callbackNum === 0 ? `NEW LEAD` : `CALLBACK #${callbackNum}`;
	if (requeueNum > 0) name += ` REQUEUE #${requeueNum}`;
	return name;
};

export const getProcessNameSplit = (callbackNum: number, requeueNum: number) => {
	const processName = callbackNum === 0 ? `New Lead` : `Callback #${callbackNum}`;
	const requeueName = requeueNum > 0 ? `Requeue #${requeueNum}` : '';
	return [processName, requeueName];
};
