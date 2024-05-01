import { getAll } from './procedures/getAll.procedure';
import { getById } from './procedures/getById.procedure';
import { getForSettings } from './procedures/getForSettings.procedure';
import { getMasterData } from './procedures/getMasterData.procedure';
import { create } from './procedures/create.procedure';
import { update } from './procedures/update.procedure';
import { remove } from './procedures/remove.procedure';
import { updateOperators } from './procedures/updateOperators';
import { router } from '../../server';
import { duplicate } from './procedures/duplicate.procedure';

export const ruleRouter = router({
	getAll: getAll.procedure,
	getById: getById.procedure,
	getMasterData: getMasterData.procedure,

	getForSettings: getForSettings.procedure,
	updateOperators: updateOperators.procedure,

	create: create.procedure,
	update: update.procedure,
	duplicate: duplicate.procedure,
	remove: remove.procedure
});
