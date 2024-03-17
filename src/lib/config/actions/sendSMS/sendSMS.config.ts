import { nanoid } from 'nanoid';
import type { ActionConfig, ActionKey } from '../actions.config';
import { getLabels } from '../utils/getLabels';

const key: ActionKey = 'sendSMS';
const name = 'Send SMS';
const actionConfig: ActionConfig<typeof key> = {
	labels: getLabels(key, name),
	client: {
		getNewAction: (num) => ({
			id: nanoid(),
			num,
			scheduleTimes: '0',
			smsTemplate: ''
		})
	}
};

export default { [key]: actionConfig };
