<script lang="ts">
	import IncomeExpenseChart from "$lib/components/IncomeExpenseChart.svelte";
	import TradingWidget from "$lib/components/TradingWidget.svelte";
	import CapitalWidget from "$lib/components/CapitalWidget.svelte";
</script>

<div class="space-y-6">
	<div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
		<!-- Render the Income and Expense Chart Component -->
		<IncomeExpenseChart />
		<!-- Render the Trading Widget Component -->
		<TradingWidget />
	</div>
	
	<!-- Render the Capital Metrics Widget Component on a new line -->
	<CapitalWidget />
</div>
