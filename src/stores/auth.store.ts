import { page } from '$app/stores';
import { get, writable } from 'svelte/store';
import { ui } from './ui.store';

export interface Auth {
	isAuth: boolean;
	token?: string;
	user?: {
		Message: string;
		UserKey: string;
		CompanyKey: string;
		userRole: { ID: number; Role: string }[];
	};
}

export const auth = (() => {
	const { subscribe, set, update } = writable<Auth>({
		isAuth: false
	});

	// Methods
	const authenticate = async () => {
		ui.setLoader({ title: 'Authenticating...' });

		const $page = get(page);
		const token = $page.url.searchParams.get('BPT');
		if (token) {
			const validateTokenUrl = 'https://bundleapi.xyzies.com/Account/ValidateReportToken';
			const res = await fetch(validateTokenUrl, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					AccessKey: 'FEEBD9BB-8A80-4AB5-938E-DD700468E06A',
					Token: token
				})
			});

			if (res.status === 200) {
				const user = (await res.json()) as Auth['user'];
				set({ isAuth: true, token, user });
			}
		}
		// set({
		// 	isAuth: true,
		// 	token: 'abc',
		// 	user: {
		// 		Message: 'Success',
		// 		UserKey: '5a36aa41-73e1-44f7-b71b-f5bceeaff626',
		// 		CompanyKey: '4f82d8a1-3933-4a02-8c6a-ebfaa2763a6b',
		// 		userRole: [
		// 			{
		// 				ID: 5,
		// 				Role: 'Agent'
		// 			}
		// 		]
		// 	}
		// });
		ui.setLoader();
	};

	const isAdmin = () => {
		const { user } = get(auth);
		if (!user) return false;
		return user.userRole.find(({ ID }) => [5, 9].includes(ID)) !== undefined;
	};

	const isSupervisor = () => {
		const { user } = get(auth);
		if (!user) return false;
		return user.userRole.find(({ ID }) => [5, 9, 41, 42, 43, 44].includes(ID)) !== undefined;
	};

	return {
		subscribe,
		set,
		update,
		authenticate,
		isAdmin,
		isSupervisor
	};
})();
