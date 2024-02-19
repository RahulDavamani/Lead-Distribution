import { getAffiliatesAccessKey } from '../../../trpc/routers/rule/helpers/getAffiliates';

export const load = async () => {
	const affiliates = await getAffiliatesAccessKey();
	return { affiliates };
};
