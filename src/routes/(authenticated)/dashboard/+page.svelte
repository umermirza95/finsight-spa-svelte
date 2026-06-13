<script lang="ts">
	import IncomeExpenseChart from "$lib/components/IncomeExpenseChart.svelte";
</script>

<div class="space-y-6">
	<div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
		<!-- Render the Income and Expense Chart Component -->
		<IncomeExpenseChart />
		<!-- Placeholder for future components -->
		<div class="hidden lg:block border border-dashed border-border/50 rounded-3xl opacity-50"></div>
	</div>
</div>
