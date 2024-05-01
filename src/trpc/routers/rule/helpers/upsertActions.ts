import { prisma } from '../../../../prisma/prisma';
import { keyActionsList } from '$lib/config/actions/actions.config';
import type { Actions } from '$lib/config/actions/actions.schema';
import prismaErrorHandler from '../../../../prisma/prismaErrorHandler';

export const upsertActions = async (actions: Actions) => {
	const { id: actionsId } = await prisma.ldRuleActions
		.upsert({
			where: { id: actions.id },
			create: {},
			update: Object.fromEntries(keyActionsList.map((k) => [k, { deleteMany: {} }])),
			select: { id: true }
		})
		.catch(prismaErrorHandler);
	await prisma.ldRuleActions
		.update({
			where: { id: actionsId },
			data: Object.fromEntries(keyActionsList.map((k) => [k, { create: actions[k] }]))
		})
		.catch(prismaErrorHandler);
	return actionsId;
};

export const createActions = async (actions: Actions) => {
	const { id } = await prisma.ldRuleActions
		.create({
			data: Object.fromEntries(
				keyActionsList.map((k) => [k, { create: actions[k].map(({ id: _, ...values }) => values) }])
			)
		})
		.catch(prismaErrorHandler);
	return id;
};
