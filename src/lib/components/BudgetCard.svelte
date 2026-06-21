<script lang="ts">
	import { Pencil } from 'lucide-svelte';
	import { getCategoryStyle } from '$lib/categoryUtils';

	// Props
	let { budget } = $props<{
		budget: {
			id: string;
			name: string;
			totalAmount: number;
			consumedAmount: number;
			currency: string;
			// Adding optional subtitle for future use if API supports it
			subtitle?: string; 
		}
	}>();

	// Derived state
	let progressPercentage = $derived(
		budget.totalAmount > 0 ? (budget.consumedAmount / budget.totalAmount) * 100 : 0
	);

	let formattedSpent = $derived(
		new Intl.NumberFormat('en-US', { style: 'currency', currency: budget.currency || 'USD', maximumFractionDigits: 0 }).format(budget.consumedAmount)
	);

	let formattedTarget = $derived(
		new Intl.NumberFormat('en-US', { style: 'currency', currency: budget.currency || 'USD', maximumFractionDigits: 0 }).format(budget.totalAmount)
	);

	let formattedLeft = $derived(
		new Intl.NumberFormat('en-US', { style: 'currency', currency: budget.currency || 'USD', maximumFractionDigits: 0 }).format(Math.max(0, budget.totalAmount - budget.consumedAmount))
	);

	// Status logic
	let status = $derived.by(() => {
		if (progressPercentage >= 100) return 'Exceeded';
		if (progressPercentage >= 85) return 'Warning';
		if (progressPercentage > 0 && progressPercentage < 85) return 'On Track';
		return 'In Progress'; // e.g. 0%
	});

	let progressColorClass = $derived.by(() => {
		if (status === 'Exceeded' || status === 'Warning') return 'bg-destructive';
		if (status === 'In Progress') return 'bg-brand-blue'; // lighter blue
		return 'bg-primary'; // dark blue for on track
	});

	let statusBadgeClass = $derived.by(() => {
		if (status === 'Exceeded') return 'bg-destructive/15 text-destructive';
		if (status === 'Warning') return 'bg-orange-500/15 text-orange-600 dark:text-orange-400';
		if (status === 'In Progress') return 'bg-brand-blue/30 text-brand-blue-foreground';
		return 'bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary-foreground';
	});

	// Icon mapping based on exact name to match categories
	let categoryStyle = $derived(getCategoryStyle(budget.name));
	let IconComponent = $derived(categoryStyle.icon);

</script>

<div class="bg-card border border-border/60 rounded-3xl p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col h-full">
	<!-- Header -->
	<div class="flex items-start justify-between mb-6">
		<div class="flex gap-4 items-center">
			<div class="w-12 h-12 rounded-xl bg-brand-blue/30 text-primary flex items-center justify-center shrink-0">
				<IconComponent size={24} />
			</div>
			<div>
				<h3 class="text-lg font-bold text-foreground leading-tight">{budget.name}</h3>
				{#if budget.subtitle}
					<p class="text-xs text-muted-foreground mt-0.5">{budget.subtitle}</p>
				{/if}
			</div>
		</div>
		<button 
			type="button"
			class="p-2 text-muted-foreground hover:bg-secondary/50 hover:text-foreground rounded-full transition-colors flex items-center justify-center gap-1"
			aria-label="Edit budget"
		>
			<!-- Show pencil on md screens, text on small screens. Or just icon based on screenshot. The wide screenshot has pencil. -->
			<span class="sr-only sm:not-sr-only sm:text-xs font-bold text-primary sm:mr-1">Edit</span>
			<Pencil size={16} class="hidden sm:block opacity-50" />
			<Pencil size={18} class="sm:hidden text-primary" />
		</button>
	</div>

	<!-- Content -->
	<div class="space-y-2 mt-auto">
		<div class="flex flex-wrap items-end justify-between gap-x-2 gap-y-1 text-sm">
			<div class="text-muted-foreground font-medium whitespace-nowrap">Spent <span class="text-foreground font-bold">{formattedSpent}</span></div>
			<div class="text-muted-foreground font-medium whitespace-nowrap text-right">Target <span class="text-foreground font-bold">{formattedTarget}</span></div>
		</div>
		
		<!-- Progress Bar -->
		<div class="w-full h-2.5 bg-secondary rounded-full overflow-hidden">
			<div 
				class="h-full rounded-full transition-all duration-500 {progressColorClass}"
				style="width: {Math.min(progressPercentage, 100)}%"
			></div>
		</div>
		
		<div class="text-right text-xs text-muted-foreground font-medium">
			{progressPercentage.toFixed(1)}% consumed
		</div>
	</div>

	<!-- Footer -->
	<div class="flex items-center justify-between mt-6 pt-4 border-t border-border/50">
		<div class="text-sm font-semibold text-muted-foreground">
			Left: <span class="text-foreground">{formattedLeft}</span>
		</div>
		<div class="text-[10px] sm:text-xs font-bold px-2.5 py-1 rounded-md uppercase tracking-wider {statusBadgeClass}">
			{status}
		</div>
	</div>
</div>
