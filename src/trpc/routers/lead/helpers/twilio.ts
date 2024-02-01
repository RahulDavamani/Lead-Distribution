import twilio from 'twilio';
import { env } from '$env/dynamic/private';

export const sendSMS = async (to: string, body: string) => {
	const twilioClient = twilio(env.TWILIO_ACCOUNT_SID, env.TWILIO_AUTH_TOKEN);
	await twilioClient.messages.create({ from: env.TWILIO_PHONE_NUMBER, to, body });
};
