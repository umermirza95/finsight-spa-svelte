<script lang="ts">
	import IncomeExpenseChart from "$lib/components/IncomeExpenseChart.svelte";
	import TradingWidget from "$lib/components/TradingWidget.svelte";
</script>

<div class="space-y-6">
	<div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
		<!-- Render the Income and Expense Chart Component -->
		<IncomeExpenseChart />
		<!-- Render the Trading Widget Component -->
		<TradingWidget />
	</div>
</div>
