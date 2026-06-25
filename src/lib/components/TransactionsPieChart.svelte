<script lang="ts">
	import { onMount } from "svelte";
	import Chart from "chart.js/auto";

	let { transactions = [], categories = [] } = $props<{
		transactions: any[];
		categories: any[];
	}>();

	let chartCanvas: HTMLCanvasElement;
	let chartInstance: Chart | null = null;

	let typeSelection = $state<"Expense" | "Income">("Expense");

	let chartData = $derived.by(() => {
		const categoryTotals = new Map<string, number>();

		transactions.forEach((tx) => {
			const isExpense =
				tx.type === "Expense" || tx.type === 1 || tx.type === "expense";
			const isIncome =
				tx.type === "Income" || tx.type === 0 || tx.type === "income";

			const matchesType =
				typeSelection === "Expense" ? isExpense : isIncome;

			if (matchesType) {
				const current = categoryTotals.get(tx.categoryId) || 0;
				categoryTotals.set(
					tx.categoryId,
					current + parseFloat(tx.amount),
				);
			}
		});

		const labels: string[] = [];
		const data: number[] = [];
		const colors: string[] = [];

		// Vibrant color palette
		const palette = [
			"#3b82f6",
			"#ef4444",
			"#10b981",
			"#f59e0b",
			"#8b5cf6",
			"#ec4899",
			"#06b6d4",
			"#14b8a6",
			"#f43f5e",
			"#84cc16",
		];

		let colorIndex = 0;

		categoryTotals.forEach((amount, categoryId) => {
			const cat = categories.find((c) => c.id === categoryId);
			labels.push(cat ? cat.name : "Unknown");
			data.push(amount);
			colors.push(palette[colorIndex % palette.length]);
			colorIndex++;
		});

		return { labels, data, colors };
	});

	function createChart() {
		if (chartInstance) {
			chartInstance.destroy();
		}

		if (!chartCanvas || chartData.data.length === 0) return;

		chartInstance = new Chart(chartCanvas, {
			type: "pie",
			data: {
				labels: chartData.labels,
				datasets: [
					{
						data: chartData.data,
						backgroundColor: chartData.colors,
						borderWidth: 0,
						hoverOffset: 4,
					},
				],
			},
			options: {
				responsive: true,
				maintainAspectRatio: false,
				plugins: {
					legend: {
						display: false,
					},
					tooltip: {
						backgroundColor: "rgba(0, 0, 0, 0.8)",
						padding: 12,
						titleFont: {
							family: "'Inter', sans-serif",
							size: 13,
						},
						bodyFont: {
							family: "'Inter', sans-serif",
							size: 14,
							weight: "bold",
						},
						callbacks: {
							label: function (context) {
								let label = context.label || "";
								if (label) {
									label += ": ";
								}
								if (context.parsed !== null) {
									label += new Intl.NumberFormat("en-US", {
										style: "currency",
										currency: "USD",
									}).format(context.parsed);
								}
								return label;
							},
						},
					},
				},
			},
		});
	}

	$effect(() => {
		// Re-create chart when data changes
		const _ = chartData;
		if (chartCanvas) {
			createChart();
		}
	});

	onMount(() => {
		createChart();
		return () => {
			if (chartInstance) {
				chartInstance.destroy();
			}
		};
	});
</script>

<div class="w-full flex flex-col gap-6 h-full pb-4">
	<!-- Radio Buttons (Segmented Control) -->
	<div
		class="flex items-center justify-center p-1.5 bg-secondary/30 rounded-xl w-full max-w-[280px] mx-auto gap-1 shadow-inner"
	>
		<button
			onclick={() => (typeSelection = "Expense")}
			class="flex-1 py-2 text-sm font-bold text-center rounded-lg transition-all duration-200 {typeSelection ===
			'Expense'
				? 'bg-background shadow text-foreground scale-[1.02]'
				: 'text-muted-foreground hover:text-foreground hover:bg-background/50'}"
		>
			Expense
		</button>
		<button
			onclick={() => (typeSelection = "Income")}
			class="flex-1 py-2 text-sm font-bold text-center rounded-lg transition-all duration-200 {typeSelection ===
			'Income'
				? 'bg-background shadow text-foreground scale-[1.02]'
				: 'text-muted-foreground hover:text-foreground hover:bg-background/50'}"
		>
			Income
		</button>
	</div>

	<div class="w-full flex-1 flex flex-col items-center justify-center">
		{#if chartData.data.length === 0}
			<div
				class="text-muted-foreground text-sm flex flex-col items-center gap-2 my-auto"
			>
				<svg
					class="w-10 h-10 opacity-20"
					xmlns="http://www.w3.org/2000/svg"
					width="24"
					height="24"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"
					><path d="M21.21 15.89A10 10 0 1 1 8 2.83" /><path
						d="M22 12A10 10 0 0 0 12 2v10z"
					/></svg
				>
				No {typeSelection.toLowerCase()} data to display
			</div>
		{:else}
			<div class="w-full flex flex-col items-center gap-6">
				<!-- Canvas with 3D drop-shadow effect -->
				<div class="relative w-full max-w-[280px] aspect-square">
					<canvas
						bind:this={chartCanvas}
						class="drop-shadow-[0_15px_15px_rgba(0,0,0,0.15)] transition-transform duration-500 hover:scale-105 hover:drop-shadow-[0_20px_25px_rgba(0,0,0,0.2)]"
					></canvas>
				</div>

				<!-- Total -->
				<div
					class="flex flex-col items-center justify-center bg-secondary/10 px-6 py-3 rounded-2xl border border-border/50"
				>
					<span
						class="text-xs text-muted-foreground font-bold uppercase tracking-widest mb-0.5"
						>Total {typeSelection}</span
					>
					<span class="text-2xl font-extrabold text-foreground">
						{new Intl.NumberFormat("en-US", {
							style: "currency",
							currency: "USD",
							maximumFractionDigits: 0,
						}).format(chartData.data.reduce((a, b) => a + b, 0))}
					</span>
				</div>
			</div>
		{/if}
	</div>
</div>
