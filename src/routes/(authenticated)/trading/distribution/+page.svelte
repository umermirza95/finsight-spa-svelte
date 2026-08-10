<script lang="ts">
	import { onMount } from "svelte";
	import { goto } from "$app/navigation";
	import { ArrowLeft, ChevronDown, ChevronUp, Save, ShieldAlert, DollarSign } from "lucide-svelte";
	import * as Collapsible from "$lib/components/ui/collapsible";
	import { apiFetch } from "$lib/api";

	let availableBalance = $state<number>(0);
	let insuranceBalance = $state<number>(0);
	let isLoadingBalances = $state(false);

	let profitDistributionAmount = $state<number>(0);
	let profitDistributionType = $state<number>(0); // 0 = Insurance, 1 = Withdrawal
	let isSubmittingDistribution = $state(false);

	let profitDistributions = $state<any[]>([]);
	let isDistributionsLoading = $state(false);
	let distStartDate = $state("");
	let distEndDate = $state("");
	let distTypeFilter = $state<string>("");

	let insurancePayouts = $state<any[]>([]);
	let isPayoutsLoading = $state(false);
	let payoutStartDate = $state("");
	let payoutEndDate = $state("");

	let isDistributionsOpen = $state(true);
	let isPayoutsOpen = $state(false);

	let toastMessage = $state("");
	let toastType = $state<"success" | "error">("success");

	function showToast(msg: string, type: "success" | "error" = "success") {
		toastMessage = msg;
		toastType = type;
		setTimeout(() => {
			toastMessage = "";
		}, 3000);
	}

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
			timeZone: "UTC",
		});
	}

	async function loadBalances() {
		isLoadingBalances = true;
		try {
			const token = localStorage.getItem("authToken");
			if (!token) throw new Error("Not authenticated");

			const [availRes, insRes] = await Promise.all([
				apiFetch("/api/Trading/available-balance", {
					headers: { Authorization: `Bearer ${token}` },
				}),
				apiFetch("/api/Trading/insurance-balance", {
					headers: { Authorization: `Bearer ${token}` },
				})
			]);

			if (availRes.ok) {
				const data = await availRes.json();
				availableBalance = data.availableBalance || 0;
			}
			if (insRes.ok) {
				const data = await insRes.json();
				insuranceBalance = data.insuranceBalance || 0;
			}
		} catch (err: any) {
			console.error("Failed to load balances", err);
		} finally {
			isLoadingBalances = false;
		}
	}

	async function loadDistributions() {
		isDistributionsLoading = true;
		try {
			const token = localStorage.getItem("authToken");
			if (!token) throw new Error("Not authenticated");

			const params = new URLSearchParams();
			if (distStartDate) params.append("startDate", distStartDate);
			if (distEndDate) params.append("endDate", distEndDate);
			if (distTypeFilter) params.append("distributionType", distTypeFilter);

			const res = await apiFetch(`/api/Trading/profit-distributions?${params.toString()}`, {
				headers: { Authorization: `Bearer ${token}` },
			});
			if (res.ok) {
				profitDistributions = await res.json();
			}
		} catch (err: any) {
			console.error("Failed to load distributions", err);
		} finally {
			isDistributionsLoading = false;
		}
	}

	async function loadPayouts() {
		isPayoutsLoading = true;
		try {
			const token = localStorage.getItem("authToken");
			if (!token) throw new Error("Not authenticated");

			const params = new URLSearchParams();
			if (payoutStartDate) params.append("startDate", payoutStartDate);
			if (payoutEndDate) params.append("endDate", payoutEndDate);

			const res = await apiFetch(`/api/Trading/insurance-payouts?${params.toString()}`, {
				headers: { Authorization: `Bearer ${token}` },
			});
			if (res.ok) {
				insurancePayouts = await res.json();
			}
		} catch (err: any) {
			console.error("Failed to load payouts", err);
		} finally {
			isPayoutsLoading = false;
		}
	}

	async function submitDistribution() {
		if (
			profitDistributionAmount <= 0 ||
			profitDistributionAmount > availableBalance
		) {
			showToast("Invalid amount.", "error");
			return;
		}

		isSubmittingDistribution = true;
		try {
			const token = localStorage.getItem("authToken");
			const res = await apiFetch("/api/Trading/profit-distribution", {
				method: "POST",
				headers: {
					Authorization: `Bearer ${token}`,
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					amount: profitDistributionAmount,
					type: profitDistributionType,
				}),
			});
			const data = await res.json().catch(() => ({}));
			if (res.ok) {
				showToast(
					data.message || "Profit distribution successful.",
					"success",
				);
				profitDistributionAmount = 0;
				// Refresh all data
				await Promise.all([
					loadBalances(),
					loadDistributions(),
					loadPayouts()
				]);
			} else {
				showToast(
					data.error || "Failed to submit profit distribution.",
					"error",
				);
			}
		} catch (err: any) {
			showToast(
				err.message || "Failed to submit profit distribution.",
				"error",
			);
		} finally {
			isSubmittingDistribution = false;
		}
	}

	onMount(() => {
		loadBalances();
		loadDistributions();
		loadPayouts();
	});

</script>

<div class="space-y-8 pb-12">

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
					<div class="w-2.5 h-2.5 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]"></div>
				{:else}
					<div class="w-2.5 h-2.5 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]"></div>
				{/if}
				{toastMessage}
			</div>
		</div>
	{/if}

	<div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
		<!-- Left Column: Balances and Distribution Form -->
		<div class="lg:col-span-1 space-y-6">
			<!-- Balances Cards -->
			<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-4">
				<div class="bg-card border border-border/50 rounded-3xl p-6 shadow-sm flex flex-col items-center justify-center relative overflow-hidden">
					<div class="absolute top-0 right-0 p-4 opacity-10">
						<DollarSign size={48} />
					</div>
					<span class="text-sm font-medium text-muted-foreground mb-2">Available for Distribution</span>
					{#if isLoadingBalances}
						<div class="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
					{:else}
						<span class="text-3xl font-bold text-foreground tracking-tight">{formatCurrency(availableBalance)}</span>
					{/if}
				</div>

				<div class="bg-card border border-border/50 rounded-3xl p-6 shadow-sm flex flex-col items-center justify-center relative overflow-hidden">
					<div class="absolute top-0 right-0 p-4 opacity-10">
						<ShieldAlert size={48} />
					</div>
					<span class="text-sm font-medium text-muted-foreground mb-2">Insurance Reserve</span>
					{#if isLoadingBalances}
						<div class="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
					{:else}
						<span class="text-3xl font-bold text-foreground tracking-tight">{formatCurrency(insuranceBalance)}</span>
					{/if}
				</div>
			</div>

			<!-- Distribution Form -->
			<div class="bg-card border border-border/50 rounded-3xl p-6 shadow-sm">
				<h2 class="text-xl font-bold text-foreground mb-4">Make Distribution</h2>
				<div class="space-y-4">
					<div class="space-y-2">
						<label class="text-sm font-medium text-foreground">Distribution Type</label>
						<select
							bind:value={profitDistributionType}
							class="w-full h-11 px-4 bg-background border border-border/60 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-shadow"
						>
							<option value={0}>Insurance Reserve</option>
							<option value={1}>Withdrawal</option>
						</select>
					</div>

					<div class="space-y-2">
						<label class="text-sm font-medium text-foreground">Amount ($)</label>
						<input
							type="number"
							min="0.01"
							step="0.01"
							bind:value={profitDistributionAmount}
							placeholder="0.00"
							class="w-full h-11 px-4 bg-background border border-border/60 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-shadow"
						/>
					</div>

					<button
						onclick={submitDistribution}
						disabled={isSubmittingDistribution || profitDistributionAmount <= 0 || profitDistributionAmount > availableBalance}
						class="w-full h-11 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-xl transition-colors flex justify-center items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed mt-4"
					>
						{#if isSubmittingDistribution}
							<div class="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin"></div>
						{:else}
							<Save size={16} />
							Submit
						{/if}
					</button>
				</div>
			</div>
		</div>

		<!-- Right Column: Tables -->
		<div class="lg:col-span-2 space-y-6">
			
			<!-- Past Distributions -->
			<Collapsible.Root
				bind:open={isDistributionsOpen}
				class="bg-card border border-border/50 rounded-3xl shadow-sm overflow-hidden flex flex-col"
			>
				<div class="p-4 md:p-6 border-b border-border/50 flex flex-col sm:flex-row sm:items-center justify-between w-full bg-card/50 gap-4">
					<div class="flex items-center gap-3">
						<h2 class="text-xl font-bold text-foreground">Past Distributions</h2>
						<span class="px-2.5 py-0.5 rounded-full bg-secondary text-secondary-foreground text-sm font-semibold">
							{profitDistributions.length}
						</span>
					</div>
					<div class="flex items-center gap-3 w-full sm:w-auto">
						<input type="date" bind:value={distStartDate} onchange={loadDistributions} class="h-9 px-3 rounded-lg border border-border/60 bg-background text-sm flex-1 sm:flex-none">
						<span class="text-muted-foreground">-</span>
						<input type="date" bind:value={distEndDate} onchange={loadDistributions} class="h-9 px-3 rounded-lg border border-border/60 bg-background text-sm flex-1 sm:flex-none">
						<Collapsible.Trigger class="p-2 bg-secondary/50 hover:bg-secondary rounded-lg transition-colors text-foreground">
							{#if isDistributionsOpen}
								<ChevronUp size={20} />
							{:else}
								<ChevronDown size={20} />
							{/if}
						</Collapsible.Trigger>
					</div>
				</div>

				<Collapsible.Content class="w-full overflow-x-auto">
					{#if isDistributionsLoading}
						<div class="p-12 flex justify-center">
							<div class="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
						</div>
					{:else if profitDistributions.length === 0}
						<div class="p-12 text-center text-muted-foreground">No profit distributions found.</div>
					{:else}
						<table class="w-full text-sm text-left">
							<thead class="text-xs text-muted-foreground uppercase bg-secondary/20 border-b border-border/50">
								<tr>
									<th class="px-6 py-4 font-semibold tracking-wider">Date</th>
									<th class="px-6 py-4 font-semibold tracking-wider">Type</th>
									<th class="px-6 py-4 font-semibold tracking-wider text-right">Amount</th>
								</tr>
							</thead>
							<tbody class="divide-y divide-border/50">
								{#each profitDistributions as dist}
									<tr class="bg-card hover:bg-secondary/10 transition-colors">
										<td class="px-6 py-4 text-foreground font-medium">{formatDate(dist.date)}</td>
										<td class="px-6 py-4 text-muted-foreground">
											<span class="px-2.5 py-1 rounded-full text-xs font-semibold {dist.distributionTypeName === 'Insurance' ? 'bg-blue-500/10 text-blue-600' : 'bg-emerald-500/10 text-emerald-600'}">
												{dist.distributionTypeName}
											</span>
										</td>
										<td class="px-6 py-4 font-bold text-foreground text-right">{formatCurrency(dist.amount)}</td>
									</tr>
								{/each}
							</tbody>
						</table>
					{/if}
				</Collapsible.Content>
			</Collapsible.Root>

			<!-- Insurance Payouts -->
			<Collapsible.Root
				bind:open={isPayoutsOpen}
				class="bg-card border border-border/50 rounded-3xl shadow-sm overflow-hidden flex flex-col"
			>
				<div class="p-4 md:p-6 border-b border-border/50 flex flex-col sm:flex-row sm:items-center justify-between w-full bg-card/50 gap-4">
					<div class="flex items-center gap-3">
						<h2 class="text-xl font-bold text-foreground">Insurance Payouts</h2>
						<span class="px-2.5 py-0.5 rounded-full bg-secondary text-secondary-foreground text-sm font-semibold">
							{insurancePayouts.length}
						</span>
					</div>
					<div class="flex items-center gap-3 w-full sm:w-auto">
						<input type="date" bind:value={payoutStartDate} onchange={loadPayouts} class="h-9 px-3 rounded-lg border border-border/60 bg-background text-sm flex-1 sm:flex-none">
						<span class="text-muted-foreground">-</span>
						<input type="date" bind:value={payoutEndDate} onchange={loadPayouts} class="h-9 px-3 rounded-lg border border-border/60 bg-background text-sm flex-1 sm:flex-none">
						<Collapsible.Trigger class="p-2 bg-secondary/50 hover:bg-secondary rounded-lg transition-colors text-foreground">
							{#if isPayoutsOpen}
								<ChevronUp size={20} />
							{:else}
								<ChevronDown size={20} />
							{/if}
						</Collapsible.Trigger>
					</div>
				</div>

				<Collapsible.Content class="w-full overflow-x-auto">
					{#if isPayoutsLoading}
						<div class="p-12 flex justify-center">
							<div class="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
						</div>
					{:else if insurancePayouts.length === 0}
						<div class="p-12 text-center text-muted-foreground">No insurance payouts found.</div>
					{:else}
						<table class="w-full text-sm text-left">
							<thead class="text-xs text-muted-foreground uppercase bg-secondary/20 border-b border-border/50">
								<tr>
									<th class="px-6 py-4 font-semibold tracking-wider">Date</th>
									<th class="px-6 py-4 font-semibold tracking-wider">Ticker</th>
									<th class="px-6 py-4 font-semibold tracking-wider">Buy Price</th>
									<th class="px-6 py-4 font-semibold tracking-wider">Sell Price</th>
									<th class="px-6 py-4 font-semibold tracking-wider text-right">Covered Loss</th>
								</tr>
							</thead>
							<tbody class="divide-y divide-border/50">
								{#each insurancePayouts as payout}
									<tr class="bg-card hover:bg-secondary/10 transition-colors">
										<td class="px-6 py-4 text-muted-foreground">{formatDate(payout.date)}</td>
										<td class="px-6 py-4 font-bold text-foreground">{payout.ticker}</td>
										<td class="px-6 py-4 text-muted-foreground">{formatCurrency(payout.buyPrice)}</td>
										<td class="px-6 py-4 text-muted-foreground">{formatCurrency(payout.sellPrice)}</td>
										<td class="px-6 py-4 font-bold text-red-600 text-right">{formatCurrency(payout.coveredAmount)}</td>
									</tr>
								{/each}
							</tbody>
						</table>
					{/if}
				</Collapsible.Content>
			</Collapsible.Root>

		</div>
	</div>
</div>
