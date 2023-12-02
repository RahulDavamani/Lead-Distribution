type TRPCErrorCode =
	| 'BAD_REQUEST'
	| 'UNAUTHORIZED'
	| 'FORBIDDEN'
	| 'NOT_FOUND'
	| 'TIMEOUT'
	| 'CONFLICT'
	| 'PRECONDITION_FAILED'
	| 'PAYLOAD_TOO_LARGE'
	| 'METHOD_NOT_SUPPORTED'
	| 'UNPROCESSABLE_CONTENT'
	| 'TOO_MANY_REQUESTS'
	| 'CLIENT_CLOSED_REQUEST'
	| 'INTERNAL_SERVER_ERROR';

export interface ErrorCode {
	http: number;
	trpc: TRPCErrorCode;
	prisma: string[];
}

const internalErrorCode: ErrorCode = {
	http: 500,
	trpc: 'INTERNAL_SERVER_ERROR',
	prisma: []
};

export const getErrorCode = ({ http, trpc, prisma }: { http?: number; trpc?: string; prisma?: string }): ErrorCode => {
	if (http) return errorCodes.find((ec) => ec.http == http) ?? internalErrorCode;
	if (trpc) return errorCodes.find((ec) => ec.trpc == trpc) ?? internalErrorCode;
	if (prisma) return errorCodes.find((ec) => ec.prisma.includes(prisma)) ?? internalErrorCode;
	return internalErrorCode;
};

export const errorCodes: ErrorCode[] = [
	{
		http: 400,
		trpc: 'BAD_REQUEST',
		prisma: ['P2003']
	},
	{
		http: 401,
		trpc: 'UNAUTHORIZED',
		prisma: []
	},
	{
		http: 403,
		trpc: 'FORBIDDEN',
		prisma: []
	},
	{
		http: 404,
		trpc: 'NOT_FOUND',
		prisma: ['P2025']
	},
	{
		http: 404,
		trpc: 'METHOD_NOT_SUPPORTED',
		prisma: []
	},
	{
		http: 408,
		trpc: 'TIMEOUT',
		prisma: []
	},
	{
		http: 409,
		trpc: 'CONFLICT',
		prisma: ['P2002']
	},
	{
		http: 412,
		trpc: 'PRECONDITION_FAILED',
		prisma: []
	},
	{
		http: 413,
		trpc: 'PAYLOAD_TOO_LARGE',
		prisma: []
	},
	{
		http: 422,
		trpc: 'UNPROCESSABLE_CONTENT',
		prisma: []
	},
	{
		http: 429,
		trpc: 'TOO_MANY_REQUESTS',
		prisma: []
	},
	{
		http: 499,
		trpc: 'CLIENT_CLOSED_REQUEST',
		prisma: []
	},
	{
		http: 500,
		trpc: 'INTERNAL_SERVER_ERROR',
		prisma: []
	}
];
