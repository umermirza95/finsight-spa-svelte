<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import TransactionList from '$lib/components/TransactionList.svelte';
	import TransactionPopup from '$lib/components/TransactionPopup.svelte';
	import TransactionsPieChart from '$lib/components/TransactionsPieChart.svelte';
	import { 
		Plus, Search, Filter, ChevronDown, ListOrdered, X, Check, Trash2
	} from 'lucide-svelte';

	function getLocalDateString(date: Date) {
		const year = date.getFullYear();
		const month = String(date.getMonth() + 1).padStart(2, '0');
		const day = String(date.getDate()).padStart(2, '0');
		return `${year}-${month}-${day}`;
	}

	// Parse URL params reactively
	let filter = $derived.by(() => {
		const searchParams = $page.url.searchParams;
		
		let from = searchParams.get('From');
		let to = searchParams.get('To');

		// Default to current month if not provided
		if (!from || !to) {
			const now = new Date();
			const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
			const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0); // Last day of month
			
			from = from || getLocalDateString(startOfMonth);
			to = to || getLocalDateString(endOfMonth);
		}

		return {
			From: from,
			To: to,
			Type: searchParams.get('Type') || undefined,
			CategoryId: searchParams.get('CategoryId') || undefined,
			SearchQuery: searchParams.get('SearchQuery') || undefined
		};
	});

	let transactions = $state<any[]>([]);
	let categories = $state<any[]>([]);
	let isLoading = $state(true);
	let errorMessage = $state('');

	let isFilterModalOpen = $state(false);
	let isCategoryDropdownOpen = $state(false);
	
	let isPopupOpen = $state(false);
	let selectedTransaction = $state<any>(null);

	let isDeleteConfirmOpen = $state(false);
	let transactionToDelete = $state<any>(null);
	let isDeleting = $state(false);
	
	let activeTab = $state<'list' | 'graph'>('list');

	let windowHeight = $state(0);
	let graphHeight = $state(0);
	let shouldBeSticky = $derived(graphHeight > 0 && windowHeight > 0 && graphHeight < windowHeight - 120); // 120px safety margin for top-24 + padding

	function openAddPopup() {
		selectedTransaction = null;
		isPopupOpen = true;
	}

	function closePopup() {
		isPopupOpen = false;
	}

	function handleTransactionSuccess() {
		loadData();
	}

	async function confirmDelete() {
		if (!transactionToDelete) return;
		isDeleting = true;
		try {
			const token = localStorage.getItem('authToken');
			const res = await fetch(`/api/Transactions/${transactionToDelete.id}`, {
				method: 'DELETE',
				headers: { 'Authorization': `Bearer ${token}` }
			});
			if (!res.ok) {
				const errorData = await res.json().catch(() => ({}));
				throw new Error(errorData.error || errorData.message || 'Failed to delete transaction');
			}
			isDeleteConfirmOpen = false;
			transactionToDelete = null;
			loadData();
		} catch (error: any) {
			alert(error.message);
		} finally {
			isDeleting = false;
		}
	}
	
	let draftFrom = $state('');
	let draftTo = $state('');
	let draftType = $state('All');
	let draftCategoryIds = $state<string[]>([]);
	let draftSearchQuery = $state('');
	
	function openFilterModal() {
		draftFrom = filter.From || '';
		draftTo = filter.To || '';
		draftType = filter.Type || 'All';
		draftCategoryIds = filter.CategoryId ? [filter.CategoryId] : [];
		draftSearchQuery = filter.SearchQuery || '';
		isFilterModalOpen = true;
		isCategoryDropdownOpen = false;
	}

	function resetFilter() {
		const now = new Date();
		const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
		const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
		
		draftFrom = getLocalDateString(startOfMonth);
		draftTo = getLocalDateString(endOfMonth);
		draftType = 'All';
		draftCategoryIds = [];
		draftSearchQuery = '';
	}

	function applyFilter() {
		const params = new URLSearchParams();
		if (draftFrom) params.append('From', draftFrom);
		if (draftTo) params.append('To', draftTo);
		if (draftType && draftType !== 'All') params.append('Type', draftType);
		if (draftCategoryIds.length > 0) params.append('CategoryId', draftCategoryIds[0]);
		if (draftSearchQuery) params.append('SearchQuery', draftSearchQuery);
		
		goto(`?${params.toString()}`);
		isFilterModalOpen = false;
	}

	function toggleCategorySelect(id: string) {
		if (draftCategoryIds.includes(id)) {
			draftCategoryIds = draftCategoryIds.filter(cid => cid !== id);
		} else {
			draftCategoryIds = [...draftCategoryIds, id];
		}
	}

	function selectAllCategories() {
		draftCategoryIds = categories.map(c => c.id);
	}

	function clearAllCategories() {
		draftCategoryIds = [];
	}

	let isSortOpen = $state(false);
	let sortOption = $state('date-desc'); // date-desc, date-asc, amount-desc, amount-asc

	let sortedTransactions = $derived.by(() => {
		let sorted = [...transactions];
		if (sortOption === 'date-desc') {
			sorted.sort((a, b) => new Date(b.date || b.transactionDate).getTime() - new Date(a.date || a.transactionDate).getTime());
		} else if (sortOption === 'date-asc') {
			sorted.sort((a, b) => new Date(a.date || a.transactionDate).getTime() - new Date(b.date || b.transactionDate).getTime());
		} else if (sortOption === 'amount-desc') {
			sorted.sort((a, b) => parseFloat(b.amount) - parseFloat(a.amount));
		} else if (sortOption === 'amount-asc') {
			sorted.sort((a, b) => parseFloat(a.amount) - parseFloat(b.amount));
		}
		return sorted;
	});

	// Fetch categories first, then transactions
	async function loadData() {
		isLoading = true;
		errorMessage = '';
		try {
			const token = localStorage.getItem('authToken');
			if (!token) throw new Error('Not authenticated');

			// 1. Fetch Categories
			const catRes = await fetch('/api/Category', {
				headers: { 'Authorization': `Bearer ${token}` }
			});
			if (catRes.ok) {
				const catData = await catRes.json();
				categories = catData.data?.categories || [];
			}

			// 2. Fetch Transactions with filter
			const params = new URLSearchParams();
			if (filter.From) params.append('From', filter.From);
			if (filter.To) params.append('To', filter.To);
			if (filter.Type) params.append('Type', filter.Type);
			if (filter.CategoryId) params.append('CategoryId', filter.CategoryId);
			if (filter.SearchQuery) params.append('SearchQuery', filter.SearchQuery);

			const txRes = await fetch(`/api/Transactions?${params.toString()}`, {
				headers: { 'Authorization': `Bearer ${token}` }
			});
			if (!txRes.ok) throw new Error('Failed to fetch transactions');

			const txData = await txRes.json();
			transactions = txData.data?.transactions || [];

		} catch (error: any) {
			errorMessage = error.message;
		} finally {
			isLoading = false;
		}
	}

	// Trigger load when filter prop changes
	$effect(() => {
		// Deep dependency on filter to trigger re-fetch if URL changes
		const _ = JSON.stringify(filter); 
		loadData();
	});

	function getCategoryName(categoryId: string): string {
		const cat = categories.find(c => c.id === categoryId);
		return cat ? cat.name : 'Unknown';
	}

	// Close dropdowns when clicking outside
	function handleOutsideClick(event: MouseEvent) {
		const target = event.target as HTMLElement;
		if (!target.closest('.sort-dropdown-container')) {
			isSortOpen = false;
		}
		if (!target.closest('.cat-dropdown-container')) {
			isCategoryDropdownOpen = false;
		}
	}
	
	onMount(() => {
		document.addEventListener('click', handleOutsideClick);
		return () => {
			document.removeEventListener('click', handleOutsideClick);
		};
	});

</script>

<svelte:window bind:innerHeight={windowHeight} />

<div class="space-y-6 pb-12">
	<!-- Floating Action Button -->
	<button 
		class="fixed bottom-24 lg:bottom-10 right-6 lg:right-10 z-40 w-14 h-14 bg-primary text-primary-foreground rounded-full flex items-center justify-center shadow-lg hover:scale-105 hover:shadow-xl transition-all duration-200"
		aria-label="Add Transaction"
		title="Add Transaction"
		onclick={openAddPopup}
	>
		<Plus size={28} strokeWidth={2.5} />
	</button>

	<!-- Mobile Tabs -->
	<div class="lg:hidden bg-card border border-border/50 rounded-xl p-1 flex shadow-sm">
		<button 
			onclick={() => activeTab = 'list'} 
			class="flex-1 py-2 text-sm font-semibold rounded-lg transition-colors {activeTab === 'list' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:bg-secondary/50'}"
		>
			List View
		</button>
		<button 
			onclick={() => activeTab = 'graph'} 
			class="flex-1 py-2 text-sm font-semibold rounded-lg transition-colors {activeTab === 'graph' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:bg-secondary/50'}"
		>
			Graph View
		</button>
	</div>

	<!-- Main Container -->
	<div class="flex flex-col lg:flex-row gap-6 items-start relative">
		<!-- Left Side: List -->
		<div class="w-full lg:flex-1 bg-card border border-border/50 rounded-3xl shadow-sm overflow-hidden flex-col {activeTab === 'list' ? 'flex' : 'hidden lg:flex'}">
			
			<!-- Toolbar: Search and Filters -->
			<div class="p-4 md:p-6 border-b border-border/50 flex items-center justify-between w-full bg-card/50">
				<button 
					onclick={openFilterModal}
					class="flex items-center gap-2 px-4 py-2.5 bg-background border border-border/60 rounded-xl text-sm font-medium hover:bg-secondary/50 transition-colors"
				>
					<Filter size={16} />
					Filter
				</button>
				
				<div class="relative sort-dropdown-container">
					<button 
						onclick={() => isSortOpen = !isSortOpen}
						class="flex items-center gap-2 px-4 py-2.5 bg-background border border-border/60 rounded-xl text-sm font-medium hover:bg-secondary/50 transition-colors"
					>
						<ListOrdered size={16} />
						Sort
						<ChevronDown size={14} class="ml-1 opacity-50" />
					</button>
					{#if isSortOpen}
						<div class="absolute right-0 top-full mt-2 w-48 bg-popover border border-border/50 rounded-xl shadow-lg z-20 p-2">
							<button onclick={() => { sortOption = 'date-desc'; isSortOpen = false; }} class="w-full text-left px-3 py-2 text-sm rounded-lg hover:bg-secondary/50 transition-colors {sortOption === 'date-desc' ? 'bg-secondary/30 font-semibold text-primary' : 'text-muted-foreground'}">Date (Newest)</button>
							<button onclick={() => { sortOption = 'date-asc'; isSortOpen = false; }} class="w-full text-left px-3 py-2 text-sm rounded-lg hover:bg-secondary/50 transition-colors {sortOption === 'date-asc' ? 'bg-secondary/30 font-semibold text-primary' : 'text-muted-foreground'}">Date (Oldest)</button>
							<button onclick={() => { sortOption = 'amount-desc'; isSortOpen = false; }} class="w-full text-left px-3 py-2 text-sm rounded-lg hover:bg-secondary/50 transition-colors {sortOption === 'amount-desc' ? 'bg-secondary/30 font-semibold text-primary' : 'text-muted-foreground'}">Amount (High to Low)</button>
							<button onclick={() => { sortOption = 'amount-asc'; isSortOpen = false; }} class="w-full text-left px-3 py-2 text-sm rounded-lg hover:bg-secondary/50 transition-colors {sortOption === 'amount-asc' ? 'bg-secondary/30 font-semibold text-primary' : 'text-muted-foreground'}">Amount (Low to High)</button>
						</div>
					{/if}
				</div>
			</div>

			<TransactionList 
				transactions={sortedTransactions} 
				{categories} 
				{isLoading} 
				{errorMessage} 
				onedit={(tx) => { selectedTransaction = tx; isPopupOpen = true; }}
				ondelete={(tx) => { transactionToDelete = tx; isDeleteConfirmOpen = true; }}
			/>
		</div>

		<!-- Right Side: Graph -->
		<div 
			bind:clientHeight={graphHeight}
			class="w-full lg:w-[400px] bg-card border border-border/50 rounded-3xl shadow-sm p-6 flex-col {activeTab === 'graph' ? 'flex' : 'hidden lg:flex'} shrink-0 {shouldBeSticky ? 'lg:sticky lg:top-24' : ''}"
		>
			<h3 class="text-lg font-bold text-foreground mb-6 text-center">Transactions by Category</h3>
			<TransactionsPieChart transactions={sortedTransactions} {categories} />
		</div>
	</div>
</div>

{#if isFilterModalOpen}
	<div class="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div class="absolute inset-0" onclick={() => isFilterModalOpen = false}></div>
		
		<div class="relative w-full max-w-lg lg:max-w-2xl bg-card border border-border/50 rounded-3xl shadow-xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
			<!-- Header -->
			<div class="flex items-center justify-between p-6 border-b border-border/50">
				<h2 class="text-xl font-bold text-foreground">Filter Transactions</h2>
				<button 
					onclick={() => isFilterModalOpen = false}
					class="p-2 text-muted-foreground hover:bg-secondary/50 hover:text-foreground rounded-full transition-colors"
				>
					<X size={20} />
				</button>
			</div>

			<!-- Body -->
			<form onsubmit={(e) => { e.preventDefault(); applyFilter(); }}>
				<div class="p-6 space-y-4 sm:space-y-6">
				<!-- Search -->
				<div class="relative w-full">
					<Search class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
					<input 
						type="text" 
						placeholder="Search transactions..." 
						bind:value={draftSearchQuery}
						class="w-full pl-10 pr-4 py-2.5 bg-background border border-border/60 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all text-foreground"
					/>
				</div>

				<!-- Category & Type Row -->
				<div class="grid grid-cols-1 sm:grid-cols-2 gap-4 lg:gap-8">
					<!-- Categories Multi-Select -->
					<div class="space-y-2 cat-dropdown-container relative">
						<label class="text-sm font-semibold text-foreground flex justify-between items-end">
							Category
							<span class="text-xs text-muted-foreground font-normal">{draftCategoryIds.length} selected</span>
						</label>
						
						<button 
							type="button"
							onclick={() => isCategoryDropdownOpen = !isCategoryDropdownOpen}
							class="w-full flex items-center justify-between px-4 py-2.5 bg-background border border-border/60 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all text-foreground text-left"
						>
							<span class="truncate">
								{#if draftCategoryIds.length === 0}
									Select categories...
								{:else if draftCategoryIds.length === categories.length}
									All Categories
								{:else}
									{draftCategoryIds.map(id => getCategoryName(id)).join(', ')}
								{/if}
							</span>
							<ChevronDown size={16} class="opacity-50 flex-shrink-0 ml-2" />
						</button>

						{#if isCategoryDropdownOpen}
							<div class="absolute z-30 left-0 right-0 top-full mt-2 bg-popover border border-border/50 rounded-xl shadow-lg overflow-hidden flex flex-col">
								<!-- Utility buttons -->
								<div class="flex items-center justify-between p-2 border-b border-border/50 bg-secondary/10">
									<button type="button" onclick={selectAllCategories} class="text-xs font-semibold text-primary hover:underline px-2 py-1">Select All</button>
									<button type="button" onclick={clearAllCategories} class="text-xs font-semibold text-muted-foreground hover:text-foreground hover:underline px-2 py-1">Clear All</button>
								</div>
								
								<!-- List -->
								<div class="max-h-60 overflow-y-auto p-2 space-y-1">
									{#each categories as cat (cat.id)}
										<button 
											type="button"
											onclick={() => toggleCategorySelect(cat.id)}
											class="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-secondary/50 transition-colors text-sm text-left"
										>
											<span>{cat.name}</span>
											{#if draftCategoryIds.includes(cat.id)}
												<Check size={16} class="text-primary" />
											{/if}
										</button>
									{/each}
								</div>
							</div>
						{/if}
					</div>

					<!-- Type Selector -->
					<div class="space-y-2">
						<label class="text-sm font-semibold text-foreground">Type</label>
						<select 
							bind:value={draftType}
							class="w-full px-3 py-2.5 bg-background border border-border/60 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all text-foreground"
						>
							<option value="All">All Transactions</option>
							<option value="Income">Income</option>
							<option value="Expense">Expense</option>
						</select>
					</div>
				</div>

				<!-- Dates Row -->
				<div class="grid grid-cols-1 sm:grid-cols-2 gap-4 lg:gap-8">
					<div class="space-y-2">
						<label class="text-sm font-semibold text-foreground">Start Date</label>
						<input 
							type="date" 
							bind:value={draftFrom}
							class="w-full px-3 py-2.5 bg-background border border-border/60 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all text-foreground"
						/>
					</div>
					<div class="space-y-2">
						<label class="text-sm font-semibold text-foreground">End Date</label>
						<input 
							type="date" 
							bind:value={draftTo}
							class="w-full px-3 py-2.5 bg-background border border-border/60 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all text-foreground"
						/>
					</div>
				</div>
			</div>

			<!-- Footer -->
			<div class="p-6 border-t border-border/50 bg-card/50 flex flex-col-reverse sm:flex-row justify-between gap-3">
				<button 
					type="button"
					onclick={resetFilter}
					class="px-5 py-2.5 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors"
				>
					Reset to Default
				</button>
				
				<button 
					type="submit"
					class="px-5 py-2.5 bg-primary text-primary-foreground text-sm font-semibold rounded-xl hover:opacity-90 transition-opacity shadow-sm"
				>
					Apply Filters
				</button>
			</div>
			</form>
		</div>
	</div>
{/if}

<TransactionPopup 
	isOpen={isPopupOpen} 
	onClose={closePopup} 
	onSuccess={handleTransactionSuccess} 
	{categories} 
	transaction={selectedTransaction} 
/>

{#if isDeleteConfirmOpen}
	<div class="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div class="absolute inset-0" onclick={() => !isDeleting && (isDeleteConfirmOpen = false)}></div>
		
		<div class="relative w-full max-w-sm bg-card border border-border/50 rounded-3xl shadow-xl p-6 flex flex-col items-center text-center animate-in fade-in zoom-in-95 duration-200">
			<div class="w-12 h-12 rounded-full bg-destructive/10 text-destructive flex items-center justify-center mb-4">
				<Trash2 size={24} />
			</div>
			<h3 class="text-lg font-bold text-foreground mb-2">Delete Transaction?</h3>
			<p class="text-sm text-muted-foreground mb-6">
				Are you sure you want to delete this transaction? This action cannot be undone.
			</p>
			<div class="flex gap-3 w-full">
				<button 
					onclick={() => isDeleteConfirmOpen = false} 
					disabled={isDeleting}
					class="flex-1 px-4 py-2.5 rounded-xl font-semibold bg-secondary/50 hover:bg-secondary text-foreground transition-colors"
				>
					Cancel
				</button>
				<button 
					onclick={confirmDelete}
					disabled={isDeleting}
					class="flex-1 px-4 py-2.5 rounded-xl font-semibold bg-destructive text-destructive-foreground hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
				>
					{#if isDeleting}
						<span class="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></span>
					{/if}
					Delete
				</button>
			</div>
		</div>
	</div>
{/if}
