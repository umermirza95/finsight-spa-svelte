<script lang="ts">
	import { onMount } from "svelte";
	import { Activity, ChevronDown, ChevronUp, Calendar, Search, Filter, X } from "lucide-svelte";
	import * as Collapsible from "$lib/components/ui/collapsible";
	import TickerIcon from "$lib/components/TickerIcon.svelte";

	let openTrades = $state<any[]>([]);
	let totalCapital = $state(0);
	let capitalUsed = $state(0);
	let availableTranches = $state(0);
	let closedTrades = $state<any[]>([]);
	let isLoading = $state(true);
	let errorMessage = $state("");

	let isClosedTradesOpen = $state(false);
	let isOpenTradesOpen = $state(true);

	let expandedTickers = $state<Record<string, boolean>>({});

	let filterStartDate = $state("");
	let filterEndDate = $state("");
	let filterTicker = $state("");
	let isFilterPopupOpen = $state(false);

	function toggleTicker(ticker: string) {
		expandedTickers[ticker] = !expandedTickers[ticker];
	}

	let totalClosedProfit = $derived.by(() => {
		return closedTrades.reduce(
			(sum, trade) => sum + (trade.netProfit || 0),
			0,
		);
	});

	let groupedOpenTrades = $derived.by(() => {
		const groups: Record<string, any[]> = {};
		for (const trade of openTrades) {
			const ticker = trade.ticker || 'Unknown';
			if (!groups[ticker]) {
				groups[ticker] = [];
			}
			groups[ticker].push(trade);
		}
		
		return Object.entries(groups).map(([ticker, trades]) => {
			const totalQuantity = trades.reduce((sum, t) => sum + (t.quantity || 0), 0);
			const totalCost = trades.reduce((sum, t) => sum + ((t.quantity || 0) * (t.tradePrice || 0)), 0);
			const avgEntry = totalQuantity > 0 ? totalCost / totalQuantity : 0;
			
			// We assume the currentPrice is the same for all tranches of the same ticker,
			// or we can take the currentPrice from the first trade that has it.
			const currentPrice = trades[0]?.currentPrice || 0;
			const totalCurrentValue = currentPrice * totalQuantity;
			const pl = totalCurrentValue - totalCost;

			return {
				ticker,
				trades,
				totalQuantity,
				avgEntry,
				currentPrice,
				pl
			};
		}).sort((a, b) => a.ticker.localeCompare(b.ticker));
	});

	let expandedDates = $state<Record<string, boolean>>({});

	function toggleDate(dateStr: string) {
		expandedDates[dateStr] = !expandedDates[dateStr];
	}

	let groupedClosedTrades = $derived.by(() => {
		const groups: Record<string, any[]> = {};
		for (const trade of closedTrades) {
			const dateStr = trade.closeDate ? trade.closeDate.split('T')[0] : 'Unknown';
			if (!groups[dateStr]) {
				groups[dateStr] = [];
			}
			groups[dateStr].push(trade);
		}
		
		return Object.entries(groups).map(([dateStr, trades]) => {
			const totalProfit = trades.reduce((sum, t) => sum + (t.netProfit || 0), 0);
			return {
				dateStr,
				trades,
				totalProfit
			};
		}).sort((a, b) => {
			if (a.dateStr === 'Unknown') return 1;
			if (b.dateStr === 'Unknown') return -1;
			return new Date(b.dateStr).getTime() - new Date(a.dateStr).getTime();
		});
	});

	async function loadOpenTrades(token: string) {
		const openRes = await fetch("/api/Trading/open", {
			headers: { Authorization: `Bearer ${token}` },
		});
		if (!openRes.ok) throw new Error("Failed to fetch open trades");
		const openData = await openRes.json();
		
		if (Array.isArray(openData)) {
			openTrades = openData;
		} else {
			openTrades = openData.trades || [];
			totalCapital = openData.totalCapital || 0;
			capitalUsed = openData.capitalUsed || 0;
			availableTranches = openData.availableTranches || 0;
		}
	}

	async function loadClosedTrades(token: string) {
		const params = new URLSearchParams();
		if (filterStartDate) params.append("startDate", filterStartDate);
		if (filterEndDate) params.append("endDate", filterEndDate);
		if (filterTicker) params.append("ticker", filterTicker);

		const closedRes = await fetch(`/api/Trading/closed?${params.toString()}`, {
			headers: { Authorization: `Bearer ${token}` },
		});
		if (!closedRes.ok) throw new Error("Failed to fetch closed trades");
		const closedData = await closedRes.json();
		closedTrades = Array.isArray(closedData)
			? closedData
			: closedData.data || [];
	}

	async function loadData() {
		isLoading = true;
		errorMessage = "";
		try {
			const token = localStorage.getItem("authToken");
			if (!token) throw new Error("Not authenticated");

			await Promise.all([
				loadOpenTrades(token),
				loadClosedTrades(token)
			]);
		} catch (error: any) {
			errorMessage = error.message;
		} finally {
			isLoading = false;
		}
	}

	async function applyFilters() {
		isLoading = true;
		errorMessage = "";
		try {
			const token = localStorage.getItem("authToken");
			if (!token) throw new Error("Not authenticated");

			await loadClosedTrades(token);
		} catch (error: any) {
			errorMessage = error.message;
		} finally {
			isLoading = false;
		}
	}

	async function clearFilters() {
		filterStartDate = "";
		filterEndDate = "";
		filterTicker = "";
		isFilterPopupOpen = false;
		await applyFilters();
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
								<th class="w-10"></th>
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
							{#each groupedOpenTrades as group (group.ticker)}
								<tr 
									class="bg-secondary/5 border-b border-border/50 {group.trades.length > 1 ? 'cursor-pointer hover:bg-secondary/10 transition-colors' : ''}"
									onclick={() => group.trades.length > 1 && toggleTicker(group.ticker)}
								>
									<td class="pl-4 pr-2">
										{#if group.trades.length > 1}
											<div class="p-1.5 rounded-md hover:bg-secondary/50 text-muted-foreground transition-colors flex items-center justify-center w-8 h-8">
												{#if expandedTickers[group.ticker]}
													<ChevronUp size={16} />
												{:else}
													<ChevronDown size={16} />
												{/if}
											</div>
										{/if}
									</td>
									<td class="px-6 py-4">
										<div class="flex items-center gap-3">
											<TickerIcon ticker={group.ticker} />
											<span class="font-bold text-foreground">{group.ticker}</span>
											{#if group.trades.length > 1}
												<span class="px-2 py-0.5 rounded-full bg-secondary/50 text-xs font-semibold text-muted-foreground">{group.trades.length}</span>
											{/if}
										</div>
									</td>
									<td class="px-6 py-4 font-medium text-foreground">{group.totalQuantity}</td>
									<td class="px-6 py-4 text-foreground">{formatCurrency(group.avgEntry)}</td>
									<td class="px-6 py-4 text-foreground">
										{group.currentPrice > 0 ? formatCurrency(group.currentPrice) : 'N/A'}
									</td>
									<td class="px-6 py-4">
										{#if group.pl !== 0}
											<div class="font-bold {group.pl >= 0 ? 'text-green-600' : 'text-red-600'}">
												{group.pl >= 0 ? '+' : ''}{formatCurrency(group.pl)}
											</div>
										{:else}
											<span class="text-muted-foreground">N/A</span>
										{/if}
									</td>
								</tr>
								
								{#if group.trades.length > 1 && expandedTickers[group.ticker]}
									{#each group.trades as trade (trade.id)}
										<tr class="hover:bg-secondary/10 transition-colors group bg-card">
											<td></td>
											<td class="px-6 py-3 pl-16 text-muted-foreground">
												<div class="flex items-center gap-2">
													<div class="w-1.5 h-1.5 rounded-full bg-border"></div>
													<span>Tranche</span>
												</div>
											</td>
											<td class="px-6 py-3 font-medium text-foreground">{trade.quantity}</td>
											<td class="px-6 py-3 text-foreground">{formatCurrency(trade.tradePrice)}</td>
											<td class="px-6 py-3 text-muted-foreground"></td>
											<td class="px-6 py-3 font-medium {trade.currentPrice > 0 ? ((trade.currentPrice - trade.tradePrice) * trade.quantity >= 0 ? 'text-green-600' : 'text-red-600') : 'text-muted-foreground'}">
												{#if trade.currentPrice > 0}
													{@const tranchePl = (trade.currentPrice - trade.tradePrice) * trade.quantity}
													{tranchePl >= 0 ? '+' : ''}{formatCurrency(tranchePl)}
												{:else}
													N/A
												{/if}
											</td>
										</tr>
									{/each}
								{/if}
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
					<button
						onclick={() => isFilterPopupOpen = true}
						class="p-2 bg-secondary/50 hover:bg-secondary rounded-lg transition-colors text-foreground flex items-center justify-center relative"
						title="Filter Trades"
					>
						<Filter size={20} />
						{#if filterStartDate || filterEndDate || filterTicker}
							<div class="absolute top-1 right-1 w-2 h-2 bg-primary rounded-full border border-card"></div>
						{/if}
					</button>
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
								<th class="w-10"></th>
								<th
									class="px-6 py-4 font-semibold tracking-wider"
									>Date / Ticker</th
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
							{#each groupedClosedTrades as group (group.dateStr)}
								<tr 
									class="bg-secondary/5 border-b border-border/50 cursor-pointer hover:bg-secondary/10 transition-colors"
									onclick={() => toggleDate(group.dateStr)}
								>
									<td class="pl-4 pr-2">
										<div class="p-1.5 rounded-md hover:bg-secondary/50 text-muted-foreground transition-colors flex items-center justify-center w-8 h-8">
											{#if expandedDates[group.dateStr]}
												<ChevronUp size={16} />
											{:else}
												<ChevronDown size={16} />
											{/if}
										</div>
									</td>
									<td class="px-6 py-4">
										<div class="flex items-center gap-3">
											<span class="font-bold text-foreground">{formatDate(group.dateStr)}</span>
											<span class="px-2 py-0.5 rounded-full bg-secondary/50 text-xs font-semibold text-muted-foreground">{group.trades.length}</span>
										</div>
									</td>
									<td colspan="5"></td>
									<td class="px-6 py-4">
										<span class="font-bold {group.totalProfit >= 0 ? 'text-green-600' : 'text-red-600'}">
											{group.totalProfit >= 0 ? "+" : ""}{formatCurrency(group.totalProfit)}
										</span>
									</td>
								</tr>
								
								{#if expandedDates[group.dateStr]}
									{#each group.trades as trade (trade.closedTradeId)}
										<tr class="hover:bg-secondary/10 transition-colors group bg-card border-b border-border/10 last:border-0">
											<td></td>
											<td class="px-6 py-3">
												<div class="flex items-center gap-3">
													<TickerIcon ticker={trade.ticker} fallbackClass="bg-secondary/50 text-foreground" />
													<span class="font-bold text-foreground">{trade.ticker}</span>
												</div>
											</td>
											<td class="px-6 py-3 text-muted-foreground">{formatDate(trade.openDate)}</td>
											<td class="px-6 py-3 text-muted-foreground">{formatDate(trade.closeDate)}</td>
											<td class="px-6 py-3 font-medium text-foreground">{trade.closedTradeQuantity}/{trade.openTradeQuantity}</td>
											<td class="px-6 py-3 text-foreground">{formatCurrency(trade.buyPrice)}</td>
											<td class="px-6 py-3 text-foreground">{formatCurrency(trade.sellPrice)}</td>
											<td class="px-6 py-3">
												<span class="font-bold {trade.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}">
													{trade.netProfit >= 0 ? "+" : ""}{formatCurrency(trade.netProfit)}
												</span>
											</td>
										</tr>
									{/each}
								{/if}
							{/each}
						</tbody>
					</table>
				{/if}
			</Collapsible.Content>
		</Collapsible.Root>
	{/if}
</div>

{#if isFilterPopupOpen}
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div class="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4" onclick={(e) => { if (e.target === e.currentTarget) isFilterPopupOpen = false; }}>
		<div class="bg-card border border-border rounded-2xl shadow-xl w-full max-w-md overflow-hidden flex flex-col">
			<div class="p-6 border-b border-border/50 flex items-center justify-between">
				<h3 class="text-lg font-bold text-foreground">Filter Trades</h3>
				<button onclick={() => isFilterPopupOpen = false} class="text-muted-foreground hover:text-foreground">
					<X size={20} />
				</button>
			</div>
			<div class="p-6 space-y-4">
				<div class="space-y-2">
					<label class="text-sm font-medium text-foreground">Start Date</label>
					<input type="date" bind:value={filterStartDate} class="w-full h-10 px-3 bg-background border border-border/60 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
				</div>
				<div class="space-y-2">
					<label class="text-sm font-medium text-foreground">End Date</label>
					<input type="date" bind:value={filterEndDate} class="w-full h-10 px-3 bg-background border border-border/60 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
				</div>
				<div class="space-y-2">
					<label class="text-sm font-medium text-foreground">Ticker</label>
					<input type="text" placeholder="e.g. AAPL" bind:value={filterTicker} class="w-full h-10 px-3 bg-background border border-border/60 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
				</div>
			</div>
			<div class="p-6 border-t border-border/50 flex flex-col sm:flex-row gap-3">
				<button onclick={clearFilters} class="w-full sm:w-1/2 h-10 bg-secondary hover:bg-secondary/80 text-foreground font-semibold rounded-xl transition-colors">
					Clear Filters
				</button>
				<button onclick={() => { isFilterPopupOpen = false; applyFilters(); }} class="w-full sm:w-1/2 h-10 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-xl transition-colors">
					Apply Filters
				</button>
			</div>
		</div>
	</div>
{/if}
