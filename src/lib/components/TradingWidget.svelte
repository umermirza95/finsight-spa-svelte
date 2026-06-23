<script lang="ts">
	import { onMount } from 'svelte';
	import Chart from 'chart.js/auto';
	import Speedometer from '$lib/components/ui/Speedometer.svelte';

	let canvas: HTMLCanvasElement;
	let chartInstance: Chart | null = null;

	let isLoading = $state(true);
	let errorMessage = $state('');

	let totalCapital = $state(0);
	let capitalUsed = $state(0);
	let availableTranches = $state(0);
	
	let monthlyProfits = $state<number[]>(Array(12).fill(0));
	const currentYear = new Date().getFullYear();

	async function fetchData() {
		isLoading = true;
		errorMessage = '';
		try {
			const token = localStorage.getItem('authToken');
			if (!token) throw new Error('Not authenticated');

			// Fetch Open Trades for Capital Metrics
			const openRes = await fetch('/api/Trading/open', {
				headers: { Authorization: `Bearer ${token}` }
			});
			if (!openRes.ok) throw new Error('Failed to fetch capital metrics');
			const openData = await openRes.json();
			
			if (!Array.isArray(openData)) {
				totalCapital = openData.totalCapital || 0;
				capitalUsed = openData.capitalUsed || 0;
				availableTranches = openData.availableTranches || 0;
			}

			// Fetch Closed Trades for Profit Graph
			const fromDate = `${currentYear}-01-01`;
			const toDate = `${currentYear}-12-31`;
			const closedRes = await fetch(`/api/Trading/closed?startDate=${fromDate}&endDate=${toDate}`, {
				headers: { Authorization: `Bearer ${token}` }
			});
			
			if (!closedRes.ok) throw new Error('Failed to fetch closed trades');
			const closedDataResponse = await closedRes.json();
			const closedTrades = Array.isArray(closedDataResponse) ? closedDataResponse : (closedDataResponse.data || []);

			// Group by month
			const newProfits = Array(12).fill(0);
			for (const t of closedTrades) {
				const date = new Date(t.closeDate);
				if (date.getFullYear() === currentYear) {
					newProfits[date.getMonth()] += (t.netProfit || 0);
				}
			}
			monthlyProfits = newProfits;

			updateChart();
		} catch (error: any) {
			errorMessage = error.message;
		} finally {
			isLoading = false;
		}
	}

	function updateChart() {
		if (!canvas) return;

		const computedStyle = getComputedStyle(document.documentElement);
		const getHsl = (varName: string) => `hsl(${computedStyle.getPropertyValue(varName).trim()})`;
		
		const colorPrimary = getHsl('--primary');

		// Differentiate colors for positive and negative profits
		const backgroundColors = monthlyProfits.map(p => p >= 0 ? '#22c55e' : '#ef4444');

		if (chartInstance) {
			chartInstance.data.datasets[0].data = [...monthlyProfits];
			chartInstance.data.datasets[0].borderColor = backgroundColors;
			chartInstance.data.datasets[0].backgroundColor = backgroundColors;
			chartInstance.update();
		} else {
			chartInstance = new Chart(canvas, {
				type: 'line',
				data: {
					labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
					datasets: [
						{
							label: 'Net Profit',
							data: [...monthlyProfits],
							borderColor: backgroundColors,
							backgroundColor: backgroundColors,
							borderWidth: 2,
							tension: 0.3,
							pointBackgroundColor: backgroundColors,
							pointBorderColor: backgroundColors,
							pointRadius: 4,
							pointHoverRadius: 6
						}
					]
				},
				options: {
					responsive: true,
					maintainAspectRatio: false,
					plugins: {
						legend: {
							display: false
						},
						tooltip: {
							mode: 'index',
							intersect: false,
							callbacks: {
								label: function(context) {
									let label = context.dataset.label || '';
									if (label) {
										label += ': ';
									}
									if (context.parsed.y !== null) {
										label += new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(context.parsed.y);
									}
									return label;
								}
							}
						}
					},
					scales: {
						x: {
							grid: {
								display: false,
							},
							border: {
								display: false
							},
							ticks: {
								color: 'hsl(var(--muted-foreground))',
								font: {
									size: 11
								}
							}
						},
						y: {
							display: false,
							grid: {
								display: false
							}
						}
					},
					interaction: {
						mode: 'index',
						intersect: false,
					},
				}
			});
		}
	}

	onMount(() => {
		fetchData();
		return () => {
			if (chartInstance) {
				chartInstance.destroy();
			}
		};
	});

	function formatCurrency(amount: number) {
		return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
	}

</script>

<div class="bg-card border border-border/50 rounded-3xl p-6 md:p-8 flex flex-col shadow-sm">
	<div class="flex items-center justify-between mb-8">
		<h2 class="text-xl md:text-2xl font-bold text-foreground">Trading Performance</h2>
		<span class="px-3 py-1 bg-secondary/30 rounded-full text-sm font-medium text-foreground">{currentYear}</span>
	</div>

	<div class="flex flex-col xl:flex-row gap-8">
		<!-- Chart area -->
		<div class="w-full xl:w-2/3 relative h-[200px] md:h-[240px]">
			{#if isLoading && !chartInstance}
				<div class="absolute inset-0 flex items-center justify-center">
					<div class="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
				</div>
			{/if}
			
			{#if errorMessage}
				<div class="absolute inset-0 flex items-center justify-center text-destructive text-sm bg-card/80 backdrop-blur-sm z-10">
					{errorMessage}
				</div>
			{/if}

			<canvas bind:this={canvas} class="w-full h-full {isLoading ? 'opacity-50' : 'opacity-100'} transition-opacity"></canvas>
		</div>

		<!-- Capital Metrics area -->
		<div class="w-full xl:w-1/3 flex flex-col justify-center items-center p-6 bg-secondary/10 rounded-2xl border border-border/40">
			{#if totalCapital > 0}
				<h3 class="text-sm font-semibold text-muted-foreground mb-6 uppercase tracking-wider">Capital Deployment</h3>
				<Speedometer value={capitalUsed} max={totalCapital} />
				<div class="mt-6 flex flex-col items-center gap-1">
					<span class="text-2xl font-bold text-foreground">{formatCurrency(capitalUsed)}</span>
					<span class="text-sm text-muted-foreground">of {formatCurrency(totalCapital)}</span>
				</div>
				
				<div class="w-full h-px bg-border/50 my-6"></div>

				<div class="flex flex-col items-center">
					<span class="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Available Tranches</span>
					<span class="text-3xl font-black text-foreground">{availableTranches}</span>
				</div>
			{:else}
				<div class="text-center text-muted-foreground text-sm">
					Trading capital not configured.
				</div>
			{/if}
		</div>
	</div>
</div>
