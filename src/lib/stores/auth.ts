import { writable } from 'svelte/store';

const initialAuth = typeof window !== 'undefined' ? !!localStorage.getItem('authToken') : false;
export const isAuthenticated = writable(initialAuth);
