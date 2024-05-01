import { error } from '@sveltejs/kit';
import { updateGHLTemplates } from '../../trpc/routers/lead/helpers/ghl.js';
import prismaErrorHandler from '../../prisma/prismaErrorHandler.js';
import { generateMessage } from '../../trpc/routers/lead/helpers/generateMessage.js';
import { updateLeadFunc } from '../../trpc/routers/lead/helpers/updateLead.js';

export const load = async (event) => {
	const SendSMSTemplate = event.url.searchParams.get('SendSMSTemplate');
	const ProspectKey = event.url.searchParams.get('ProspectKey');
	if (!ProspectKey) throw error(400, 'Bad Request: Missing params "ProspectKey"');
	const updateLead = updateLeadFunc(ProspectKey);

	const { RefId, CompanyKey, OutBoundNumber } = await prisma.leadProspect
		.findFirstOrThrow({
			where: { ProspectKey },
			select: { RefId: true, CompanyKey: true, OutBoundNumber: true }
		})
		.catch(prismaErrorHandler);
	if (!RefId) throw error(404, 'RefId not found');
	if (!CompanyKey) throw error(404, 'Affiliate not found');

	const rule = await prisma.ldRule
		.findFirst({
			where: { affiliates: { some: { CompanyKey } } },
			select: {
				outboundCallNumber: true,
				overrideOutboundNumber: true,
				smsTemplate: true
			},
			orderBy: { createdAt: 'desc' }
		})
		.catch(prismaErrorHandler);
	if (!rule) throw error(404, 'Rule not found');
	const { outboundCallNumber, overrideOutboundNumber, smsTemplate } = rule;
	const outboundNumber = overrideOutboundNumber ? OutBoundNumber ?? outboundCallNumber : outboundCallNumber;

	const ghlTemplate: { [k: string]: string } =
		SendSMSTemplate === 'true'
			? {
					orderid: RefId,
					outboundcallnumber: outboundNumber,
					bundlesmstemplate: await generateMessage(ProspectKey, smsTemplate)
				}
			: {
					orderid: RefId,
					outboundcallnumber: outboundNumber
				};

	if (SendSMSTemplate) {
		const messages = await prisma.ldLeadMessage.count({ where: { lead: { ProspectKey } } }).catch(prismaErrorHandler);
		await updateLead({
			log: { log: `SMS #${messages + 1}: Text message sent to customer` },
			message: { message: ghlTemplate['bundlesmstemplate'] }
		});
	}

	await updateGHLTemplates(ProspectKey, ghlTemplate);
	return {};
};
