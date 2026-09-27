<script lang="ts">
	import { onMount } from "svelte";
	import { apiFetch } from "$lib/api";
	import IncomeExpenseChart from "$lib/components/IncomeExpenseChart.svelte";
	import TradingWidget from "$lib/components/TradingWidget.svelte";
	import CategoryExpenseLineChart from "$lib/components/CategoryExpenseLineChart.svelte";
	import CategoryAverageExpensePieChart from "$lib/components/CategoryAverageExpensePieChart.svelte";

	let currentYearTransactions = $state<any[] | null>(null);

	onMount(async () => {
		try {
			const token = localStorage.getItem("authToken");
			if (!token) {
				currentYearTransactions = [];
				return;
			}
			const currentYear = new Date().getFullYear();
			const fromDate = `${currentYear}-01-01`;
			const toDate = `${currentYear}-12-31`;

			const response = await apiFetch(`/api/Transactions?From=${fromDate}&To=${toDate}`, {
				headers: { Authorization: `Bearer ${token}` }
			});

			if (response.ok) {
				const json = await response.json();
				currentYearTransactions = json.data?.transactions || [];
			} else {
				currentYearTransactions = [];
			}
		} catch (error) {
			console.error(error);
			currentYearTransactions = [];
		}
	});
</script>

<div class="space-y-6">
	<div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
		{#if currentYearTransactions !== null}
			<!-- Render the Income and Expense Chart Component -->
			<IncomeExpenseChart initialTransactions={currentYearTransactions} />
		{:else}
			<div class="bg-card border border-border/50 rounded-3xl p-6 flex items-center justify-center h-full min-h-[350px]">
				<div class="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
			</div>
		{/if}
		<!-- Render the Trading Widget Component -->
		<TradingWidget />
	</div>
	
	<div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
		{#if currentYearTransactions !== null}
			<!-- Category Expense Line Chart -->
			<CategoryExpenseLineChart initialTransactions={currentYearTransactions} />
			<!-- Category Average Expense Pie Chart -->
			<CategoryAverageExpensePieChart initialTransactions={currentYearTransactions} />
		{:else}
			<div class="bg-card border border-border/50 rounded-3xl p-6 flex items-center justify-center h-full min-h-[350px]">
				<div class="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
			</div>
			<div class="bg-card border border-border/50 rounded-3xl p-6 flex items-center justify-center h-full min-h-[350px]">
				<div class="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
			</div>
		{/if}
	</div>
</div>
