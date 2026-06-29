<script lang="ts">
	import { onMount } from 'svelte';
	import { Wallet } from 'lucide-svelte';

	let isLoading = $state(true);
	let errorMessage = $state('');

	let totalCapital = $state(0);
	let capitalUsed = $state(0);
	let availableTranches = $state(0);

	async function fetchData() {
		isLoading = true;
		errorMessage = '';
		try {
			const token = localStorage.getItem('authToken');
			if (!token) throw new Error('Not authenticated');

			// Fetch Open Trades for Capital Metrics
			const openRes = await fetch('/api/Trading/open', {
				headers: { Authorization: `Bearer ${token}` }
			});
			if (!openRes.ok) throw new Error('Failed to fetch capital metrics');
			const openData = await openRes.json();
			
			if (!Array.isArray(openData)) {
				totalCapital = openData.totalCapital || 0;
				capitalUsed = openData.capitalUsed || 0;
				availableTranches = openData.availableTranches || 0;
			}
		} catch (error: any) {
			errorMessage = error.message;
		} finally {
			isLoading = false;
		}
	}

	onMount(() => {
		fetchData();
	});

	function formatCurrency(amount: number) {
		return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(amount);
	}
</script>

<div class="bg-card border border-border/50 rounded-3xl p-6 md:p-8 flex flex-col shadow-sm w-full">
	<div class="flex items-center gap-3 mb-8">
		<div class="p-2.5 bg-primary/10 text-primary rounded-xl">
			<Wallet size={24} />
		</div>
		<h2 class="text-xl md:text-2xl font-bold text-foreground">Capital Deployment</h2>
	</div>
	
	<div class="w-full">
		{#if isLoading}
			<div class="flex items-center justify-center p-12">
				<div class="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
			</div>
		{:else if errorMessage}
			<div class="text-center text-destructive text-sm p-4">
				{errorMessage}
			</div>
		{:else if totalCapital > 0}
			<div class="grid grid-cols-1 sm:grid-cols-2 gap-6 items-stretch">
				<div class="bg-secondary/10 p-6 rounded-2xl border border-border/40 flex flex-col justify-center relative overflow-hidden group">
					<div class="absolute -bottom-10 -left-10 w-32 h-32 bg-green-500/10 rounded-full blur-3xl transition-transform group-hover:scale-110"></div>
					<span class="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-2 z-10">Capital Deployed</span>
					<div class="flex items-baseline gap-2 z-10 mb-4">
						<span class="text-3xl font-black text-foreground">{formatCurrency(capitalUsed)}</span>
						<span class="text-sm font-semibold text-muted-foreground">/ {formatCurrency(totalCapital)}</span>
					</div>
					<div class="w-full h-2 bg-secondary/30 rounded-full overflow-hidden z-10">
						<div class="h-full bg-primary rounded-full transition-all duration-1000" style="width: {Math.min(100, (capitalUsed / totalCapital) * 100)}%"></div>
					</div>
				</div>

				<div class="bg-secondary/10 p-6 rounded-2xl border border-border/40 flex flex-col justify-center relative overflow-hidden group">
					<div class="absolute -top-10 -right-10 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl transition-transform group-hover:scale-110"></div>
					<span class="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-2 z-10">Remaining Capital</span>
					<span class="text-3xl font-black text-foreground z-10">{formatCurrency(totalCapital - capitalUsed)}</span>
				</div>

				<div class="sm:col-span-2 bg-secondary/10 p-6 rounded-2xl border border-border/40 flex flex-col sm:flex-row items-start sm:items-center justify-between relative overflow-hidden group gap-4">
					<div class="absolute right-0 top-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl translate-x-1/2 -translate-y-1/2"></div>
					
					<div class="flex flex-col z-10">
						<span class="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1">Available Tranches</span>
						<div class="flex items-baseline gap-2">
							<span class="text-5xl font-black text-foreground">{availableTranches}</span>
							<span class="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Ready to deploy</span>
						</div>
					</div>
					
					<div class="flex flex-wrap gap-1.5 max-w-[200px] justify-start sm:justify-end z-10">
						{#each Array(Math.min(availableTranches, 18)) as _}
							<div class="w-2.5 h-8 bg-primary rounded-sm shadow-md opacity-80 group-hover:opacity-100 transition-opacity"></div>
						{/each}
						{#if availableTranches > 18}
							<div class="w-8 h-8 flex items-center justify-center text-xs font-black text-primary bg-primary/20 rounded-md">+{availableTranches - 18}</div>
						{/if}
					</div>
				</div>
			</div>
		{:else}
			<div class="text-center text-muted-foreground text-sm py-12 bg-secondary/10 rounded-2xl border border-border/40">
				Trading capital not configured.
			</div>
		{/if}
	</div>
</div>
