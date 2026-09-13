/// <reference types="@sveltejs/kit" />
/// <reference no-default-lib="true"/>
/// <reference lib="esnext" />
/// <reference lib="webworker" />

import { build, files, version } from '$service-worker';

const sw = self as unknown as ServiceWorkerGlobalScope;

// Create a unique cache name for this deployment
const CACHE = `cache-${version}`;

const ASSETS = [
	...build, // the app itself
	...files  // everything in `static`
];

sw.addEventListener('install', (event) => {
	// Create a new cache and add all files to it
	async function addFilesToCache() {
		const cache = await caches.open(CACHE);
		await cache.addAll(ASSETS);
	}

	event.waitUntil(addFilesToCache());
});

sw.addEventListener('activate', (event) => {
	// Remove previous cached data from disk
	async function deleteOldCaches() {
		for (const key of await caches.keys()) {
			if (key !== CACHE) await caches.delete(key);
		}
	}

	event.waitUntil(deleteOldCaches());
});

sw.addEventListener('fetch', (event) => {
	// ignore POST requests etc
	if (event.request.method !== 'GET') return;

	async function respond() {
		const url = new URL(event.request.url);
		const cache = await caches.open(CACHE);

		// `build`/`files` can always be served from the cache
		if (ASSETS.includes(url.pathname)) {
			const cachedResponse = await cache.match(url.pathname);
			if (cachedResponse) {
				return cachedResponse;
			}
		}

		// for everything else, try the network first, but
		// fall back to the cache if we're offline
		try {
			const response = await fetch(event.request);
			
			// if we're offline, fetch can return a value that is not a Response
			// instead of throwing - and we can't pass this non-Response to respondWith
			if (!(response instanceof Response)) {
				throw new Error('invalid response from fetch');
			}

			if (response.status === 200) {
				cache.put(event.request, response.clone());
			}

			return response;
		} catch (err) {
			const cachedResponse = await cache.match(event.request);
			if (cachedResponse) {
				return cachedResponse;
			}
			throw err;
		}
	}

	event.respondWith(respond());
});

// Push notification listener
sw.addEventListener('push', (event) => {
	let data: any = { title: 'Finsight', body: 'New notification!' };
	console.log('Push event received:', event);
	try {
		if (event.data) {
			data = event.data.json();
		}
	} catch (err) {
		console.error('Failed to parse push JSON, falling back to text', err);
		data.body = event.data ? event.data.text() : data.body;
	}
	
	const options: NotificationOptions = {
		body: data.body,
		data: data.url || '/'
	};

	event.waitUntil(
		sw.registration.showNotification(data.title || 'Finsight', options)
			.then(() => console.log('Notification shown successfully!'))
			.catch((err) => console.error('Failed to show notification:', err))
	);
});

// Handle notification click
sw.addEventListener('notificationclick', (event) => {
	event.notification.close();
	
	const urlToOpen = new URL(event.notification.data, sw.location.origin).href;

	event.waitUntil(
		sw.clients.matchAll({
			type: 'window',
			includeUncontrolled: true
		}).then((windowClients) => {
			let matchingClient = null;

			for (let i = 0; i < windowClients.length; i++) {
				const windowClient = windowClients[i];
				if (windowClient.url === urlToOpen) {
					matchingClient = windowClient;
					break;
				}
			}

			if (matchingClient) {
				return matchingClient.focus();
			} else {
				return sw.clients.openWindow(urlToOpen);
			}
		})
	);
});
