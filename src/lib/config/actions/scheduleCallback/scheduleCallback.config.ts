import { nanoid } from 'nanoid';
import type { ActionConfig, ActionKey } from '../actions.config';
import { getLabels } from '../utils/getLabels';

const key: ActionKey = 'scheduleCallback';
const name = 'Schedule Callback';
const actionConfig: ActionConfig<typeof key> = {
	labels: getLabels(key, name),
	client: {
		getNewAction: (num) => ({
			id: nanoid(),
			num,
			scheduleTimes: '0',
			sendSMS: false,
			smsTemplate: '',
			smsWaitTime: 0
		})
	}
};

export default { [key]: actionConfig };
