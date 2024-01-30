import { nanoid } from 'nanoid';
import type { ActionConfig, ActionKey } from '../actions.config';
import { getLabels } from '../utils/getLabels';

const key: ActionKey = 'closeLead';
const name = 'Close Lead';
const actionConfig: ActionConfig<typeof key> = {
	labels: getLabels(key, name),
	client: {
		getNewAction: (num) => ({
			id: nanoid(),
			num
		})
	}
};

export default { [key]: actionConfig };
