<script lang="ts">
	import { onMount } from 'svelte';
	import Chart from 'chart.js/auto';
	import { ChevronDown } from 'lucide-svelte';

	let canvas: HTMLCanvasElement;
	let chartInstance: Chart | null = null;
	
	const currentYear = new Date().getFullYear();
	let selectedYear = $state(currentYear);
	
	// Create a list of years from current year down to 2024
	const years = Array.from(
		{ length: currentYear - 2024 + 1 }, 
		(_, i) => currentYear - i
	);

	let isDropdownOpen = $state(false);
	let isLoading = $state(true);
	let errorMessage = $state('');

	let totalIncome = $state(0);
	let totalExpense = $state(0);

	// The monthly data arrays that feed the chart
	let monthlyIncome = $state<number[]>(Array(12).fill(0));
	let monthlyExpense = $state<number[]>(Array(12).fill(0));

	async function fetchTransactionsForYear(year: number) {
		isLoading = true;
		errorMessage = '';
		try {
			const token = localStorage.getItem('authToken');
			if (!token) {
				throw new Error('Not authenticated');
			}

			// Dates for the full year
			const fromDate = `${year}-01-01`;
			const toDate = `${year}-12-31`;

			const response = await fetch(`/api/Transactions?From=${fromDate}&To=${toDate}`, {
				headers: {
					'Authorization': `Bearer ${token}`
				}
			});

			if (!response.ok) {
				throw new Error('Failed to fetch transactions');
			}

			const json = await response.json();
			const transactions = json.data?.transactions || [];

			aggregateData(transactions);
			updateChart();
		} catch (error: any) {
			errorMessage = error.message;
		} finally {
			isLoading = false;
		}
	}

	function aggregateData(transactions: any[]) {
		const newIncome = Array(12).fill(0);
		const newExpense = Array(12).fill(0);
		let incomeSum = 0;
		let expenseSum = 0;

		for (const t of transactions) {
			const date = new Date(t.date || t.createdAt || t.transactionDate);
			const month = date.getMonth(); // 0 to 11
			const amount = parseFloat(t.amount);
			
			// t.type: 0 for Income, 1 for Expense, or check string if it's enum string
			const isIncome = t.type === 'Income' || t.type === 0 || t.type === 'income';
			
			if (isIncome) {
				newIncome[month] += amount;
				incomeSum += amount;
			} else {
				newExpense[month] += Math.abs(amount);
				expenseSum += Math.abs(amount);
			}
		}

		monthlyIncome = newIncome;
		monthlyExpense = newExpense;
		totalIncome = incomeSum;
		totalExpense = expenseSum;
	}

	function updateChart() {
		if (!canvas) return;

		// Get CSS variables for colors
		const computedStyle = getComputedStyle(document.documentElement);
		const getHsl = (varName: string) => `hsl(${computedStyle.getPropertyValue(varName).trim()})`;
		
		const colorPrimary = getHsl('--primary');
		const colorBrandBlue = getHsl('--brand-blue');

		if (chartInstance) {
			chartInstance.data.datasets[0].data = [...monthlyIncome];
			chartInstance.data.datasets[1].data = [...monthlyExpense];
			chartInstance.update();
		} else {
			chartInstance = new Chart(canvas, {
				type: 'bar',
				data: {
					labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
					datasets: [
						{
							label: 'Income',
							data: [...monthlyIncome],
							backgroundColor: colorPrimary,
							borderRadius: 4,
							barPercentage: 0.6,
							categoryPercentage: 0.8
						},
						{
							label: 'Expenses',
							data: [...monthlyExpense],
							backgroundColor: colorBrandBlue,
							borderRadius: 4,
							barPercentage: 0.6,
							categoryPercentage: 0.8
						}
					]
				},
				options: {
					responsive: true,
					maintainAspectRatio: false,
					plugins: {
						legend: {
							display: false // Custom legend is built in HTML
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
							display: false, // Hide Y axis as in the screenshot
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

	$effect(() => {
		fetchTransactionsForYear(selectedYear);
	});

	function handleYearSelect(year: number) {
		selectedYear = year;
		isDropdownOpen = false;
	}

	function toggleDropdown() {
		isDropdownOpen = !isDropdownOpen;
	}

	// Close dropdown when clicking outside
	function handleOutsideClick(event: MouseEvent) {
		const target = event.target as HTMLElement;
		if (!target.closest('.year-dropdown-container')) {
			isDropdownOpen = false;
		}
	}

	onMount(() => {
		document.addEventListener('click', handleOutsideClick);
		return () => {
			document.removeEventListener('click', handleOutsideClick);
			if (chartInstance) {
				chartInstance.destroy();
			}
		};
	});

</script>

<div class="bg-card border border-border/50 rounded-3xl p-6 md:p-8 flex flex-col shadow-sm">
	<!-- Header -->
	<div class="flex items-center justify-between mb-8 relative year-dropdown-container">
		<h2 class="text-xl md:text-2xl font-bold text-foreground">Income and Expense</h2>
		
		<div class="relative">
			<button 
				onclick={toggleDropdown}
				class="flex items-center gap-2 px-4 py-2 bg-secondary/30 hover:bg-secondary/60 rounded-full text-sm font-medium transition-colors"
			>
				{selectedYear === currentYear ? 'Current Year' : selectedYear}
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
