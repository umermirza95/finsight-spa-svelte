<script lang="ts">
	import { onMount } from 'svelte';
	import { Wallet as WalletIcon, Coins, RefreshCw } from 'lucide-svelte';
	import WalletCard from '$lib/components/WalletCard.svelte';
	import { apiFetch } from '$lib/api';

	let isLoading = $state(true);
	let errorMessage = $state('');

	let wallets = $state<any[]>([]);

	// Derived summaries
	let totalWallets = $derived(wallets.length);
	
	// Just showing total number of different currencies as a quick metric
	let uniqueCurrenciesCount = $derived(
		new Set(wallets.map(w => w.fsCurrencyCode)).size
	);

	async function fetchWallets() {
		isLoading = true;
		errorMessage = '';
		try {
			const token = localStorage.getItem('authToken');
			if (!token) throw new Error('Not authenticated');

			const res = await apiFetch('/api/Wallet', {
				headers: { 'Authorization': `Bearer ${token}` }
			});

			if (!res.ok) {
				throw new Error('Failed to fetch wallets');
			}

			const data = await res.json();
			wallets = data.data || [];
		} catch (error: any) {
			errorMessage = error.message;
		} finally {
			isLoading = false;
		}
	}

	onMount(() => {
		fetchWallets();
	});
</script>

<div class="space-y-6 pb-12">
	
	<!-- Top Bar: Totals & Controls -->
	<div class="bg-card border border-border/50 rounded-3xl p-4 sm:p-6 shadow-sm flex flex-col xl:flex-row xl:items-center justify-between gap-6">
		
		<!-- Totals -->
		<div class="flex flex-row justify-between items-center w-full xl:w-auto gap-4 sm:gap-8 xl:gap-16">
			<div class="flex items-center gap-3 sm:gap-5">
				<div class="flex w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-secondary items-center justify-center text-primary shrink-0">
					<WalletIcon size={24} class="sm:hidden" />
					<WalletIcon size={28} class="hidden sm:block" />
				</div>
				<div class="text-left">
					<p class="text-xs sm:text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-0.5">Total Wallets</p>
					<h2 class="text-2xl sm:text-4xl font-bold text-foreground">{totalWallets}</h2>
				</div>
			</div>
			
			<div class="w-px h-12 sm:h-14 bg-border/50"></div>
			
			<div class="flex flex-row items-center gap-3 sm:gap-5 text-right sm:text-left">
				<div class="flex w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-brand-blue/30 items-center justify-center text-primary shrink-0">
					<Coins size={24} class="sm:hidden" />
					<Coins size={28} class="hidden sm:block" />
				</div>
				<div>
					<p class="text-xs sm:text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-0.5">Currencies</p>
					<h2 class="text-2xl sm:text-4xl font-bold text-foreground">{uniqueCurrenciesCount}</h2>
				</div>
			</div>
		</div>
	</div>

	<!-- Content Area -->
	{#if isLoading}
		<div class="flex justify-center items-center py-24">
			<div class="animate-spin w-10 h-10 border-4 border-primary/30 border-t-primary rounded-full"></div>
		</div>
	{:else if errorMessage}
		<div class="p-8 bg-destructive/10 text-destructive border border-destructive/20 rounded-2xl text-center flex flex-col items-center">
			<div class="w-12 h-12 bg-destructive/10 text-destructive rounded-full flex items-center justify-center mb-4">
				<WalletIcon size={24} />
			</div>
			<p class="text-lg font-bold mb-1">Error loading wallets</p>
			<p class="text-sm opacity-90">{errorMessage}</p>
		</div>
	{:else if wallets.length === 0}
		<div class="p-16 text-center text-muted-foreground bg-card border border-border/50 rounded-3xl shadow-sm flex flex-col items-center">
			<div class="w-20 h-20 bg-secondary/50 rounded-full flex items-center justify-center mb-6">
				<WalletIcon size={40} class="opacity-50" />
			</div>
			<h3 class="text-xl font-bold text-foreground mb-2">No Wallets Found</h3>
			<p class="max-w-md mx-auto text-sm">You haven't created any wallets yet. Use the API or add a wallet to get started managing your finances.</p>
		</div>
	{:else}
		<div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6">
			{#each wallets as wallet (wallet.id)}
				<WalletCard {wallet} />
			{/each}
		</div>
	{/if}

</div>
