import prismaErrorHandler from '../../../../prisma/prismaErrorHandler';
import { generateNotificationMessage } from './generateNotificationMessage';

export const updateGHLSmsTemplate = async (ProspectKey: string, smsTemplate: string) => {
	const message = await generateNotificationMessage(ProspectKey, smsTemplate);
	const ghlTemplate = {
		customFields: [
			{
				id: 'bundlesmstemplate',
				key: 'bundlesmstemplate',
				field_value: message
			}
		]
	};
	await prisma.$queryRaw`exec [p_GHL_PUTContactUpdate] ${ProspectKey},${ghlTemplate}`.catch(prismaErrorHandler);
};

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
