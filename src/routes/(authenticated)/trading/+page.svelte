<script lang="ts">
	import { onMount } from "svelte";
	import {
		Activity,
		ChevronDown,
		ChevronUp,
		Filter,
		X,
		MoreHorizontal,
		RefreshCw,
		Settings,
		Save,
		Server,
		WifiOff,
	} from "lucide-svelte";
	import * as Collapsible from "$lib/components/ui/collapsible";
	import TickerIcon from "$lib/components/TickerIcon.svelte";
	import { apiFetch } from "$lib/api";

	let openTrades = $state<any[]>([]);
	let activeOrders = $state<any[]>([]);
	let closedTrades = $state<any[]>([]);
	let isLoading = $state(true);
	let errorMessage = $state("");

	let isClosedTradesOpen = $state(false);
	let isActiveOrdersOpen = $state(false);
	let isOpenTradesOpen = $state(false);
	let isSellOrdersOpen = $state(false);
	let sellOrderDropdown = $state<string | null>(null);

	// Match Modal State
	let isMatchModalOpen = $state(false);
	let matchTargetSellOrder = $state<any>(null);
	let selectedBuyOrderId = $state<string | null>(null);
	let isMatching = $state(false);

	let isActionsOpen = $state(false);
	let isSyncing = $state(false);
	let toastMessage = $state("");
	let toastType = $state<"success" | "error">("success");

	let expandedTickers = $state<Record<string, boolean>>({});

	// Adjust Price Modal State
	let isAdjustPriceModalOpen = $state(false);
	let adjustPriceTargetOrder = $state<any>(null);
	let adjustPriceValue = $state<number>(0);
	let isAdjustingPrice = $state(false);
	let activeOrderDropdown = $state<number | null>(null);

	// Cancel Order Modal State
	let isCancelOrderModalOpen = $state(false);
	let cancelTargetOrderId = $state<number | null>(null);
	let isCancellingOrder = $state(false);

	let isCancelAllModalOpen = $state(false);
	let isCancellingAllOrders = $state(false);

	// Open Order Modal State
	let isOpenOrderModalOpen = $state(false);
	let newOrderTicker = $state("");
	let newOrderDirection = $state("BUY");
	let newOrderQuantity = $state<number>(0);
	let newOrderLimitPrice = $state<number>(0);
	let isPlacingOrder = $state(false);

	let filterStartDate = $state("");
	let filterEndDate = $state("");
	let filterTicker = $state("");
	let isFilterPopupOpen = $state(false);

	let ibkrConnected = $state(false);
	let tradingConfig = $state<any>({});
	let isConfigModalOpen = $state(false);
	let isSavingConfig = $state(false);

	let editAutoTrade = $state(false);
	let editLogsOnly = $state(false);
	let editSharesPerTranche = $state(0);
	let editDistancePerTranche = $state(0);
	let editDefaultUserId = $state("");
	let editTicker = $state("");

	function toggleTicker(ticker: string) {
		expandedTickers[ticker] = !expandedTickers[ticker];
	}

	let totalClosedProfit = $derived.by(() => {
		return closedTrades.reduce(
			(sum, trade) => sum + (trade.netProfit || 0),
			0,
		);
	});

	let buyTrades = $derived(openTrades.filter((t) => t.tradeDirection === 0 || t.tradeDirection === "Buy" || t.tradeDirection === "BUY"));
	let sellTrades = $derived(openTrades.filter((t) => t.tradeDirection === 1 || t.tradeDirection === "Sell" || t.tradeDirection === "SELL"));

	let groupedOpenTrades = $derived.by(() => {
		const groups: Record<string, any[]> = {};
		for (const trade of buyTrades) {
			const ticker = trade.ticker || "Unknown";
			if (!groups[ticker]) {
				groups[ticker] = [];
			}
			groups[ticker].push(trade);
		}

		return Object.entries(groups)
			.map(([ticker, trades]) => {
				const totalQuantity = trades.reduce(
					(sum, t) => sum + (t.quantity || 0),
					0,
				);
				const totalCost = trades.reduce(
					(sum, t) => sum + (t.quantity || 0) * (t.tradePrice || 0),
					0,
				);
				const avgEntry =
					totalQuantity > 0 ? totalCost / totalQuantity : 0;

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
					pl,
				};
			})
			.sort((a, b) => a.ticker.localeCompare(b.ticker));
	});

	let expandedDates = $state<Record<string, boolean>>({});

	function toggleDate(dateStr: string) {
		expandedDates[dateStr] = !expandedDates[dateStr];
	}

	let groupedClosedTrades = $derived.by(() => {
		const groups: Record<string, any[]> = {};
		for (const trade of closedTrades) {
			const dateStr = trade.closeDate
				? trade.closeDate.split("T")[0]
				: "Unknown";
			if (!groups[dateStr]) {
				groups[dateStr] = [];
			}
			groups[dateStr].push(trade);
		}

		return Object.entries(groups)
			.map(([dateStr, trades]) => {
				const totalProfit = trades.reduce(
					(sum, t) => sum + (t.netProfit || 0),
					0,
				);
				return {
					dateStr,
					trades,
					totalProfit,
				};
			})
			.sort((a, b) => {
				if (a.dateStr === "Unknown") return 1;
				if (b.dateStr === "Unknown") return -1;
				return (
					new Date(b.dateStr).getTime() -
					new Date(a.dateStr).getTime()
				);
			});
	});

	async function loadOpenTrades(token: string) {
		const openRes = await apiFetch("/api/Trading/open", {
			headers: { Authorization: `Bearer ${token}` },
		});
		if (!openRes.ok) throw new Error("Failed to fetch open trades");
		const openData = await openRes.json();

		if (Array.isArray(openData)) {
			openTrades = openData.filter((t: any) => t.ticker !== "EUR.USD");
		} else {
			const trades = openData.trades || [];
			openTrades = trades.filter((t: any) => t.ticker !== "EUR.USD");
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

		const closedRes = await apiFetch(
			`/api/Trading/closed?${params.toString()}`,
			{
				headers: { Authorization: `Bearer ${token}` },
			},
		);
		if (!closedRes.ok) throw new Error("Failed to fetch closed trades");
		const closedData = await closedRes.json();
		closedTrades = Array.isArray(closedData)
			? closedData
			: closedData.data || [];
	}

	async function loadActiveOrders(token: string) {
		const res = await apiFetch("/api/Trading/active-orders", {
			headers: { Authorization: `Bearer ${token}` },
		});
		if (!res.ok) throw new Error("Failed to fetch active orders");
		activeOrders = await res.json();
	}

	async function loadData() {
		isLoading = true;
		errorMessage = "";
		try {
			const token = localStorage.getItem("authToken");
			if (!token) throw new Error("Not authenticated");

			await Promise.all([
				loadOpenTrades(token),
				loadClosedTrades(token),
				loadActiveOrders(token),
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

	function showToast(msg: string, type: "success" | "error" = "success") {
		toastMessage = msg;
		toastType = type;
		setTimeout(() => {
			toastMessage = "";
		}, 3000);
	}

	async function handleSyncTrades() {
		isActionsOpen = false;
		isSyncing = true;
		try {
			const token = localStorage.getItem("authToken");
			if (!token) throw new Error("Not authenticated");

			const res = await apiFetch("/api/Trading/sync", {
				method: "POST",
				headers: { Authorization: `Bearer ${token}` },
			});

			if (!res.ok) {
				const errorData = await res.json().catch(() => ({}));
				throw new Error(errorData.message || "Failed to sync trades");
			}

			const data = await res.json();
			showToast(
				data.message || "Trades synchronized successfully.",
				"success",
			);

			// Reload data after sync
			await loadData();
		} catch (error: any) {
			showToast(error.message, "error");
		} finally {
			isSyncing = false;
		}
	}

	async function fetchConfig() {
		try {
			const token = localStorage.getItem("authToken");
			if (!token) return;
			const res = await apiFetch("/api/Trading/config", {
				headers: { Authorization: `Bearer ${token}` },
			});
			if (res.ok) {
				const data = await res.json();
				tradingConfig = data.config || {};
				ibkrConnected = data.isConnected || false;
			}
		} catch (e) {
			console.error("Failed to fetch trading config", e);
		}
	}

	function openConfigModal() {
		isActionsOpen = false;
		editAutoTrade = tradingConfig.autoTrade || false;
		editLogsOnly = tradingConfig.logsOnly || false;
		editSharesPerTranche = tradingConfig.sharesPerTranche || 0;
		editDistancePerTranche = tradingConfig.distancePerTranche || 0;
		editDefaultUserId = tradingConfig.defaultUserId || "";
		editTicker = tradingConfig.ticker || "";
		isConfigModalOpen = true;
	}

	async function saveConfig() {
		isSavingConfig = true;
		try {
			const token = localStorage.getItem("authToken");
			if (!token) throw new Error("Not authenticated");
			const payload = {
				autoTrade: editAutoTrade,
				logsOnly: editLogsOnly,
				sharesPerTranche: editSharesPerTranche,
				distancePerTranche: editDistancePerTranche,
				defaultUserId: editDefaultUserId,
				ticker: editTicker,
			};
			const res = await apiFetch("/api/Trading/config", {
				method: "PUT",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${token}`,
				},
				body: JSON.stringify(payload),
			});
			if (!res.ok) throw new Error("Failed to save config");
			showToast("Configuration saved successfully", "success");
			isConfigModalOpen = false;
			await fetchConfig(); // Refresh immediately
		} catch (error: any) {
			showToast(error.message, "error");
		} finally {
			isSavingConfig = false;
		}
	}

	async function adjustOrderPrice() {
		if (!adjustPriceTargetOrder) return;

		isAdjustingPrice = true;
		try {
			const res = await apiFetch("/api/Trading/active-orders/adjust-price", {
				method: "POST",
				headers: {
					Authorization: `Bearer ${localStorage.getItem("authToken")}`,
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					permId: adjustPriceTargetOrder.orderId,
					newPrice: adjustPriceValue,
				}),
			});
			const data = await res.json();
			if (res.ok) {
				showToast("Order price adjusted successfully.", "success");
				isAdjustPriceModalOpen = false;
				await loadActiveOrders(localStorage.getItem("authToken") || ""); // refresh the list
			} else {
				showToast("Failed to adjust price: " + data.error, "error");
			}
		} catch (err: any) {
			console.error("Adjust price error:", err);
			showToast("Failed to adjust price: " + err.message, "error");
		} finally {
			isAdjustingPrice = false;
		}
	}

	async function placeOrder() {
		if (
			!newOrderTicker ||
			newOrderQuantity <= 0 ||
			newOrderLimitPrice <= 0
		) {
			showToast("Please fill all fields with valid values.", "error");
			return;
		}

		isPlacingOrder = true;
		try {
			const res = await apiFetch("/api/Trading/active-orders/place-order", {
				method: "POST",
				headers: {
					Authorization: `Bearer ${localStorage.getItem("authToken")}`,
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					ticker: newOrderTicker,
					direction: newOrderDirection,
					quantity: newOrderQuantity,
					limitPrice: newOrderLimitPrice,
				}),
			});
			const data = await res.json();
			if (res.ok) {
				showToast("Order placed successfully.", "success");
				isOpenOrderModalOpen = false;
				newOrderTicker = "";
				newOrderQuantity = 0;
				newOrderLimitPrice = 0;
				if (data.orders) {
					activeOrders = data.orders;
				} else {
					await loadActiveOrders(localStorage.getItem("authToken") || ""); // refresh the list
				}
			} else {
				showToast("Failed to place order: " + data.error, "error");
			}
		} catch (err: any) {
			console.error("Place order error:", err);
			showToast("Failed to place order: " + err.message, "error");
		} finally {
			isPlacingOrder = false;
		}
	}

	async function confirmCancelOrder() {
		if (cancelTargetOrderId === null) return;
		isCancellingOrder = true;
		try {
			const res = await apiFetch(`/api/Trading/active-orders/${cancelTargetOrderId}`, {
				method: "DELETE",
				headers: {
					Authorization: `Bearer ${localStorage.getItem("authToken")}`,
				},
			});
			if (res.ok) {
				showToast("Order cancelled successfully.", "success");
				isCancelOrderModalOpen = false;
				cancelTargetOrderId = null;
				await loadActiveOrders(localStorage.getItem("authToken") || "");
			} else {
				const data = await res.json();
				showToast(data.error || "Failed to cancel order.", "error");
			}
		} catch (err: any) {
			showToast(err.message || "Failed to cancel order.", "error");
		} finally {
			isCancellingOrder = false;
		}
	}

	async function confirmCancelAllOrders() {
		isCancellingAllOrders = true;
		try {
			const res = await apiFetch(`/api/Trading/active-orders`, {
				method: "DELETE",
				headers: {
					Authorization: `Bearer ${localStorage.getItem("authToken")}`,
				},
			});
			if (res.ok) {
				showToast("All orders cancelled successfully.", "success");
				isCancelAllModalOpen = false;
				await loadActiveOrders(localStorage.getItem("authToken") || "");
			} else {
				const data = await res.json();
				showToast(data.error || "Failed to cancel all orders.", "error");
			}
		} catch (err: any) {
			showToast(err.message || "Failed to cancel all orders.", "error");
		} finally {
			isCancellingAllOrders = false;
		}
	}

	async function confirmMatch() {
		if (!matchTargetSellOrder || !selectedBuyOrderId) return;
		isMatching = true;
		try {
			const res = await apiFetch("/api/Trading/manual-match", {
				method: "POST",
				headers: {
					Authorization: `Bearer ${localStorage.getItem("authToken")}`,
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					buyOrderId: selectedBuyOrderId,
					sellOrderId: matchTargetSellOrder.externalId,
				}),
			});
			const data = await res.json().catch(() => ({}));
			if (res.ok) {
				showToast(data.message || "Trades matched successfully.", "success");
				isMatchModalOpen = false;
				matchTargetSellOrder = null;
				selectedBuyOrderId = null;
				await loadData();
			} else {
				showToast(data.error || "Failed to match trades.", "error");
			}
		} catch (err: any) {
			showToast(err.message || "Failed to match trades.", "error");
		} finally {
			isMatching = false;
		}
	}

	onMount(() => {
		loadData();
		fetchConfig();
		const interval = setInterval(fetchConfig, 2000);
		return () => clearInterval(interval);
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

<div class="space-y-8 pb-12 relative">
	<!-- Actions and Toast -->
	<div class="flex items-center justify-between mb-4">
		<div class="flex items-center">
			{#if ibkrConnected}
				<div
					class="flex items-center gap-2 px-3 py-1.5 bg-green-500/10 text-green-600 border border-green-500/20 rounded-lg text-sm font-medium"
				>
					<Server size={16} />
					<span>IBKR Connected</span>
				</div>
			{:else}
				<div
					class="flex items-center gap-2 px-3 py-1.5 bg-red-500/10 text-red-600 border border-red-500/20 rounded-lg text-sm font-medium"
				>
					<WifiOff size={16} />
					<span>IBKR Disconnected</span>
				</div>
			{/if}
		</div>
		<div class="relative">
			<button
				onclick={() => (isActionsOpen = !isActionsOpen)}
				class="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium shadow-sm"
			>
				<span>Actions</span>
				<ChevronDown
					size={16}
					class="transition-transform {isActionsOpen
						? 'rotate-180'
						: ''}"
				/>
			</button>

			{#if isActionsOpen}
				<!-- svelte-ignore a11y_click_events_have_key_events -->
				<!-- svelte-ignore a11y_no_static_element_interactions -->
				<div
					class="fixed inset-0 z-40"
					onclick={() => (isActionsOpen = false)}
				></div>
				<div
					class="absolute right-0 mt-2 w-48 bg-card border border-border/50 rounded-xl shadow-lg overflow-hidden py-1 z-50 animate-in fade-in slide-in-from-top-2"
				>
					<button
						onclick={handleSyncTrades}
						disabled={isSyncing}
						class="w-full text-left px-4 py-2.5 text-sm hover:bg-secondary/50 flex items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-foreground"
					>
						<RefreshCw
							size={16}
							class={isSyncing ? "animate-spin" : ""}
						/>
						<span>Sync Trades</span>
					</button>
					<button
						onclick={() => {
							isActionsOpen = false;
							isOpenOrderModalOpen = true;
						}}
						class="w-full text-left px-4 py-2.5 text-sm hover:bg-secondary/50 flex items-center gap-2 transition-colors text-foreground"
					>
						<Activity size={16} />
						<span>Open Order</span>
					</button>
					<button
						onclick={openConfigModal}
						class="w-full text-left px-4 py-2.5 text-sm hover:bg-secondary/50 flex items-center gap-2 transition-colors text-foreground"
					>
						<Settings size={16} />
						<span>Edit Config</span>
					</button>
					<button
						onclick={() => {
							isActionsOpen = false;
							isCancelAllModalOpen = true;
						}}
						class="w-full text-left px-4 py-2.5 text-sm hover:bg-red-50 text-red-600 flex items-center gap-2 transition-colors"
					>
						<X size={16} />
						<span>Cancel All Orders</span>
					</button>
				</div>
			{/if}
		</div>
	</div>

	{#if toastMessage}
		<div
			class="fixed bottom-6 right-6 z-[60] animate-in slide-in-from-bottom-5 fade-in duration-300"
		>
			<div
				class="px-6 py-3 rounded-xl shadow-lg font-medium border flex items-center gap-3 {toastType ===
				'success'
					? 'bg-green-50 text-green-900 border-green-200'
					: 'bg-red-50 text-red-900 border-red-200'}"
			>
				{#if toastType === "success"}
					<div
						class="w-2.5 h-2.5 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]"
					></div>
				{:else}
					<div
						class="w-2.5 h-2.5 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]"
					></div>
				{/if}
				{toastMessage}
			</div>
		</div>
	{/if}

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
		<!-- Active Orders Section -->
		{#if activeOrders.length > 0}
		<Collapsible.Root
			bind:open={isActiveOrdersOpen}
			class="bg-card border border-border/50 rounded-3xl shadow-sm overflow-hidden flex flex-col mb-8"
		>
			<div
				class="p-4 md:p-6 border-b border-border/50 flex items-center justify-between w-full bg-card/50"
			>
				<div class="flex items-center gap-3">
					<h2 class="text-xl font-bold text-foreground">
						Active Broker Orders
					</h2>
					<span
						class="px-2.5 py-0.5 rounded-full bg-brand-blue/20 text-brand-blue-foreground text-sm font-semibold"
					>
						{activeOrders.length}
					</span>
				</div>
				<Collapsible.Trigger
					class="p-2 bg-secondary/50 hover:bg-secondary rounded-lg transition-colors text-foreground"
				>
					{#if isActiveOrdersOpen}
						<ChevronUp size={20} />
					{:else}
						<ChevronDown size={20} />
					{/if}
				</Collapsible.Trigger>
			</div>

			<Collapsible.Content class="w-full overflow-x-auto">
				{#if activeOrders.length === 0}
					<div class="p-12 text-center text-muted-foreground">
						No active broker orders.
					</div>
				{:else}
					<table class="w-full text-sm text-left">
						<thead
							class="text-xs text-muted-foreground uppercase bg-secondary/20 border-b border-border/50"
						>
							<tr>
								<th
									class="px-6 py-4 font-semibold tracking-wider w-24"
									>Order ID</th
								>
								<th
									class="px-6 py-4 font-semibold tracking-wider"
									>Ticker</th
								>
								<th
									class="px-6 py-4 font-semibold tracking-wider"
									>Action</th
								>
								<th
									class="px-6 py-4 font-semibold tracking-wider"
									>Shares</th
								>
								<th
									class="px-6 py-4 font-semibold tracking-wider"
									>Limit Price</th
								>
								<th
									class="px-6 py-4 font-semibold tracking-wider w-16 text-right"
									>Actions</th
								>
							</tr>
						</thead>
						<tbody class="divide-y divide-border/50">
							{#each activeOrders as order (order.orderId)}
								<tr
									class="bg-card hover:bg-secondary/10 transition-colors"
								>
									<td
										class="px-6 py-4 text-muted-foreground font-mono text-xs"
										>{order.orderId}</td
									>
									<td class="px-6 py-4">
										<div class="flex items-center gap-3">
											<TickerIcon ticker={order.ticker} />
											<span
												class="font-bold text-foreground"
												>{order.ticker}</span
											>
										</div>
									</td>
									<td class="px-6 py-4">
										<span
											class="font-semibold {order.action.toUpperCase() ===
											'BUY'
												? 'text-green-600'
												: 'text-red-600'}"
										>
											{order.action.toUpperCase()}
										</span>
									</td>
									<td
										class="px-6 py-4 font-medium text-foreground"
										>{order.quantity}</td
									>
									<td class="px-6 py-4 text-foreground"
										>{formatCurrency(order.limitPrice)}</td
									>
									<td class="px-6 py-4 text-right relative">
										<button
											class="p-2 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-lg transition-colors"
											onclick={() =>
												(activeOrderDropdown =
													activeOrderDropdown ===
													order.orderId
														? null
														: order.orderId)}
										>
											<MoreHorizontal size={20} />
										</button>
										{#if activeOrderDropdown === order.orderId}
											<!-- svelte-ignore a11y_click_events_have_key_events -->
											<!-- svelte-ignore a11y_no_static_element_interactions -->
											<div
												class="fixed inset-0 z-40"
												onclick={() =>
													(activeOrderDropdown =
														null)}
											></div>
											<div
												class="absolute right-6 top-12 w-40 bg-card border border-border shadow-lg rounded-xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2"
											>
												<button
													class="w-full text-left px-4 py-3 text-sm hover:bg-secondary transition-colors text-foreground"
													onclick={() => {
														activeOrderDropdown =
															null;
														adjustPriceTargetOrder =
															order;
														adjustPriceValue =
															order.limitPrice;
														isAdjustPriceModalOpen = true;
													}}
												>
													Adjust Price
												</button>
												<button
													class="w-full text-left px-4 py-3 text-sm hover:bg-red-50 text-red-600 transition-colors"
													onclick={() => {
														activeOrderDropdown = null;
														cancelTargetOrderId = order.orderId;
														isCancelOrderModalOpen = true;
													}}
												>
													Cancel Order
												</button>
											</div>
										{/if}
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				{/if}
			</Collapsible.Content>
		</Collapsible.Root>
		{/if}

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
						{buyTrades.length}
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
									class="bg-secondary/5 border-b border-border/50 {group
										.trades.length > 1
										? 'cursor-pointer hover:bg-secondary/10 transition-colors'
										: ''}"
									onclick={() =>
										group.trades.length > 1 &&
										toggleTicker(group.ticker)}
								>
									<td class="pl-4 pr-2">
										{#if group.trades.length > 1}
											<div
												class="p-1.5 rounded-md hover:bg-secondary/50 text-muted-foreground transition-colors flex items-center justify-center w-8 h-8"
											>
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
											<span
												class="font-bold text-foreground"
												>{group.ticker}</span
											>
											{#if group.trades.length > 1}
												<span
													class="px-2 py-0.5 rounded-full bg-secondary/50 text-xs font-semibold text-muted-foreground"
													>{group.trades.length}</span
												>
											{/if}
										</div>
									</td>
									<td
										class="px-6 py-4 font-medium text-foreground"
										>{group.totalQuantity}</td
									>
									<td class="px-6 py-4 text-foreground"
										>{formatCurrency(group.avgEntry)}</td
									>
									<td class="px-6 py-4 text-foreground">
										{group.currentPrice > 0
											? formatCurrency(group.currentPrice)
											: "N/A"}
									</td>
									<td class="px-6 py-4">
										{#if group.pl !== 0}
											<div
												class="font-bold {group.pl >= 0
													? 'text-green-600'
													: 'text-red-600'}"
											>
												{group.pl >= 0
													? "+"
													: ""}{formatCurrency(
													group.pl,
												)}
											</div>
										{:else}
											<span class="text-muted-foreground"
												>N/A</span
											>
										{/if}
									</td>
								</tr>

								{#if group.trades.length > 1 && expandedTickers[group.ticker]}
									{#each group.trades as trade (trade.id)}
										<tr
											class="hover:bg-secondary/10 transition-colors group bg-card"
										>
											<td></td>
											<td
												class="px-6 py-3 pl-16 text-muted-foreground"
											>
												<div
													class="flex items-center gap-2"
												>
													<div
														class="w-1.5 h-1.5 rounded-full bg-border"
													></div>
													<span>Tranche</span>
												</div>
											</td>
											<td
												class="px-6 py-3 font-medium text-foreground"
												>{trade.quantity}</td
											>
											<td
												class="px-6 py-3 text-foreground"
												>{formatCurrency(
													trade.tradePrice,
												)}</td
											>
											<td
												class="px-6 py-3 text-muted-foreground"
											></td>
											<td
												class="px-6 py-3 font-medium {trade.currentPrice >
												0
													? (trade.currentPrice -
															trade.tradePrice) *
															trade.quantity >=
														0
														? 'text-green-600'
														: 'text-red-600'
													: 'text-muted-foreground'}"
											>
												{#if trade.currentPrice > 0}
													{@const tranchePl =
														(trade.currentPrice -
															trade.tradePrice) *
														trade.quantity}
													{tranchePl >= 0
														? "+"
														: ""}{formatCurrency(
														tranchePl,
													)}
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

		<!-- Sell Orders Section -->
		{#if sellTrades.length > 0}
		<Collapsible.Root
			bind:open={isSellOrdersOpen}
			class="bg-card border border-border/50 rounded-3xl shadow-sm overflow-hidden flex flex-col mb-8"
		>
			<div
				class="p-4 md:p-6 border-b border-border/50 flex items-center justify-between w-full bg-card/50"
			>
				<div class="flex items-center gap-3">
					<h2 class="text-xl font-bold text-foreground">
						Sell Orders
					</h2>
					<span
						class="px-2.5 py-0.5 rounded-full bg-red-500/20 text-red-600 text-sm font-semibold"
					>
						{sellTrades.length}
					</span>
				</div>
				<Collapsible.Trigger
					class="p-2 bg-secondary/50 hover:bg-secondary rounded-lg transition-colors text-foreground"
				>
					{#if isSellOrdersOpen}
						<ChevronUp size={20} />
					{:else}
						<ChevronDown size={20} />
					{/if}
				</Collapsible.Trigger>
			</div>

			<Collapsible.Content class="w-full overflow-x-auto">
				{#if sellTrades.length === 0}
					<div class="p-12 text-center text-muted-foreground">
						No sell orders.
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
									>Trade Price</th
								>
								<th
									class="px-6 py-4 font-semibold tracking-wider"
									>Current Price</th
								>
								<th
									class="px-6 py-4 font-semibold tracking-wider w-16 text-right"
									>Actions</th
								>
							</tr>
						</thead>
						<tbody class="divide-y divide-border/50">
							{#each sellTrades as trade (trade.id)}
								<tr
									class="bg-card hover:bg-secondary/10 transition-colors"
								>
									<td class="px-6 py-4">
										<div class="flex items-center gap-3">
											<TickerIcon ticker={trade.ticker} />
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
									<td class="px-6 py-4 text-foreground">
										{trade.currentPrice > 0
											? formatCurrency(trade.currentPrice)
											: "N/A"}
									</td>
									<td class="px-6 py-4 text-right relative">
										<button
											class="p-2 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-lg transition-colors"
											onclick={() =>
												(sellOrderDropdown =
													sellOrderDropdown ===
													trade.id
														? null
														: trade.id)}
										>
											<MoreHorizontal size={20} />
										</button>
										{#if sellOrderDropdown === trade.id}
											<!-- svelte-ignore a11y_click_events_have_key_events -->
											<!-- svelte-ignore a11y_no_static_element_interactions -->
											<div
												class="fixed inset-0 z-40"
												onclick={() =>
													(sellOrderDropdown =
														null)}
											></div>
											<div
												class="absolute right-6 top-12 w-40 bg-card border border-border shadow-lg rounded-xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2"
											>
												<button
													class="w-full text-left px-4 py-3 text-sm hover:bg-secondary transition-colors text-foreground"
													onclick={() => {
														sellOrderDropdown = null;
														matchTargetSellOrder = trade;
														selectedBuyOrderId = null;
														isMatchModalOpen = true;
													}}
												>
													Match
												</button>
											</div>
										{/if}
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				{/if}
			</Collapsible.Content>
		</Collapsible.Root>
		{/if}

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
						onclick={() => (isFilterPopupOpen = true)}
						class="p-2 bg-secondary/50 hover:bg-secondary rounded-lg transition-colors text-foreground flex items-center justify-center relative"
						title="Filter Trades"
					>
						<Filter size={20} />
						{#if filterStartDate || filterEndDate || filterTicker}
							<div
								class="absolute top-1 right-1 w-2 h-2 bg-primary rounded-full border border-card"
							></div>
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
										<div
											class="p-1.5 rounded-md hover:bg-secondary/50 text-muted-foreground transition-colors flex items-center justify-center w-8 h-8"
										>
											{#if expandedDates[group.dateStr]}
												<ChevronUp size={16} />
											{:else}
												<ChevronDown size={16} />
											{/if}
										</div>
									</td>
									<td class="px-6 py-4">
										<div class="flex items-center gap-3">
											<span
												class="font-bold text-foreground"
												>{formatDate(
													group.dateStr,
												)}</span
											>
											<span
												class="px-2 py-0.5 rounded-full bg-secondary/50 text-xs font-semibold text-muted-foreground"
												>{group.trades.length}</span
											>
										</div>
									</td>
									<td colspan="5"></td>
									<td class="px-6 py-4">
										<span
											class="font-bold {group.totalProfit >=
											0
												? 'text-green-600'
												: 'text-red-600'}"
										>
											{group.totalProfit >= 0
												? "+"
												: ""}{formatCurrency(
												group.totalProfit,
											)}
										</span>
									</td>
								</tr>

								{#if expandedDates[group.dateStr]}
									{#each group.trades as trade (trade.closedTradeId)}
										<tr
											class="hover:bg-secondary/10 transition-colors group bg-card border-b border-border/10 last:border-0"
										>
											<td></td>
											<td class="px-6 py-3">
												<div
													class="flex items-center gap-3"
												>
													<TickerIcon
														ticker={trade.ticker}
														fallbackClass="bg-secondary/50 text-foreground"
													/>
													<span
														class="font-bold text-foreground"
														>{trade.ticker}</span
													>
												</div>
											</td>
											<td
												class="px-6 py-3 text-muted-foreground"
												>{formatDate(
													trade.openDate,
												)}</td
											>
											<td
												class="px-6 py-3 text-muted-foreground"
												>{formatDate(
													trade.closeDate,
												)}</td
											>
											<td
												class="px-6 py-3 font-medium text-foreground"
												>{trade.closedTradeQuantity}/{trade.openTradeQuantity}</td
											>
											<td
												class="px-6 py-3 text-foreground"
												>{formatCurrency(
													trade.buyPrice,
												)}</td
											>
											<td
												class="px-6 py-3 text-foreground"
												>{formatCurrency(
													trade.sellPrice,
												)}</td
											>
											<td class="px-6 py-3">
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
	<div
		class="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
		onclick={(e) => {
			if (e.target === e.currentTarget) isFilterPopupOpen = false;
		}}
	>
		<div
			class="bg-card border border-border rounded-2xl shadow-xl w-full max-w-md overflow-hidden flex flex-col"
		>
			<div
				class="p-6 border-b border-border/50 flex items-center justify-between"
			>
				<h3 class="text-lg font-bold text-foreground">Filter Trades</h3>
				<button
					onclick={() => (isFilterPopupOpen = false)}
					class="text-muted-foreground hover:text-foreground"
				>
					<X size={20} />
				</button>
			</div>
			<div class="p-6 space-y-4">
				<div class="space-y-2">
					<label class="text-sm font-medium text-foreground"
						>Start Date</label
					>
					<input
						type="date"
						bind:value={filterStartDate}
						class="w-full h-10 px-3 bg-background border border-border/60 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
					/>
				</div>
				<div class="space-y-2">
					<label class="text-sm font-medium text-foreground"
						>End Date</label
					>
					<input
						type="date"
						bind:value={filterEndDate}
						class="w-full h-10 px-3 bg-background border border-border/60 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
					/>
				</div>
				<div class="space-y-2">
					<label class="text-sm font-medium text-foreground"
						>Ticker</label
					>
					<input
						type="text"
						placeholder="e.g. AAPL"
						bind:value={filterTicker}
						class="w-full h-10 px-3 bg-background border border-border/60 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
					/>
				</div>
			</div>
			<div
				class="p-6 border-t border-border/50 flex flex-col sm:flex-row gap-3"
			>
				<button
					onclick={clearFilters}
					class="w-full sm:w-1/2 h-10 bg-secondary hover:bg-secondary/80 text-foreground font-semibold rounded-xl transition-colors"
				>
					Clear Filters
				</button>
				<button
					onclick={() => {
						isFilterPopupOpen = false;
						applyFilters();
					}}
					class="w-full sm:w-1/2 h-10 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-xl transition-colors"
				>
					Apply Filters
				</button>
			</div>
		</div>
	</div>
{/if}

{#if isConfigModalOpen}
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div
		class="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
		onclick={(e) => {
			if (e.target === e.currentTarget) isConfigModalOpen = false;
		}}
	>
		<div
			class="bg-card border border-border rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col"
		>
			<div
				class="p-6 border-b border-border/50 flex items-center justify-between"
			>
				<h3 class="text-lg font-bold text-foreground">
					Edit Trading Config
				</h3>
				<button
					onclick={() => (isConfigModalOpen = false)}
					class="text-muted-foreground hover:text-foreground"
				>
					<X size={20} />
				</button>
			</div>
			<div class="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
				<div class="space-y-2 flex items-center gap-3">
					<input
						type="checkbox"
						bind:checked={editAutoTrade}
						id="autotrade"
						class="w-4 h-4 rounded border-border"
					/>
					<label
						for="autotrade"
						class="text-sm font-medium text-foreground"
						>Auto Trade</label
					>
				</div>
				<div class="space-y-2 flex items-center gap-3">
					<input
						type="checkbox"
						bind:checked={editLogsOnly}
						id="logsonly"
						class="w-4 h-4 rounded border-border"
					/>
					<label
						for="logsonly"
						class="text-sm font-medium text-foreground"
						>Logs Only</label
					>
				</div>
				<div class="space-y-2">
					<label class="text-sm font-medium text-foreground"
						>Shares Per Tranche</label
					>
					<input
						type="number"
						bind:value={editSharesPerTranche}
						class="w-full h-10 px-3 bg-background border border-border/60 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
					/>
				</div>
				<div class="space-y-2">
					<label class="text-sm font-medium text-foreground"
						>Distance Per Tranche</label
					>
					<input
						type="number"
						step="0.01"
						bind:value={editDistancePerTranche}
						class="w-full h-10 px-3 bg-background border border-border/60 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
					/>
				</div>
				<div class="space-y-2">
					<label class="text-sm font-medium text-foreground"
						>Default User ID</label
					>
					<input
						type="text"
						bind:value={editDefaultUserId}
						class="w-full h-10 px-3 bg-background border border-border/60 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
					/>
				</div>
				<div class="space-y-2">
					<label class="text-sm font-medium text-foreground"
						>Ticker</label
					>
					<input
						type="text"
						bind:value={editTicker}
						placeholder="e.g. AAPL"
						class="w-full h-10 px-3 bg-background border border-border/60 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
					/>
				</div>
			</div>
			<div
				class="p-6 border-t border-border/50 flex flex-col sm:flex-row gap-3"
			>
				<button
					onclick={() => (isConfigModalOpen = false)}
					class="w-full sm:w-1/2 h-10 bg-secondary hover:bg-secondary/80 text-foreground font-semibold rounded-xl transition-colors"
				>
					Cancel
				</button>
				<button
					onclick={saveConfig}
					disabled={isSavingConfig}
					class="w-full sm:w-1/2 h-10 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-xl transition-colors flex justify-center items-center gap-2"
				>
					{#if isSavingConfig}
						<div
							class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"
						></div>
					{:else}
						<Save size={16} />
					{/if}
					Save Config
				</button>
			</div>
		</div>
	</div>
{/if}

{#if isAdjustPriceModalOpen && adjustPriceTargetOrder}
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div
		class="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
		onclick={(e) => {
			if (e.target === e.currentTarget) isAdjustPriceModalOpen = false;
		}}
	>
		<div
			class="bg-card border border-border rounded-2xl shadow-xl w-full max-w-sm overflow-hidden flex flex-col"
		>
			<div
				class="p-6 border-b border-border/50 flex items-center justify-between"
			>
				<h3 class="text-lg font-bold text-foreground">
					Adjust Limit Price
				</h3>
				<button
					onclick={() => (isAdjustPriceModalOpen = false)}
					class="text-muted-foreground hover:text-foreground"
				>
					<X size={20} />
				</button>
			</div>
			<div class="p-6 space-y-4">
				<p class="text-sm text-muted-foreground">
					Adjust the limit price for <span
						class="font-bold text-foreground"
						>{adjustPriceTargetOrder.ticker}</span
					>
					order ({adjustPriceTargetOrder.action}).
				</p>
				<div class="space-y-2">
					<label class="text-sm font-medium text-foreground"
						>New Limit Price ($)</label
					>
					<input
						type="number"
						step="0.01"
						bind:value={adjustPriceValue}
						class="w-full h-10 px-3 bg-background border border-border/60 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
					/>
				</div>
			</div>
			<div
				class="p-6 border-t border-border/50 flex flex-col sm:flex-row gap-3"
			>
				<button
					onclick={() => (isAdjustPriceModalOpen = false)}
					class="w-full sm:w-1/2 h-10 bg-secondary hover:bg-secondary/80 text-foreground font-semibold rounded-xl transition-colors"
				>
					Cancel
				</button>
				<button
					onclick={adjustOrderPrice}
					disabled={isAdjustingPrice}
					class="w-full sm:w-1/2 h-10 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-xl transition-colors flex justify-center items-center gap-2"
				>
					{#if isAdjustingPrice}
						<div
							class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"
						></div>
					{:else}
						<Save size={16} />
					{/if}
					Confirm
				</button>
			</div>
		</div>
	</div>
{/if}

{#if isMatchModalOpen && matchTargetSellOrder}
	{@const matchingBuyTrades = buyTrades.filter(t => t.ticker === matchTargetSellOrder.ticker)}
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div
		class="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
		onclick={(e) => {
			if (e.target === e.currentTarget) isMatchModalOpen = false;
		}}
	>
		<div
			class="bg-card border border-border rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col"
		>
			<div
				class="p-6 border-b border-border/50 flex items-center justify-between"
			>
				<h3 class="text-lg font-bold text-foreground">
					Match Trades for {matchTargetSellOrder.ticker}
				</h3>
				<button
					onclick={() => (isMatchModalOpen = false)}
					class="text-muted-foreground hover:text-foreground"
				>
					<X size={20} />
				</button>
			</div>
			<div class="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
				<p class="text-sm text-muted-foreground">
					Select a BUY order to match with the SELL order of <span class="font-bold text-foreground">{matchTargetSellOrder.quantity}</span> shares at <span class="font-bold text-foreground">{formatCurrency(matchTargetSellOrder.tradePrice)}</span>.
				</p>
				
				{#if matchingBuyTrades.length === 0}
					<div class="p-4 text-center text-muted-foreground bg-secondary/20 rounded-xl">
						No matching BUY orders found for {matchTargetSellOrder.ticker}.
					</div>
				{:else}
					<div class="space-y-2">
						{#each matchingBuyTrades as buyTrade}
							<label class="flex items-center gap-4 p-4 border border-border rounded-xl cursor-pointer hover:bg-secondary/10 transition-colors {selectedBuyOrderId === buyTrade.externalId ? 'border-primary bg-primary/5' : ''}">
								<input
									type="radio"
									name="buyOrder"
									value={buyTrade.externalId}
									bind:group={selectedBuyOrderId}
									class="w-4 h-4 text-primary bg-background border-border"
								/>
								<div class="flex-1 flex justify-between items-center">
									<div>
										<div class="font-medium text-foreground">{formatDate(buyTrade.date)}</div>
										<div class="text-sm text-muted-foreground font-mono">{buyTrade.externalId}</div>
									</div>
									<div class="text-right">
										<div class="font-bold text-foreground">{buyTrade.quantity} Shares</div>
										<div class="text-sm text-muted-foreground">@ {formatCurrency(buyTrade.tradePrice)}</div>
									</div>
								</div>
							</label>
						{/each}
					</div>
				{/if}
			</div>
			<div
				class="p-6 border-t border-border/50 flex flex-col sm:flex-row gap-3"
			>
				<button
					onclick={() => (isMatchModalOpen = false)}
					class="w-full sm:w-1/2 h-10 bg-secondary hover:bg-secondary/80 text-foreground font-semibold rounded-xl transition-colors"
				>
					Cancel
				</button>
				<button
					onclick={confirmMatch}
					disabled={isMatching || !selectedBuyOrderId}
					class="w-full sm:w-1/2 h-10 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-xl transition-colors flex justify-center items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
				>
					{#if isMatching}
						<div
							class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"
						></div>
					{:else}
						<Save size={16} />
					{/if}
					Confirm Match
				</button>
			</div>
		</div>
	</div>
{/if}

{#if isOpenOrderModalOpen}
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div
		class="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
		onclick={(e) => {
			if (e.target === e.currentTarget) isOpenOrderModalOpen = false;
		}}
	>
		<div
			class="bg-card border border-border rounded-2xl shadow-xl w-full max-w-md overflow-hidden flex flex-col"
		>
			<div
				class="p-6 border-b border-border/50 flex items-center justify-between"
			>
				<h3 class="text-lg font-bold text-foreground">Open Order</h3>
				<button
					onclick={() => (isOpenOrderModalOpen = false)}
					class="text-muted-foreground hover:text-foreground"
				>
					<X size={20} />
				</button>
			</div>
			<div class="p-6 space-y-4">
				<div class="space-y-2">
					<label class="text-sm font-medium text-foreground"
						>Ticker</label
					>
					<input
						type="text"
						bind:value={newOrderTicker}
						placeholder="e.g. AAPL"
						class="w-full h-10 px-3 bg-background border border-border/60 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 uppercase"
					/>
				</div>
				<div class="space-y-2">
					<label class="text-sm font-medium text-foreground"
						>Action</label
					>
					<div class="flex gap-2">
						<button
							onclick={() => (newOrderDirection = "BUY")}
							class="flex-1 h-10 rounded-xl font-semibold transition-colors {newOrderDirection ===
							'BUY'
								? 'bg-green-500 text-white'
								: 'bg-secondary text-foreground hover:bg-secondary/80'}"
						>
							BUY
						</button>
						<button
							onclick={() => (newOrderDirection = "SELL")}
							class="flex-1 h-10 rounded-xl font-semibold transition-colors {newOrderDirection ===
							'SELL'
								? 'bg-red-500 text-white'
								: 'bg-secondary text-foreground hover:bg-secondary/80'}"
						>
							SELL
						</button>
					</div>
				</div>
				<div class="grid grid-cols-2 gap-4">
					<div class="space-y-2">
						<label class="text-sm font-medium text-foreground"
							>Quantity</label
						>
						<input
							type="number"
							bind:value={newOrderQuantity}
							class="w-full h-10 px-3 bg-background border border-border/60 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
						/>
					</div>
					<div class="space-y-2">
						<label class="text-sm font-medium text-foreground"
							>Limit Price ($)</label
						>
						<input
							type="number"
							step="0.01"
							bind:value={newOrderLimitPrice}
							class="w-full h-10 px-3 bg-background border border-border/60 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
						/>
					</div>
				</div>
			</div>
			<div
				class="p-6 border-t border-border/50 flex flex-col sm:flex-row gap-3"
			>
				<button
					onclick={() => (isOpenOrderModalOpen = false)}
					class="w-full sm:w-1/2 h-10 bg-secondary hover:bg-secondary/80 text-foreground font-semibold rounded-xl transition-colors"
				>
					Cancel
				</button>
				<button
					onclick={placeOrder}
					disabled={isPlacingOrder}
					class="w-full sm:w-1/2 h-10 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-xl transition-colors flex justify-center items-center gap-2"
				>
					{#if isPlacingOrder}
						<div
							class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"
						></div>
					{:else}
						<Save size={16} />
					{/if}
					Place Order
				</button>
			</div>
		</div>
	</div>
{/if}

{#if isCancelOrderModalOpen}
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div
		class="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in"
		onclick={(e) => {
			if (e.target === e.currentTarget) isCancelOrderModalOpen = false;
		}}
	>
		<div
			class="bg-card w-full max-w-md rounded-2xl shadow-2xl overflow-hidden border border-border animate-in zoom-in-95"
		>
			<div class="p-6">
				<h3 class="text-xl font-bold text-foreground mb-4">
					Cancel Order
				</h3>
				<p class="text-muted-foreground mb-6">
					Are you sure you want to cancel this order? This action cannot be undone.
				</p>
			</div>
			<div
				class="p-6 border-t border-border/50 flex flex-col sm:flex-row gap-3"
			>
				<button
					onclick={() => (isCancelOrderModalOpen = false)}
					class="w-full sm:w-1/2 h-10 bg-secondary hover:bg-secondary/80 text-foreground font-semibold rounded-xl transition-colors"
				>
					No, Keep Order
				</button>
				<button
					onclick={confirmCancelOrder}
					disabled={isCancellingOrder}
					class="w-full sm:w-1/2 h-10 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-xl transition-colors flex justify-center items-center gap-2"
				>
					{#if isCancellingOrder}
						<div
							class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"
						></div>
					{:else}
						<X size={16} />
					{/if}
					Yes, Cancel
				</button>
			</div>
		</div>
	</div>
{/if}

{#if isCancelAllModalOpen}
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div
		class="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in"
		onclick={(e) => {
			if (e.target === e.currentTarget) isCancelAllModalOpen = false;
		}}
	>
		<div
			class="bg-card w-full max-w-md rounded-2xl shadow-2xl overflow-hidden border border-border animate-in zoom-in-95"
		>
			<div class="p-6">
				<h3 class="text-xl font-bold text-foreground mb-4">
					Cancel All Orders
				</h3>
				<p class="text-muted-foreground mb-6">
					Are you sure you want to cancel ALL open orders? This action cannot be undone.
				</p>
			</div>
			<div
				class="p-6 border-t border-border/50 flex flex-col sm:flex-row gap-3"
			>
				<button
					onclick={() => (isCancelAllModalOpen = false)}
					class="w-full sm:w-1/2 h-10 bg-secondary hover:bg-secondary/80 text-foreground font-semibold rounded-xl transition-colors"
				>
					No, Keep Orders
				</button>
				<button
					onclick={confirmCancelAllOrders}
					disabled={isCancellingAllOrders}
					class="w-full sm:w-1/2 h-10 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-xl transition-colors flex justify-center items-center gap-2"
				>
					{#if isCancellingAllOrders}
						<div
							class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"
						></div>
					{:else}
						<X size={16} />
					{/if}
					Yes, Cancel All
				</button>
			</div>
		</div>
	</div>
{/if}
