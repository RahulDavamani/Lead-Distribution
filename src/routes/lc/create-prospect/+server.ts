import { error, json, type RequestHandler } from '@sveltejs/kit';
import type { ProspectInput } from '../../../zod/prospectInput.schema';

export interface LCBody {
	chatId: string | null;
	messageId: string | null;
	userId: string | null;
	externalId: string | null;
	message: string | null;
	node: {
		id: string | null;
		type: string | null;
		name: string | null;
		webhookId: string | null;
		webhookName: string | null;
	} | null;
	userAttributes: {
		default_name: string | null;
		default_email: string | null;
		default_source: string | null;
		default_url: string | null;
		default_avatar: string | null;
		default_language: string | null;
		default_timezone: string | null;
		default_gender: string | null;
		default_ip: string | null;
		default_city: string | null;
		default_region: string | null;
		default_country: string | null;
		default_referrer: string | null;
		default_username: string | null;
	} | null;
	attributes: {
		CustomerType: string | null;
		default_name: string | null;
		PhoneNumber: string | null;
		CallbackTime: string | null;
		default_email: string | null;
		default_url: string | null;
		default_source: string | null;
		default_avatar: string | null;
		default_language: string | null;
		default_timezone: string | null;
		default_gender: string | null;
		default_ip: string | null;
		default_city: string | null;
		default_region: string | null;
		default_country: string | null;
		default_referrer: string | null;
		default_username: string | null;
	} | null;
}

export const GET: RequestHandler = async ({ url }) => {
	const token = url.searchParams.get('token');
	if (token !== '1827172c-c069-47ba-8f03-a1319d2120a2') return error(401, 'Unauthorized');
	const challenge = url.searchParams.get('challenge');
	if (!challenge) return error(404, 'Missing challenge');
	return new Response(challenge);
};

export const POST: RequestHandler = async ({ url, request }) => {
	const accesskey = url.searchParams.get('accesskey');
	if (!accesskey) return error(404, 'Missing accesskey');

	const body = (await request.json()) as LCBody;

	const prospect: ProspectInput = {
		LeadID: body.chatId ?? '',
		CustomerInfo: {
			FirstName: body.attributes?.default_name ?? '',
			LastName: '',
			Email: body.attributes?.default_email ?? '',
			Phone: body.attributes?.PhoneNumber ?? '',
			Address: '',
			ZipCode: ''
		},
		TrustedFormCertUrl: 'TrustedFormCertUrl.com',
		ConsentToContact: 'true',
		AcceptedTerms: 'true'
	};

	const res = await fetch('https://openapi.xyzies.com/LeadProspect/PostLead', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json', AccessKey: accesskey },
		body: JSON.stringify(prospect)
	});
	if (res.status !== 200) return error(400, 'Failed to create prospect');

	return json({
		attributes: {
			LeadId: body.chatId
		}
	});
};
