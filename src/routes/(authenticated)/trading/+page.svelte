<script lang="ts">
	import { onMount } from "svelte";
	import { Activity, ChevronDown, ChevronUp } from "lucide-svelte";
	import * as Collapsible from "$lib/components/ui/collapsible";

	let openTrades = $state<any[]>([]);
	let totalCapital = $state(0);
	let capitalUsed = $state(0);
	let availableTranches = $state(0);
	let closedTrades = $state<any[]>([]);
	let isLoading = $state(true);
	let errorMessage = $state("");

	let isClosedTradesOpen = $state(false);
	let isOpenTradesOpen = $state(true);

	let totalClosedProfit = $derived.by(() => {
		return closedTrades.reduce(
			(sum, trade) => sum + (trade.netProfit || 0),
			0,
		);
	});

	async function loadData() {
		isLoading = true;
		errorMessage = "";
		try {
			const token = localStorage.getItem("authToken");
			if (!token) throw new Error("Not authenticated");

			// Fetch Open Trades
			const openRes = await fetch("/api/Trading/open", {
				headers: { Authorization: `Bearer ${token}` },
			});
			if (!openRes.ok) throw new Error("Failed to fetch open trades");
			const openData = await openRes.json();
			
			// Support both old array response and new object response
			if (Array.isArray(openData)) {
				openTrades = openData;
			} else {
				openTrades = openData.trades || [];
				totalCapital = openData.totalCapital || 0;
				capitalUsed = openData.capitalUsed || 0;
				availableTranches = openData.availableTranches || 0;
			}

			// Fetch Closed Trades
			const closedRes = await fetch("/api/Trading/closed", {
				headers: { Authorization: `Bearer ${token}` },
			});
			if (!closedRes.ok) throw new Error("Failed to fetch closed trades");
			const closedData = await closedRes.json();
			// Handle whether API returns array directly or wrapped in data object
			closedTrades = Array.isArray(closedData)
				? closedData
				: closedData.data || [];
		} catch (error: any) {
			errorMessage = error.message;
		} finally {
			isLoading = false;
		}
	}

	onMount(() => {
		loadData();
	});

	function formatCurrency(amount: number | string, currency: string = "USD") {
		if (amount === undefined || amount === null || amount === "N/A")
			return "N/A";
		const val = typeof amount === "string" ? parseFloat(amount) : amount;
		return new Intl.NumberFormat("en-US", {
			style: "currency",
			currency,
		}).format(val);
	}

	function formatDate(dateString: string) {
		if (!dateString) return "N/A";
		const d = new Date(dateString);
		return d.toLocaleDateString("en-US", {
			month: "short",
			day: "numeric",
			year: "numeric",
		});
	}
</script>

<div class="space-y-8 pb-12">
	{#if isLoading}
		<div class="flex items-center justify-center p-12">
			<div
				class="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"
			></div>
		</div>
	{:else if errorMessage}
		<div
			class="p-8 text-center text-destructive bg-destructive/10 rounded-xl"
		>
			{errorMessage}
		</div>
	{:else}
		<!-- Open Trades Section -->
		<Collapsible.Root
			bind:open={isOpenTradesOpen}
			class="bg-card border border-border/50 rounded-3xl shadow-sm overflow-hidden flex flex-col mb-8"
		>
			<div
				class="p-4 md:p-6 border-b border-border/50 flex items-center justify-between w-full bg-card/50"
			>
				<div class="flex items-center gap-3">
					<h2 class="text-xl font-bold text-foreground">
						Open Positions
					</h2>
					<span
						class="px-2.5 py-0.5 rounded-full bg-brand-blue/20 text-brand-blue-foreground text-sm font-semibold"
					>
						{openTrades.length}
					</span>
					<span
						class="px-2 py-0.5 rounded-full bg-brand-blue/30 text-brand-blue-foreground text-xs font-semibold ml-2"
						>Active</span
					>
				</div>
				<Collapsible.Trigger
					class="p-2 bg-secondary/50 hover:bg-secondary rounded-lg transition-colors text-foreground"
				>
					{#if isOpenTradesOpen}
						<ChevronUp size={20} />
					{:else}
						<ChevronDown size={20} />
					{/if}
				</Collapsible.Trigger>
			</div>

			<Collapsible.Content class="w-full overflow-x-auto">
				{#if openTrades.length === 0}
					<div class="p-12 text-center text-muted-foreground">
						No open positions.
					</div>
				{:else}
					<table class="w-full text-sm text-left">
						<thead
							class="text-xs text-muted-foreground uppercase bg-secondary/20 border-b border-border/50"
						>
							<tr>
								<th
									class="px-6 py-4 font-semibold tracking-wider"
									>Ticker</th
								>
								<th
									class="px-6 py-4 font-semibold tracking-wider"
									>Shares</th
								>
								<th
									class="px-6 py-4 font-semibold tracking-wider"
									>Entry</th
								>
								<th
									class="px-6 py-4 font-semibold tracking-wider"
									>Current</th
								>
								<th
									class="px-6 py-4 font-semibold tracking-wider"
									>P/L</th
								>
							</tr>
						</thead>
						<tbody class="divide-y divide-border/50">
							{#each openTrades as trade (trade.id)}
								<tr
									class="hover:bg-secondary/10 transition-colors group"
								>
									<td class="px-6 py-4">
										<div class="flex items-center gap-3">
											<div
												class="w-8 h-8 rounded-lg flex items-center justify-center bg-secondary/50 text-foreground"
											>
												<Activity size={16} />
											</div>
											<span
												class="font-bold text-foreground"
												>{trade.ticker}</span
											>
										</div>
									</td>
									<td
										class="px-6 py-4 font-medium text-foreground"
										>{trade.quantity}</td
									>
									<td class="px-6 py-4 text-foreground"
										>{formatCurrency(trade.tradePrice)}</td
									>
									<td class="px-6 py-4 text-muted-foreground">
										N/A
									</td>
									<td class="px-6 py-4 text-muted-foreground">
										N/A
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				{/if}
			</Collapsible.Content>
		</Collapsible.Root>

		<!-- Closed Trades Section -->
		<Collapsible.Root
			bind:open={isClosedTradesOpen}
			class="bg-card border border-border/50 rounded-3xl shadow-sm overflow-hidden flex flex-col"
		>
			<div
				class="p-4 md:p-6 border-b border-border/50 flex flex-col sm:flex-row sm:items-center justify-between w-full bg-card/50 gap-4"
			>
				<div class="flex items-center gap-3">
					<h2 class="text-xl font-bold text-foreground">
						Trade History
					</h2>
					<span
						class="px-2.5 py-0.5 rounded-full bg-secondary text-secondary-foreground text-sm font-semibold"
					>
						{closedTrades.length}
					</span>
				</div>
				<div class="flex items-center gap-4">
					<div
						class="hidden sm:flex items-center gap-4 bg-background border border-border/60 rounded-xl px-4 py-2"
					>
						<span class="text-sm font-medium text-muted-foreground"
							>Total Profit</span
						>
						<span
							class="text-lg font-bold {totalClosedProfit >= 0
								? 'text-green-600'
								: 'text-red-600'}"
						>
							{totalClosedProfit >= 0 ? "+" : ""}{formatCurrency(
								totalClosedProfit,
							)}
						</span>
					</div>
					<Collapsible.Trigger
						class="p-2 bg-secondary/50 hover:bg-secondary rounded-lg transition-colors text-foreground"
					>
						{#if isClosedTradesOpen}
							<ChevronUp size={20} />
						{:else}
							<ChevronDown size={20} />
						{/if}
					</Collapsible.Trigger>
				</div>
			</div>

			<Collapsible.Content class="w-full overflow-x-auto">
				{#if closedTrades.length === 0}
					<div class="p-12 text-center text-muted-foreground">
						No closed trades found.
					</div>
				{:else}
					<table class="w-full text-sm text-left">
						<thead
							class="text-xs text-muted-foreground uppercase bg-secondary/20 border-b border-border/50"
						>
							<tr>
								<th
									class="px-6 py-4 font-semibold tracking-wider"
									>Ticker</th
								>
								<th
									class="px-6 py-4 font-semibold tracking-wider"
									>Open Date</th
								>
								<th
									class="px-6 py-4 font-semibold tracking-wider"
									>Close Date</th
								>
								<th
									class="px-6 py-4 font-semibold tracking-wider"
									>Shares</th
								>
								<th
									class="px-6 py-4 font-semibold tracking-wider"
									>Buy Price</th
								>
								<th
									class="px-6 py-4 font-semibold tracking-wider"
									>Sell Price</th
								>
								<th
									class="px-6 py-4 font-semibold tracking-wider"
									>P/L</th
								>
							</tr>
						</thead>
						<tbody class="divide-y divide-border/50">
							{#each closedTrades as trade (trade.closedTradeId)}
								<tr
									class="hover:bg-secondary/10 transition-colors group"
								>
									<td class="px-6 py-4">
										<div class="flex items-center gap-3">
											<div
												class="w-8 h-8 rounded-lg flex items-center justify-center bg-secondary/50 text-foreground"
											>
												<Activity size={16} />
											</div>
											<span
												class="font-bold text-foreground"
												>{trade.ticker}</span
											>
										</div>
									</td>
									<td class="px-6 py-4 text-muted-foreground"
										>{formatDate(trade.openDate)}</td
									>
									<td class="px-6 py-4 text-muted-foreground"
										>{formatDate(trade.closeDate)}</td
									>
									<td
										class="px-6 py-4 font-medium text-foreground"
										>{trade.quantity}</td
									>
									<td class="px-6 py-4 text-foreground"
										>{formatCurrency(trade.buyPrice)}</td
									>
									<td class="px-6 py-4 text-foreground"
										>{formatCurrency(trade.sellPrice)}</td
									>
									<td class="px-6 py-4">
										<span
											class="font-bold {trade.netProfit >=
											0
												? 'text-green-600'
												: 'text-red-600'}"
										>
											{trade.netProfit >= 0
												? "+"
												: ""}{formatCurrency(
												trade.netProfit,
											)}
										</span>
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				{/if}
			</Collapsible.Content>
		</Collapsible.Root>
	{/if}
</div>
