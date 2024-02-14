import { nanoid } from 'nanoid';
import type { ActionConfig, ActionKey } from '../actions.config';
import { getLabels } from '../utils/getLabels';

const key: ActionKey = 'completeLead';
const name = 'Complete Lead';
const actionConfig: ActionConfig<typeof key> = {
	labels: getLabels(key, name),
	client: {
		getNewAction: (num) => ({
			id: nanoid(),
			num,
			success: true,
			completeStatus: 'Sale Made'
		})
	}
};

export default { [key]: actionConfig };
