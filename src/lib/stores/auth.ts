import { writable } from 'svelte/store';

const initialAuth = typeof window !== 'undefined' ? !!localStorage.getItem('authToken') : false;
export const isAuthenticated = writable(initialAuth);

let initialUser = null;
if (typeof window !== 'undefined') {
    const userJson = localStorage.getItem('user');
    if (userJson) {
        try {
            initialUser = JSON.parse(userJson);
        } catch (e) {}
    }
}
export const userStore = writable<any>(initialUser);
