<script lang="ts">
	import { Wallet, Calendar, TrendingUp } from 'lucide-svelte';
	
	let { wallet } = $props<{
		wallet: {
			id: string;
			name: string;
			fsCurrencyCode: string;
			creationDate: string;
			initialBalance: number;
			balance: number;
		};
	}>();

	let formattedBalance = $derived(
		new Intl.NumberFormat('en-US', { style: 'currency', currency: wallet.fsCurrencyCode || 'USD' }).format(wallet.balance || 0)
	);

	let formattedDate = $derived(
		new Date(wallet.creationDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
	);
</script>

<a 
	href={`/wallets/${wallet.id}`}
	class="bg-card border border-border/50 rounded-3xl p-6 shadow-sm hover:shadow-md hover:border-primary/30 transition-all duration-300 flex flex-col justify-between group h-full cursor-pointer block"
>
	<!-- Header -->
	<div class="flex items-start justify-between mb-6">
		<div class="flex items-center gap-4">
			<div class="w-12 h-12 rounded-2xl bg-brand-blue/20 text-primary flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
				<Wallet size={24} />
			</div>
			<div>
				<h3 class="text-lg font-bold text-foreground line-clamp-1">{wallet.name}</h3>
				<div class="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
					<Calendar size={12} />
					<span>Created {formattedDate}</span>
				</div>
			</div>
		</div>
		<div class="px-2.5 py-1 bg-secondary/50 rounded-lg">
			<span class="text-xs font-bold text-primary tracking-wide">{wallet.fsCurrencyCode}</span>
		</div>
	</div>

	<!-- Balance Section -->
	<div class="space-y-1 bg-background/50 p-4 rounded-2xl border border-border/40">
		<div class="flex justify-between items-center text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
			<span>Current Balance</span>
			<TrendingUp size={14} class="text-emerald-500/70" />
		</div>
		<div class="flex items-baseline gap-1">
			<h2 class="text-2xl font-bold text-foreground tracking-tight">{formattedBalance}</h2>
		</div>
</div>
</a>
