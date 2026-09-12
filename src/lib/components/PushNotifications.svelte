<script lang="ts">
	import { onMount } from 'svelte';
	import { apiFetch } from '$lib/api';

	// The VAPID public key provided by the user
	const VAPID_PUBLIC_KEY = 'BNcga3MpbMQqV6WHPH54Up6_DLwuNbHRmmJc2bjjp36xHRTVSKRS4Xb24-grVZOJBzSjq9ZcCtlrY6rZxXw-4wU';

	let permissionState: NotificationPermission = $state('default');
	let isSupported = $state(false);
	let subscription: PushSubscription | null = $state(null);
	let loading = $state(false);
	let message = $state('');

	onMount(async () => {
		if ('serviceWorker' in navigator && 'PushManager' in window) {
			isSupported = true;
			permissionState = Notification.permission;
			
			// Check if already subscribed
			const registration = await navigator.serviceWorker.ready;
			subscription = await registration.pushManager.getSubscription();
		}
	});

	// Utility to convert Base64-URL to Uint8Array required by PushManager
	function urlBase64ToUint8Array(base64String: string) {
		const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
		const base64 = (base64String + padding)
			.replace(/\-/g, '+')
			.replace(/_/g, '/');

		const rawData = window.atob(base64);
		const outputArray = new Uint8Array(rawData.length);

		for (let i = 0; i < rawData.length; ++i) {
			outputArray[i] = rawData.charCodeAt(i);
		}
		return outputArray;
	}

	async function subscribeUser() {
		loading = true;
		message = '';
		try {
			const permission = await Notification.requestPermission();
			permissionState = permission;

			if (permission !== 'granted') {
				message = 'Permission for notifications was denied.';
				loading = false;
				return;
			}

			const registration = await navigator.serviceWorker.ready;
			
			// Subscribe using the public VAPID key
			const sub = await registration.pushManager.subscribe({
				userVisibleOnly: true,
				applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
			});

			// Send to backend
			const token = localStorage.getItem('authToken');
			if (!token) {
				throw new Error('Not authenticated.');
			}

			const res = await apiFetch('/api/push-notifications/subscribe', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'Authorization': `Bearer ${token}`
				},
				body: JSON.stringify({
					endpoint: sub.endpoint,
					keys: {
						p256dh: btoa(String.fromCharCode.apply(null, new Uint8Array(sub.getKey('p256dh')!))),
						auth: btoa(String.fromCharCode.apply(null, new Uint8Array(sub.getKey('auth')!)))
					}
				})
			});

			if (!res.ok) {
				const errorData = await res.json().catch(() => ({}));
				throw new Error(errorData.message || 'Failed to save subscription on server.');
			}

			subscription = sub;
			message = 'Successfully subscribed to push notifications!';
		} catch (error) {
			console.error('Failed to subscribe the user: ', error);
			message = 'Failed to subscribe: ' + (error as Error).message;
		} finally {
			loading = false;
		}
	}
	
	async function unsubscribeUser() {
		loading = true;
		message = '';
		try {
			if (subscription) {
				const endpoint = subscription.endpoint;
				
				const successful = await subscription.unsubscribe();
				if (successful) {
					// Notify backend
					const token = localStorage.getItem('authToken');
					if (token) {
						await apiFetch(`/api/push-notifications/unsubscribe?endpoint=${encodeURIComponent(endpoint)}`, {
							method: 'DELETE',
							headers: {
								'Authorization': `Bearer ${token}`
							}
						}).catch(e => console.error('Failed to notify backend of unsubscribe:', e));
					}
					
					subscription = null;
					message = 'Successfully unsubscribed.';
				}
			}
		} catch(error) {
			console.error('Error unsubscribing', error);
			message = 'Failed to unsubscribe.';
		} finally {
			loading = false;
		}
	}
</script>

{#if isSupported}
	<div class="p-4 border rounded-xl shadow-sm bg-card text-card-foreground">
		<h3 class="text-lg font-semibold mb-2">Push Notifications</h3>
		<p class="text-sm text-muted-foreground mb-4">
			Stay updated with the latest alerts.
		</p>
		
		<div class="flex items-center gap-2 mb-2">
			{#if permissionState === 'denied'}
				<p class="text-sm text-destructive">Notifications are blocked in your browser settings.</p>
			{:else if subscription}
				<p class="text-sm text-green-600 font-medium">You are subscribed to notifications.</p>
				<button 
					class="px-4 py-2 bg-secondary text-secondary-foreground rounded-md text-sm font-medium hover:bg-secondary/80 transition-colors"
					onclick={unsubscribeUser}
					disabled={loading}
				>
					{loading ? 'Processing...' : 'Unsubscribe'}
				</button>
			{:else}
				<button 
					class="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 transition-colors"
					onclick={subscribeUser}
					disabled={loading}
				>
					{loading ? 'Processing...' : 'Enable Notifications'}
				</button>
			{/if}
		</div>
		
		{#if message}
			<p class="text-xs text-muted-foreground mt-2">{message}</p>
		{/if}
		
		{#if subscription}
			<details class="mt-4 border-t pt-2">
				<summary class="text-xs cursor-pointer text-muted-foreground">View Subscription Data</summary>
				<pre class="text-[10px] bg-muted p-2 rounded mt-2 overflow-x-auto">{JSON.stringify(subscription, null, 2)}</pre>
			</details>
		{/if}
	</div>
{/if}
