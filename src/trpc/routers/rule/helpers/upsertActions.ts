import { keyActionsList } from '$lib/config/actions.config';
import type { Actions } from '$lib/config/actions.schema';

export const upsertActions = async (actions: Actions) => {
	const { id: actionsId } = await prisma.ldRuleActions.upsert({
		where: { id: actions.id },
		create: {},
		update: Object.fromEntries(keyActionsList.map((k) => [k, { deleteMany: {} }])),
		select: { id: true }
	});
	await prisma.ldRuleActions.update({
		where: { id: actionsId },
		data: Object.fromEntries(keyActionsList.map((k) => [k, { create: actions[k] }]))
	});
	return actionsId;
};
