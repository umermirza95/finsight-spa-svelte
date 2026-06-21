<script lang="ts">
	import { onMount } from 'svelte';
	import { ChevronLeft, ChevronRight, Landmark, Banknote } from 'lucide-svelte';
	import BudgetCard from '$lib/components/BudgetCard.svelte';

	let isLoading = $state(true);
	let errorMessage = $state('');

	let budgets = $state<any[]>([]);
	let summary = $state({
		totalBudgetAmount: 0,
		totalConsumedAmount: 0,
		remainingAmount: 0,
		budgetCount: 0
	});

	// Date and Frequency State
	type Frequency = 'Weekly' | 'Monthly' | 'Yearly';
	let frequency = $state<Frequency>('Monthly');
	let currentDate = $state(new Date());

	let formattedTotalBudgeted = $derived(
		new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', notation: 'compact', compactDisplay: 'short' }).format(summary.totalBudgetAmount || 0)
	);

	let formattedTotalSpent = $derived(
		new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', notation: 'compact', compactDisplay: 'short' }).format(summary.totalConsumedAmount || 0)
	);

	let displayDate = $derived.by(() => {
		if (frequency === 'Monthly') {
			return currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
		} else if (frequency === 'Yearly') {
			return currentDate.toLocaleDateString('en-US', { year: 'numeric' });
		} else {
			// Weekly - show week range
			const startOfWeek = new Date(currentDate);
			startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());
			const endOfWeek = new Date(startOfWeek);
			endOfWeek.setDate(startOfWeek.getDate() + 6);
			
			const startStr = startOfWeek.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
			const endStr = endOfWeek.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
			return `${startStr} - ${endStr}`;
		}
	});

	function prevPeriod() {
		const newDate = new Date(currentDate);
		if (frequency === 'Monthly') {
			newDate.setMonth(newDate.getMonth() - 1);
		} else if (frequency === 'Yearly') {
			newDate.setFullYear(newDate.getFullYear() - 1);
		} else {
			newDate.setDate(newDate.getDate() - 7);
		}
		currentDate = newDate;
		// Later: trigger API fetch here
	}

	function nextPeriod() {
		const newDate = new Date(currentDate);
		if (frequency === 'Monthly') {
			newDate.setMonth(newDate.getMonth() + 1);
		} else if (frequency === 'Yearly') {
			newDate.setFullYear(newDate.getFullYear() + 1);
		} else {
			newDate.setDate(newDate.getDate() + 7);
		}
		currentDate = newDate;
		// Later: trigger API fetch here
	}

	function setFrequency(newFreq: Frequency) {
		frequency = newFreq;
		// Later: trigger API fetch here
	}

	async function fetchBudgets() {
		isLoading = true;
		errorMessage = '';
		try {
			const token = localStorage.getItem('authToken');
			if (!token) throw new Error('Not authenticated');

			// Later: append referenceDate and frequency params
			const res = await fetch('/api/Budget/active', {
				headers: { 'Authorization': `Bearer ${token}` }
			});

			if (!res.ok) {
				throw new Error('Failed to fetch budgets');
			}

			const data = await res.json();
			budgets = data.budgets || [];
			if (data.summary) {
				summary = data.summary;
			}
		} catch (error: any) {
			errorMessage = error.message;
		} finally {
			isLoading = false;
		}
	}

	onMount(() => {
		fetchBudgets();
	});

</script>

<div class="space-y-6 pb-12">
	
	<!-- Top Bar: Totals & Controls -->
	<div class="bg-card border border-border/50 rounded-3xl p-4 sm:p-6 shadow-sm flex flex-col xl:flex-row xl:items-center justify-between gap-6">
		
		<!-- Totals -->
		<div class="flex flex-row justify-between items-center w-full xl:w-auto gap-2 sm:gap-6 xl:gap-12">
			<div class="flex items-center gap-2 sm:gap-4">
				<div class="flex w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-secondary items-center justify-center text-primary shrink-0">
					<Landmark size={20} class="sm:hidden" />
					<Landmark size={24} class="hidden sm:block" />
				</div>
				<div class="text-left">
					<p class="text-[10px] sm:text-sm font-semibold text-muted-foreground uppercase tracking-wider">Total Budgeted</p>
					<h2 class="text-lg sm:text-3xl font-bold text-foreground">{formattedTotalBudgeted}</h2>
				</div>
			</div>
			
			<div class="w-px h-10 sm:h-12 bg-border/50"></div>
			
			<div class="flex flex-row items-center gap-2 sm:gap-4 text-right sm:text-left">
				<div class="flex w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-brand-blue/30 items-center justify-center text-primary shrink-0">
					<Banknote size={20} class="sm:hidden" />
					<Banknote size={24} class="hidden sm:block" />
				</div>
				<div>
					<p class="text-[10px] sm:text-sm font-semibold text-muted-foreground uppercase tracking-wider">Total Spent</p>
					<h2 class="text-lg sm:text-3xl font-bold text-foreground">{formattedTotalSpent}</h2>
				</div>
			</div>
		</div>

		<!-- Controls -->
		<div class="flex flex-row items-center justify-between gap-2 sm:gap-4 xl:gap-8 w-full xl:w-auto">
			
			<!-- Date Selector -->
			<div class="flex items-center justify-start sm:justify-center w-auto">
				<button 
					onclick={prevPeriod}
					class="p-1 sm:p-2 hover:bg-secondary rounded-full transition-colors text-foreground"
					aria-label="Previous period"
				>
					<ChevronLeft size={20} class="w-4 h-4 sm:w-5 sm:h-5" />
				</button>
				<div class="w-24 sm:w-48 text-center font-bold text-xs sm:text-base text-foreground truncate">
					{displayDate}
				</div>
				<button 
					onclick={nextPeriod}
					class="p-1 sm:p-2 hover:bg-secondary rounded-full transition-colors text-foreground"
					aria-label="Next period"
				>
					<ChevronRight size={20} class="w-4 h-4 sm:w-5 sm:h-5" />
				</button>
			</div>

			<!-- Frequency Selector -->
			<div class="flex bg-secondary/50 p-1 rounded-xl w-auto">
				{#each ['Weekly', 'Monthly', 'Yearly'] as freq}
					<button 
						class="flex-none px-2 sm:px-4 py-1.5 sm:py-2 text-[10px] sm:text-sm font-semibold rounded-lg transition-all
							{frequency === freq ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}"
						onclick={() => setFrequency(freq as Frequency)}
					>
						{freq}
					</button>
				{/each}
			</div>

		</div>
	</div>

	<!-- Content Area -->
	{#if isLoading}
		<div class="flex justify-center items-center py-20">
			<div class="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full"></div>
		</div>
	{:else if errorMessage}
		<div class="p-6 bg-destructive/10 text-destructive border border-destructive/20 rounded-xl text-center">
			<p class="font-semibold">Error loading budgets</p>
			<p class="text-sm opacity-90">{errorMessage}</p>
		</div>
	{:else if budgets.length === 0}
		<div class="p-12 text-center text-muted-foreground bg-card border border-border/50 rounded-3xl shadow-sm">
			<Landmark size={48} class="mx-auto mb-4 opacity-20" />
			<p class="text-lg font-semibold text-foreground">No active budgets</p>
			<p>You don't have any budgets set up for this period.</p>
		</div>
	{:else}
		<div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
			{#each budgets as budget (budget.id)}
				<BudgetCard {budget} />
			{/each}
		</div>
	{/if}

</div>
