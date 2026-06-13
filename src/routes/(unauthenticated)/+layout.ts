import { redirect } from '@sveltejs/kit';
import { browser } from '$app/environment';

export const load = async () => {
	if (browser) {
		const token = localStorage.getItem('authToken');
		if (token) {
			redirect(302, '/dashboard');
		}
	}
};
