import { nanoid } from 'nanoid';
import type { ActionConfig, ActionKey } from '../actions.config';
import { getLabels } from '../utils/getLabels';

const key: ActionKey = 'requeueLead';
const name = 'Requeue Lead';
const actionConfig: ActionConfig<typeof key> = {
	labels: getLabels(key, name),
	client: {
		getNewAction: (num) => ({
			id: nanoid(),
			num,
			scheduleTimes: '0'
		})
	}
};

export default { [key]: actionConfig };
