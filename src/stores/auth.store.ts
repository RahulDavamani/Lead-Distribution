import { page } from '$app/stores';
import { get, writable } from 'svelte/store';
import { ui } from './ui.store';
import { z } from 'zod';

export interface Auth {
	token: string;
	roleType: RoleType;
	user: {
		Message: string;
		UserKey: string;
		CompanyKey: string;
		userRole: { ID: number; Role: string }[];
	};
}
export const roleTypeSchema = z.enum(['ADMIN', 'SUPERVISOR', 'AGENT']);
export type RoleType = z.infer<typeof roleTypeSchema>;

export const auth = (() => {
	const { subscribe, set, update } = writable<Auth>();

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

				const roleType = user?.userRole.find(({ ID }) => [5, 9].includes(ID))
					? 'ADMIN'
					: user?.userRole.find(({ ID }) => [41, 43, 44].includes(ID))
						? 'SUPERVISOR'
						: 'AGENT';
				set({ token, user, roleType });
			}
		}

		// hemanth@xyzies.coma
		// set({
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
		// 	},
		// 	roleType: 'ADMIN'
		// });

		// Davamani@yopmail.com
		// set({
		// 	token: 'abc',
		// 	user: {
		// 		Message: 'Success',
		// 		UserKey: '74bedd5f-c117-474c-90d5-5a13eedd068f',
		// 		CompanyKey: '4f82d8a1-3933-4a02-8c6a-ebfaa2763a6b',
		// 		userRole: [
		// 			{
		// 				ID: 9,
		// 				Role: 'Agent'
		// 			}
		// 		]
		// 	},
		// 	roleType: 'ADMIN'
		// });
		ui.setLoader();
	};

	return {
		subscribe,
		set,
		update,
		authenticate
	};
})();
