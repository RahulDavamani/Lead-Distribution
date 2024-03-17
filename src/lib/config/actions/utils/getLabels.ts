import type { ActionKey, ActionLabels } from '../actions.config';

export const getLabels = <K extends ActionKey>(key: K, name: string): ActionLabels<K> => {
	const Key = `${key[0].toUpperCase() + key.slice(1)}` as Capitalize<K>;

	return {
		key,
		Key,
		name,
		keyActions: `${key}Actions`
	};
};
