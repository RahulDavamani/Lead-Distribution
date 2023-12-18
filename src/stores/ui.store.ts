import { goto } from '$app/navigation';
import { writable } from 'svelte/store';

export interface UI {
	loader?: Loader;
	toast?: Toast;
	toastInterval?: NodeJS.Timeout;
	alertModal?: AlertModal;
}

export interface Loader {
	title?: string;
	overlay?: boolean;
}

export interface Toast {
	title: string;
	class?: string;
}

export interface AlertModal {
	title: string;
	body?: string;
	details?: string;
	actions?: AlertModalAction[];
}

export interface AlertModalAction {
	name: string;
	class?: string;
	onClick?: () => void | Promise<void>;
}

export const ui = (() => {
	const { subscribe, set, update } = writable<UI>({});

	// Methods

	const setLoader = (loader?: Loader) => update((state) => ({ ...state, loader }));
	const setTheme = (theme: string) => document.querySelector('html')?.setAttribute('data-theme', theme);

	const navigate = async (url: string) => {
		ui.setLoader({});
		await goto(url);
		ui.setLoader();
	};

	const showToast = (toast: Toast) => {
		update((state) => {
			clearInterval(state.toastInterval);
			return {
				...state,
				toast,
				toastInterval: setInterval(() => update((state) => ({ ...state, toast: undefined })), 5000)
			};
		});
	};

	const closeToast = () => {
		update((state) => {
			clearTimeout(state.toastInterval);
			return { ...state, toast: undefined };
		});
	};

	return {
		subscribe,
		set,
		update,
		setLoader,
		setTheme,
		navigate,
		showToast,
		closeToast
	};
})();
