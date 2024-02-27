import { error } from '@sveltejs/kit';
import { updateGHLTemplates } from '../../trpc/routers/lead/helpers/ghl.js';
import prismaErrorHandler from '../../prisma/prismaErrorHandler.js';
import { generateMessage } from '../../trpc/routers/lead/helpers/generateMessage.js';

export const load = async (event) => {
	const SendSMSTemplate = event.url.searchParams.get('SendSMSTemplate');
	const ProspectKey = event.url.searchParams.get('ProspectKey');
	if (!ProspectKey) throw error(400, 'Bad Request: Missing params "ProspectKey"');

	const { RefId, CompanyKey } = await prisma.leadProspect
		.findFirstOrThrow({
			where: { ProspectKey },
			select: { RefId: true, CompanyKey: true }
		})
		.catch(prismaErrorHandler);
	if (!RefId) throw error(404, 'RefId not found');
	if (!CompanyKey) throw error(404, 'Affiliate not found');

	const rule = await prisma.ldRule
		.findFirst({
			where: { affiliates: { some: { CompanyKey } } },
			select: {
				outboundCallNumber: true,
				smsTemplate: true
			},
			orderBy: { createdAt: 'desc' }
		})
		.catch(prismaErrorHandler);
	if (!rule) throw error(404, 'Rule not found');
	const { outboundCallNumber, smsTemplate } = rule;

	const ghlTemplate: { [k: string]: string } =
		SendSMSTemplate === 'true'
			? {
					orderid: RefId,
					outboundcallnumber: outboundCallNumber,
					bundlesmstemplate: await generateMessage(ProspectKey, smsTemplate)
				}
			: {
					orderid: RefId,
					outboundcallnumber: outboundCallNumber
				};

	await updateGHLTemplates(ProspectKey, ghlTemplate);
	return {};
};
