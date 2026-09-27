<script lang="ts">
	import { onMount } from 'svelte';
	import Chart from 'chart.js/auto';
	import { ChevronDown } from 'lucide-svelte';
	import { apiFetch } from '$lib/api';

	let canvas: HTMLCanvasElement;
	let chartInstance: Chart | null = null;
	
	const currentYear = new Date().getFullYear();
	let selectedYear = $state(currentYear);
	
	const years = Array.from(
		{ length: currentYear - 2024 + 1 }, 
		(_, i) => currentYear - i
	);

	let isDropdownOpen = $state(false);
	let isLoading = $state(true);
	let errorMessage = $state('');

	let allCategories = $state<any[]>([]);
	let transactions = $state<any[]>([]);

	async function fetchCategories() {
		try {
			const token = localStorage.getItem('authToken');
			if (!token) return;
			const res = await apiFetch('/api/Category', {
				headers: { 'Authorization': `Bearer ${token}` }
			});
			if (res.ok) {
				const json = await res.json();
				allCategories = json.data?.categories || [];
			}
		} catch (e) {
			console.error(e);
		}
	}

	async function fetchTransactionsForYear(year: number) {
		isLoading = true;
		errorMessage = '';
		try {
			const token = localStorage.getItem('authToken');
			if (!token) throw new Error('Not authenticated');

			const fromDate = `${year}-01-01`;
			const toDate = `${year}-12-31`;

			const response = await apiFetch(`/api/Transactions?From=${fromDate}&To=${toDate}&Type=1`, {
				headers: { 'Authorization': `Bearer ${token}` }
			});

			if (!response.ok) throw new Error('Failed to fetch transactions');

			const json = await response.json();
			transactions = json.data?.transactions || [];
			
			updateChart();
		} catch (error: any) {
			errorMessage = error.message;
		} finally {
			isLoading = false;
		}
	}

	function updateChart() {
		if (!canvas) return;

		const categoryTotals = new Map<string, number>();

		transactions.forEach(t => {
			if (t.type === 'Expense' || t.type === 'expense' || t.type === 1) {
				if (t.categoryId) {
					const amount = Math.abs(parseFloat(t.amount));
					const current = categoryTotals.get(t.categoryId) || 0;
					categoryTotals.set(t.categoryId, current + amount);
				}
			}
		});

		const labels: string[] = [];
		const data: number[] = [];
		const backgroundColor: string[] = [];
		
		const palette = [
			"#3b82f6", "#ef4444", "#10b981", "#f59e0b", "#8b5cf6",
			"#ec4899", "#06b6d4", "#14b8a6", "#f43f5e", "#84cc16",
		];
		
		let colorIndex = 0;

		const currentYearNow = new Date().getFullYear();
		const monthsPassed = selectedYear < currentYearNow ? 12 : (new Date().getMonth() + 1);

		categoryTotals.forEach((totalAmount, categoryId) => {
			const cat = allCategories.find(c => c.id === categoryId);
			if (cat) {
				labels.push(cat.name);
				data.push(totalAmount / monthsPassed); // Average monthly spenditure
				backgroundColor.push(palette[colorIndex % palette.length]);
				colorIndex++;
			}
		});

		if (chartInstance) {
			chartInstance.data.labels = labels;
			chartInstance.data.datasets[0].data = data;
			chartInstance.data.datasets[0].backgroundColor = backgroundColor;
			chartInstance.update();
		} else {
			chartInstance = new Chart(canvas, {
				type: 'pie',
				data: {
					labels: labels,
					datasets: [{
						data: data,
						backgroundColor: backgroundColor,
						borderWidth: 0,
						hoverOffset: 4,
					}]
				},
				options: {
					responsive: true,
					maintainAspectRatio: false,
					plugins: {
						legend: {
							display: true,
							position: 'right',
							labels: {
								usePointStyle: true,
								boxWidth: 8,
								font: {
									family: "'Inter', sans-serif",
									size: 11
								},
								color: 'hsl(var(--foreground))'
							}
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
								label: function(context) {
									let label = context.label || '';
									if (label) {
										label += ': ';
									}
									if (context.parsed !== null) {
										label += new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(context.parsed);
									}
									return label;
								}
							}
						}
					}
				}
			});
		}
	}

	$effect(() => {
		fetchTransactionsForYear(selectedYear);
	});

	function handleYearSelect(year: number) {
		selectedYear = year;
		isDropdownOpen = false;
	}

	function handleOutsideClick(event: MouseEvent) {
		const target = event.target as HTMLElement;
		if (!target.closest('.year-dropdown-container')) {
			isDropdownOpen = false;
		}
	}

	onMount(() => {
		fetchCategories().then(() => {
			if (transactions.length > 0) {
				updateChart();
			}
		});
		document.addEventListener('click', handleOutsideClick);
		return () => {
			document.removeEventListener('click', handleOutsideClick);
			if (chartInstance) {
				chartInstance.destroy();
			}
		};
	});
</script>

<div class="bg-card border border-border/50 rounded-3xl p-6 md:p-8 flex flex-col shadow-sm h-full min-h-[350px]">
	<!-- Header -->
	<div class="flex items-center justify-between mb-8 relative year-dropdown-container">
		<h2 class="text-xl md:text-2xl font-bold text-foreground">Avg Monthly Spend</h2>
		
		<div class="relative">
			<button 
				onclick={() => isDropdownOpen = !isDropdownOpen}
				class="flex items-center gap-2 px-4 py-2 bg-secondary/30 hover:bg-secondary/60 rounded-full text-sm font-medium transition-colors"
			>
				{selectedYear}
				<ChevronDown size={16} class="text-muted-foreground" />
			</button>

			{#if isDropdownOpen}
				<div class="absolute right-0 top-full mt-2 w-32 bg-popover border border-border/50 rounded-xl shadow-lg overflow-hidden z-20 flex flex-col p-1">
					{#each years as year}
						<button 
							onclick={() => handleYearSelect(year)}
							class="w-full text-left px-3 py-2 text-sm rounded-lg hover:bg-secondary/50 transition-colors {year === selectedYear ? 'bg-secondary/30 font-semibold text-primary' : 'text-muted-foreground'}"
						>
							{year}
						</button>
					{/each}
				</div>
			{/if}
		</div>
	</div>

	<!-- Chart area -->
	<div class="w-full relative flex-1 min-h-[220px] flex items-center justify-center">
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

		{#if chartInstance && chartInstance.data.datasets[0].data.length === 0 && !isLoading}
			<div class="absolute inset-0 flex items-center justify-center text-muted-foreground text-sm z-10">
				No expense data found for this year.
			</div>
		{/if}

		<div class="relative w-full max-w-[320px] aspect-square">
			<canvas bind:this={canvas} class="w-full h-full {isLoading ? 'opacity-50' : 'opacity-100'} transition-opacity drop-shadow-[0_10px_10px_rgba(0,0,0,0.1)] hover:scale-105 duration-300"></canvas>
		</div>
	</div>
</div>
