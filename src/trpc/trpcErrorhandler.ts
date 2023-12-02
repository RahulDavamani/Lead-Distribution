import { TRPCClientError } from '@trpc/client';
import { TRPCError } from '@trpc/server';
import { getErrorCode } from '../lib/data/errorCodes';
import { error } from '@sveltejs/kit';
import { ui } from '../stores/ui.store';

export interface TRPCZodError {
	code: string;
	minimum: number;
	type: string;
	inclusive: boolean;
	exact: boolean;
	message: string;
	path: string[];
}

export type TRPCZodErrors<T> = {
	[K in keyof T]: T[K] extends object | undefined ? TRPCZodErrors<T[K]> : TRPCZodError;
};

export interface TRPCHandlerError<T> {
	code: number;
	message: string;
	zodErrors?: TRPCZodErrors<T>;
}

export interface TRPCClientErrorHandlerOptions {
	throwError?: boolean;
	stopLoading?: boolean;
	showToast?: boolean;
}

export const trpcClientErrorHandler = <T>(
	e: unknown,
	callback?: (e: TRPCHandlerError<T>) => void,
	{ stopLoading = true, showToast = true }: TRPCClientErrorHandlerOptions = {}
) => {
	const { code, message, zodErrors } = trpcErrorhandler<T>(e);

	if (callback) callback({ code, message, zodErrors });

	if (stopLoading) ui.update((state) => ({ ...state, loader: undefined }));
	if (showToast) ui.showToast({ class: 'alert-error', title: `${code}: ${message}` });

	throw `${code}: ${message}`;
};

export const trpcServerErrorHandler = (e: unknown) => {
	const { code, message } = trpcErrorhandler(e);
	throw error(code, { message: message });
};

export const trpcErrorhandler = <T>(e: unknown): TRPCHandlerError<T> => {
	console.log(e);
	if (e instanceof TRPCClientError) {
		try {
			const errors = JSON.parse(e.message);
			if (typeof errors === 'object' && 'path' in errors[0])
				return {
					code: e.data.httpStatus,
					message: 'Input Validation Error',
					zodErrors: formatZodErrors<T>(errors)
				};
		} catch (_) {
			return {
				code: e.data.httpStatus,
				message: e.message
			};
		}
	}
	if (e instanceof TRPCError)
		return {
			code: getErrorCode({ trpc: e.code })?.http ?? 500,
			message: e.message
		};

	return {
		code: 500,
		message: 'Internal Server Error'
	};
};

export const formatZodErrors = <T>(errors: TRPCZodError[]): TRPCZodErrors<T> => {
	const formattedErrors: TRPCZodErrors<T> = {} as TRPCZodErrors<T>;

	errors.forEach((error) => {
		const path = error.path;
		let currentObj: TRPCZodErrors<T> = formattedErrors;

		for (let i = 0; i < path.length; i++) {
			const key = path[i];

			if (i === path.length - 1) {
				currentObj[key as keyof T] = error as T[keyof T] extends object | undefined
					? TRPCZodErrors<T[keyof T]>
					: TRPCZodError;
			} else {
				currentObj[key as keyof T] = currentObj[key as keyof T] || ({} as TRPCZodErrors<T>);
				currentObj = currentObj[key as keyof T] as TRPCZodErrors<T>;
			}
		}
	});

	return formattedErrors;
};
