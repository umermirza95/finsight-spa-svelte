<script lang="ts">
	import { onMount, untrack } from 'svelte';
	import Chart from 'chart.js/auto';
	import { ChevronDown, Check } from 'lucide-svelte';
	import { apiFetch } from '$lib/api';

	let { initialTransactions = null, initialCategories = null } = $props<{ initialTransactions?: any[] | null, initialCategories?: any[] | null }>();

	let canvas: HTMLCanvasElement;
	let chartInstance: Chart | null = null;
	
	const currentYear = new Date().getFullYear();
	let selectedYear = $state(currentYear);
	
	const years = Array.from(
		{ length: currentYear - 2024 + 1 }, 
		(_, i) => currentYear - i
	);

	let isYearDropdownOpen = $state(false);
	let isCategoryDropdownOpen = $state(false);
	let isLoading = $state(true);
	let errorMessage = $state('');

	let allCategories = $state<any[]>([]);
	let selectedCategoryIds = $state<string[]>([]);
	let transactions = $state<any[]>([]);

	async function fetchTransactionsForYear(year: number) {
		isLoading = true;
		errorMessage = '';
		try {
			if (year === currentYear && initialTransactions !== null) {
				transactions = initialTransactions;
				updateChart();
				isLoading = false;
				return;
			}

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

	function toggleCategory(categoryId: string) {
		if (selectedCategoryIds.includes(categoryId)) {
			selectedCategoryIds = selectedCategoryIds.filter(id => id !== categoryId);
		} else {
			selectedCategoryIds = [...selectedCategoryIds, categoryId];
		}
	}

	function updateChart() {
		if (!canvas) return;

		const datasets: any[] = [];

		const palette = [
			"#3b82f6", "#ef4444", "#10b981", "#f59e0b", "#8b5cf6",
			"#ec4899", "#06b6d4", "#14b8a6", "#f43f5e", "#84cc16",
		];

		selectedCategoryIds.forEach((categoryId, index) => {
			const category = allCategories.find(c => c.id === categoryId);
			if (!category) return;

			const monthlyData = Array(12).fill(0);
			const categoryTx = transactions.filter(t => t.categoryId === categoryId && (t.type === 'Expense' || t.type === 'expense' || t.type === 1));

			categoryTx.forEach(t => {
				const date = new Date(t.date || t.createdAt || t.transactionDate);
				const month = date.getMonth();
				monthlyData[month] += Math.abs(parseFloat(t.amount));
			});

			datasets.push({
				label: category.name,
				data: monthlyData,
				borderColor: palette[index % palette.length],
				backgroundColor: palette[index % palette.length] + '33', // 20% opacity
				tension: 0.4,
				fill: true,
				borderWidth: 2,
				pointRadius: 3,
				pointHoverRadius: 6
			});
		});

		if (chartInstance) {
			chartInstance.data.datasets = datasets;
			chartInstance.update();
		} else {
			chartInstance = new Chart(canvas, {
				type: 'line',
				data: {
					labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
					datasets: datasets
				},
				options: {
					responsive: true,
					maintainAspectRatio: false,
					plugins: {
						legend: {
							display: true,
							position: 'bottom',
							labels: {
								usePointStyle: true,
								boxWidth: 8,
								font: {
									family: "'Inter', sans-serif",
									size: 11
								}
							}
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
						mode: 'nearest',
						axis: 'x',
						intersect: false,
					},
				}
			});
		}
	}

	$effect(() => {
		const year = selectedYear;
		untrack(() => {
			fetchTransactionsForYear(year);
		});
	});

	$effect(() => {
		// update chart when selected categories change
		const _ = selectedCategoryIds;
		untrack(() => {
			if (transactions.length > 0) {
				updateChart();
			}
		});
	});

	function handleYearSelect(year: number) {
		selectedYear = year;
		isYearDropdownOpen = false;
	}

	function handleOutsideClick(event: MouseEvent) {
		const target = event.target as HTMLElement;
		if (!target.closest('.year-dropdown-container')) {
			isYearDropdownOpen = false;
		}
		if (!target.closest('.category-dropdown-container')) {
			isCategoryDropdownOpen = false;
		}
	}

	onMount(() => {
		if (initialCategories !== null) {
			allCategories = initialCategories;
			if (allCategories.length > 0 && selectedCategoryIds.length === 0) {
				// Select first 3 categories by default
				selectedCategoryIds = allCategories.slice(0, 3).map(c => c.id);
			}
		}

		if (transactions.length > 0) {
			updateChart();
		}

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
	<div class="flex items-center justify-between mb-8 relative">
		<h2 class="text-xl md:text-2xl font-bold text-foreground">Category Expense</h2>
		
		<div class="flex gap-2">
			<!-- Category Selector -->
			<div class="relative category-dropdown-container">
				<button 
					onclick={() => isCategoryDropdownOpen = !isCategoryDropdownOpen}
					class="flex items-center gap-2 px-4 py-2 bg-secondary/30 hover:bg-secondary/60 rounded-full text-sm font-medium transition-colors"
				>
					Categories ({selectedCategoryIds.length})
					<ChevronDown size={16} class="text-muted-foreground" />
				</button>

				{#if isCategoryDropdownOpen}
					<div class="absolute right-0 top-full mt-2 w-56 bg-popover border border-border/50 rounded-xl shadow-lg overflow-hidden z-20 flex flex-col p-1 max-h-60 overflow-y-auto">
						{#each allCategories as category}
							<button 
								onclick={() => toggleCategory(category.id)}
								class="w-full flex items-center justify-between px-3 py-2 text-sm rounded-lg hover:bg-secondary/50 transition-colors text-muted-foreground"
							>
								<span>{category.name}</span>
								{#if selectedCategoryIds.includes(category.id)}
									<Check size={16} class="text-primary" />
								{/if}
							</button>
						{/each}
					</div>
				{/if}
			</div>

			<!-- Year Selector -->
			<div class="relative year-dropdown-container">
				<button 
					onclick={() => isYearDropdownOpen = !isYearDropdownOpen}
					class="flex items-center gap-2 px-4 py-2 bg-secondary/30 hover:bg-secondary/60 rounded-full text-sm font-medium transition-colors"
				>
					{selectedYear}
					<ChevronDown size={16} class="text-muted-foreground" />
				</button>

				{#if isYearDropdownOpen}
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
	</div>

	<!-- Chart area -->
	<div class="w-full relative flex-1 min-h-[220px]">
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

		{#if selectedCategoryIds.length === 0 && !isLoading}
			<div class="absolute inset-0 flex items-center justify-center text-muted-foreground text-sm z-10">
				Please select at least one category to view data.
			</div>
		{/if}

		<canvas bind:this={canvas} class="w-full h-full {isLoading ? 'opacity-50' : 'opacity-100'} transition-opacity"></canvas>
	</div>
</div>
