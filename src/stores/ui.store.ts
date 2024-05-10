import { writable } from 'svelte/store';
import type { Modals } from '../types/Modals.type';

export interface UI {
	loader?: Loader;
	toast?: Toast;
	alertModal?: AlertModal;
	modals: Modals;
}

export interface Loader {
	title?: string;
	percent?: string;
	size?: number;
	overlay?: boolean;
	fixed?: boolean;

	classes?: string;
	titleClass?: string;
}

export interface Toast {
	title: string;
	toastClasses?: string;
	alertClasses?: string;
	toastDuration?: number;
}

export interface AlertModal {
	title: string;
	body?: string;
	details?: string;
	actions?: AlertModalAction[];
}

export interface AlertModalAction {
	name?: string;
	classes?: string;
	onClick?: () => void | Promise<void>;
}

export const ui = (() => {
	const { subscribe, set, update } = writable<UI>({ modals: {} });

	// Methods

	const setLoader = (loader?: Loader) => update((state) => ({ ...state, loader }));
	const setToast = (toast?: Toast) => update((state) => ({ ...state, toast }));
	const setAlertModal = (alertModal?: AlertModal) => update((state) => ({ ...state, alertModal }));
	const setModals = (modals?: Modals) => update((state) => ({ ...state, modals: modals ?? {} }));

	const loaderWrapper = <T>(loader: Loader, fn: () => Promise<T>, start = true, end = true) => {
		return async () => {
			if (start) ui.setLoader(loader);
			const result = await fn();
			if (end) ui.setLoader();
			return result;
		};
	};

	return { subscribe, set, update, setLoader, setToast, setAlertModal, setModals, loaderWrapper };
})();
