import { prisma } from '../../../../prisma/prisma';
import prismaErrorHandler from '../../../../prisma/prismaErrorHandler';
import { generateMessage } from './generateMessage';

export const getGHLStatus = async (ProspectKey: string) => {
	try {
		const ghlResponse = (await prisma.$queryRaw`Exec [p_GHL_GetProspect] ${ProspectKey}`.catch(prismaErrorHandler)) as {
			Response?: string;
		}[];
		const ghlData = JSON.parse(ghlResponse?.[0]?.Response ?? 'undefined') as {
			contact?: { customFields?: { id: string; value: string }[] };
		};
		const ghlStatus = ghlData?.contact?.customFields?.find((cf) => cf.id === '5DyNSCM7X3blCAWJSteM')?.value;
		return ghlStatus ?? 'Not Found';
	} catch (error) {
		return 'Not Found';
	}
};

export const updateGHLTemplates = async (ProspectKey: string, templates: { [k: string]: string }) => {
	const ghlTemplate = {
		customFields: Object.entries(templates).map(([key, value]) => ({
			id: key,
			key,
			field_value: value
		}))
	};
	await prisma.$queryRaw`exec [p_GHL_PUTContactUpdate] ${ProspectKey},${ghlTemplate}`.catch(prismaErrorHandler);
};

export const postGHLData = async (ProspectKey: string, data: string) => {
	const message = await generateMessage(ProspectKey, data);
	const json = JSON.parse(message);
	if (Object.keys(json).length === 0) return;
	json['locationId'] = '%%locationId%%';
	await prisma.$queryRaw`exec [p_GHL_PostProspect] ${ProspectKey},${json}`.catch(prismaErrorHandler);
};
