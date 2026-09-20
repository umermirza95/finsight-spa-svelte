<script lang="ts">
	import { onMount } from 'svelte';
	import Chart from 'chart.js/auto';
	import { apiFetch } from '$lib/api';

	let canvas: HTMLCanvasElement;
	let chartInstance: Chart | null = null;

	let isLoading = $state(true);
	let errorMessage = $state('');
	
	let monthlyEarned = $state<number[]>(Array(12).fill(0));
	let monthlyKept = $state<number[]>(Array(12).fill(0));
	const currentYear = new Date().getFullYear();

	async function fetchData() {
		isLoading = true;
		errorMessage = '';
		try {
			const token = localStorage.getItem('authToken');
			if (!token) throw new Error('Not authenticated');

			// Fetch Monthly Profits
			const fromDate = `${currentYear}-01-01`;
			const toDate = `${currentYear}-12-31`;
			const res = await apiFetch(`/api/Trading/monthly-profits?startDate=${fromDate}&endDate=${toDate}`, {
				headers: { Authorization: `Bearer ${token}` }
			});
			
			if (!res.ok) throw new Error('Failed to fetch monthly profits');
			const data = await res.json();
			
			monthlyEarned = data.earned || Array(12).fill(0);
			monthlyKept = data.kept || Array(12).fill(0);

			updateChart();
		} catch (error: any) {
			errorMessage = error.message;
		} finally {
			isLoading = false;
		}
	}

	function updateChart() {
		if (!canvas) return;
		const ctx = canvas.getContext('2d');
		if (!ctx) return;

		// Create smooth gradients for a premium look
		const height = canvas.height || 240;
		const earnedGradient = ctx.createLinearGradient(0, 0, 0, height);
		earnedGradient.addColorStop(0, 'rgba(59, 130, 246, 0.25)'); // Blue fading
		earnedGradient.addColorStop(1, 'rgba(59, 130, 246, 0)');

		const keptGradient = ctx.createLinearGradient(0, 0, 0, height);
		keptGradient.addColorStop(0, 'rgba(16, 185, 129, 0.3)'); // Emerald fading
		keptGradient.addColorStop(1, 'rgba(16, 185, 129, 0)');

		const earnedColor = '#3b82f6';
		const keptColor = '#10b981';

		if (chartInstance) {
			chartInstance.data.datasets[0].data = [...monthlyEarned];
			chartInstance.data.datasets[1].data = [...monthlyKept];
			chartInstance.update();
		} else {
			chartInstance = new Chart(canvas, {
				type: 'line',
				data: {
					labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
					datasets: [
						{
							label: 'Earned',
							data: [...monthlyEarned],
							borderColor: earnedColor,
							backgroundColor: earnedGradient,
							borderWidth: 2,
							tension: 0.4,
							fill: true,
							pointRadius: 0,
							pointHoverRadius: 6,
							pointBackgroundColor: earnedColor,
							pointBorderColor: '#ffffff',
							pointBorderWidth: 2
						},
						{
							label: 'Kept',
							data: [...monthlyKept],
							borderColor: keptColor,
							backgroundColor: keptGradient,
							borderWidth: 3,
							tension: 0.4,
							fill: true,
							pointRadius: 0,
							pointHoverRadius: 6,
							pointBackgroundColor: keptColor,
							pointBorderColor: '#ffffff',
							pointBorderWidth: 2
						}
					]
				},
				options: {
					responsive: true,
					maintainAspectRatio: false,
					plugins: {
						legend: {
							display: false // Hidden legend as requested
						},
						tooltip: {
							mode: 'index',
							intersect: false,
							backgroundColor: 'rgba(15, 23, 42, 0.9)',
							titleColor: '#ffffff',
							bodyColor: '#e2e8f0',
							borderColor: 'rgba(255, 255, 255, 0.1)',
							borderWidth: 1,
							padding: 12,
							usePointStyle: true,
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
									size: 11,
									family: "'Inter', sans-serif"
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
