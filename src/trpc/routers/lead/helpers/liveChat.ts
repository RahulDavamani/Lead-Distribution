const AccessKey = '60BCD8BD-19B5-425D-A3C2-1CAF53BB0ACF';
const from = '18554818474';

export const lcSendSMS = async (to: string, body: string) => {
	const url = 'http://dev-xyzservice.azurewebsites.net/api/2way/sendmessage';
	const res = await fetch(url, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json', AccessKey },
		body: JSON.stringify({ from, to, body, channel: 'sms' })
	});
	const { ConversationId, MessageId, Status } = (await res.json()) as {
		ConversationId: string;
		MessageId: string;
		Status: string;
	};
	return {
		conversationId: ConversationId,
		messageId: MessageId,
		status: Status
	};
};
