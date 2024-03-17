import { actionsConfigList, type ActionKey, type Action } from '../actions.config';
import type { Actions } from '../actions.schema';

export const getActionsList = (actions: Actions) => {
	const actionsCount = actionsConfigList.reduce((acc, cur) => acc + actions[cur.labels.keyActions].length, 0);
	const actionsList = Array.from({ length: actionsCount }, (_, i) => {
		let action: { [K in ActionKey]?: Action<K> } = {};
		for (const {
			labels: { key, keyActions }
		} of actionsConfigList)
			for (const a of actions[keyActions]) if (a.num === i + 1) action = { [key]: a };
		return action;
	});
	return { actionsCount, actionsList };
};
