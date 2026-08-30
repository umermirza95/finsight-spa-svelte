<script lang="ts">
	import { X } from 'lucide-svelte';
	import { apiFetch } from '$lib/api';

	let {
		isOpen = false,
		onClose,
		onSuccess
	} = $props<{
		isOpen: boolean;
		onClose: () => void;
		onSuccess: () => void;
	}>();

	let isSubmitting = $state(false);
	let errorMessage = $state('');

	// Form fields
	let name = $state('');
	let currency = $state('USD');
	let initialBalance = $state('');

	$effect(() => {
		if (isOpen) {
			name = '';
			currency = 'USD';
			initialBalance = '';
			errorMessage = '';
		}
	});

	async function handleSubmit() {
		isSubmitting = true;
		errorMessage = '';
		try {
			const token = localStorage.getItem('authToken');
			
			const payload = {
				name,
				currency,
				initialBalance: initialBalance ? parseFloat(initialBalance) : 0
			};

			const res = await apiFetch('/api/Wallet', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'Authorization': `Bearer ${token}`
				},
				body: JSON.stringify(payload)
			});

			if (!res.ok) {
				const errorData = await res.json().catch(() => ({}));
				throw new Error(errorData.message || errorData.error || 'Failed to create wallet');
			}

			onSuccess();
			onClose();
		} catch (error: any) {
			errorMessage = error.message || 'An error occurred';
		} finally {
			isSubmitting = false;
		}
	}
</script>

<svelte:window onkeydown={(e) => { if (isOpen && e.key === 'Escape') onClose(); }} />

{#if isOpen}
	<div class="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div class="absolute inset-0" onclick={onClose}></div>
		
		<div 
			class="relative w-full max-w-md bg-card border border-border/50 rounded-3xl shadow-xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200"
			role="dialog"
			aria-modal="true"
		>
			<!-- Header -->
			<div class="flex items-center justify-between p-6 border-b border-border/50 bg-card/50">
				<h2 class="text-xl font-bold text-foreground">
					Create Wallet
				</h2>
				<button 
					type="button"
					onclick={onClose}
					class="p-2 text-muted-foreground hover:bg-secondary/50 hover:text-foreground rounded-full transition-colors"
				>
					<X size={20} />
				</button>
			</div>

			<form 
				onsubmit={(e) => { e.preventDefault(); handleSubmit(); }} 
				class="flex flex-col flex-1"
			>
				<!-- Body -->
				<div class="p-6 space-y-4">
					{#if errorMessage}
						<div class="p-3 bg-destructive/10 text-destructive border border-destructive/20 rounded-xl text-sm">
							{errorMessage}
						</div>
					{/if}

					<!-- Name -->
					<div class="space-y-2">
						<!-- svelte-ignore a11y_label_has_associated_control -->
						<label class="text-sm font-semibold text-foreground">Wallet Name</label>
						<input 
							type="text" 
							bind:value={name}
							placeholder="e.g. Main Account"
							class="w-full px-3 py-2.5 bg-background border border-border/60 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all text-foreground"
							required
							autofocus
						/>
					</div>

					<!-- Currency and Balance -->
					<div class="flex gap-4">
						<div class="space-y-2 w-1/3">
							<!-- svelte-ignore a11y_label_has_associated_control -->
							<label class="text-sm font-semibold text-foreground">Currency</label>
							<select 
								bind:value={currency}
								class="w-full px-3 py-2.5 bg-background border border-border/60 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all text-foreground"
							>
								<option value="PKR">PKR</option>
								<option value="USD">USD</option>
								<option value="EUR">EUR</option>
							</select>
						</div>
						<div class="space-y-2 flex-1">
							<!-- svelte-ignore a11y_label_has_associated_control -->
							<label class="text-sm font-semibold text-foreground">Initial Balance</label>
							<input 
								type="number" 
								step="0.01"
								bind:value={initialBalance}
								placeholder="0.00"
								class="w-full px-3 py-2.5 bg-background border border-border/60 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all text-foreground"
							/>
						</div>
					</div>
				</div>

				<!-- Footer -->
				<div class="p-6 border-t border-border/50 bg-secondary/20 flex justify-end gap-3">
					<button 
						type="button"
						onclick={onClose}
						class="px-5 py-2.5 text-sm font-semibold text-muted-foreground hover:text-foreground hover:bg-secondary/50 rounded-xl transition-colors"
						disabled={isSubmitting}
					>
						Cancel
					</button>
					<button 
						type="submit"
						class="px-5 py-2.5 text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl transition-all shadow-sm flex items-center justify-center min-w-[120px]"
						disabled={isSubmitting || !name}
					>
						{#if isSubmitting}
							<div class="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin"></div>
						{:else}
							Create Wallet
						{/if}
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}
