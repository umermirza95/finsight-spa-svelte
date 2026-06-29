<script lang="ts">
	import { onMount } from 'svelte';
	import Chart from 'chart.js/auto';

	let canvas: HTMLCanvasElement;
	let chartInstance: Chart | null = null;

	let isLoading = $state(true);
	let errorMessage = $state('');
	
	let monthlyProfits = $state<number[]>(Array(12).fill(0));
	const currentYear = new Date().getFullYear();

	async function fetchData() {
		isLoading = true;
		errorMessage = '';
		try {
			const token = localStorage.getItem('authToken');
			if (!token) throw new Error('Not authenticated');

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
</script>

<div class="bg-card border border-border/50 rounded-3xl p-6 md:p-8 flex flex-col shadow-sm">
	<div class="flex items-center justify-between mb-8">
		<h2 class="text-xl md:text-2xl font-bold text-foreground">Trading Performance</h2>
		<span class="px-3 py-1 bg-secondary/30 rounded-full text-sm font-medium text-foreground">{currentYear}</span>
	</div>

	<!-- Chart area -->
	<div class="w-full relative h-[200px] md:h-[240px]">
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
</div>
