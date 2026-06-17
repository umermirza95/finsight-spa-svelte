<script lang="ts">
	import { 
		Banknote, TrendingUp, Landmark, PiggyBank, Wallet,
		HeartHandshake, Gift, Home, Zap, Building, ShoppingCart, Stethoscope,
		Plane, Utensils, Repeat, Ticket, Briefcase, Baby, PawPrint, Car,
		FileText, HelpCircle, LayoutGrid, MoreVertical, Pencil, Trash2
	} from 'lucide-svelte';
	import { onMount } from 'svelte';

	let { 
		transactions = [],
		categories = [],
		isLoading = false,
		errorMessage = '',
		onedit = (tx: any) => {},
		ondelete = (tx: any) => {}
	} = $props<{
		transactions?: any[];
		categories?: any[];
		isLoading?: boolean;
		errorMessage?: string;
		onedit?: (tx: any) => void;
		ondelete?: (tx: any) => void;
	}>();

	let openDropdownId = $state<string | null>(null);

	function handleOutsideClick(event: MouseEvent) {
		const target = event.target as HTMLElement;
		if (!target.closest('.action-dropdown-container')) {
			openDropdownId = null;
		}
	}

	onMount(() => {
		document.addEventListener('click', handleOutsideClick);
		return () => {
			document.removeEventListener('click', handleOutsideClick);
		};
	});

	function getCategoryName(categoryId: string): string {
		const cat = categories.find((c: any) => c.id === categoryId);
		return cat ? cat.name : 'Unknown';
	}

	function getCategoryStyles(tx: any) {
		const categoryName = getCategoryName(tx.categoryId);
		const key = (categoryName && categoryName !== 'Unknown' ? categoryName : (tx.type || '')).toLowerCase();

		switch (key) {
			// Income & Financial
			case "dividend": return { icon: Banknote, color: "bg-emerald-100 text-emerald-700" };
			case "capital gains": return { icon: TrendingUp, color: "bg-teal-100 text-teal-700" };
			case "income": return { icon: Landmark, color: "bg-green-100 text-green-700" };
			case "savings account": return { icon: PiggyBank, color: "bg-cyan-100 text-cyan-700" };
			case "allowances": return { icon: Wallet, color: "bg-lime-100 text-lime-700" };
		
			// Religious & Giving
			case "zakat": return { icon: HeartHandshake, color: "bg-rose-100 text-rose-700" };
			case "gifts": return { icon: Gift, color: "bg-pink-100 text-pink-700" };

			// Household
			case "home": return { icon: Home, color: "bg-indigo-100 text-indigo-700" };
			case "utilities": return { icon: Zap, color: "bg-amber-100 text-amber-700" };
			case "rent": return { icon: Building, color: "bg-blue-100 text-blue-700" };
			case "groceries": return { icon: ShoppingCart, color: "bg-violet-100 text-violet-700" };
			case "healthcare": return { icon: Stethoscope, color: "bg-red-100 text-red-700" };

			// Lifestyle
			case "vacations": return { icon: Plane, color: "bg-sky-100 text-sky-700" };
			case "restaurants": return { icon: Utensils, color: "bg-orange-100 text-orange-700" };
			case "subscriptions": return { icon: Repeat, color: "bg-purple-100 text-purple-700" };
			case "entertainment": return { icon: Ticket, color: "bg-fuchsia-100 text-fuchsia-700" };
			case "business": return { icon: Briefcase, color: "bg-slate-100 text-slate-700" };

			// Family & Personal
			case "child": return { icon: Baby, color: "bg-yellow-100 text-yellow-700" };
			case "pet": return { icon: PawPrint, color: "bg-stone-100 text-stone-700" };

			// Transport
			case "transport": return { icon: Car, color: "bg-gray-100 text-gray-700" };

			// Compliance & Miscellaneous
			case "tax": return { icon: FileText, color: "bg-orange-100 text-orange-800" };
			case "untracked": return { icon: HelpCircle, color: "bg-zinc-100 text-zinc-600" };

			// Fallback
			default: return { icon: LayoutGrid, color: "bg-secondary text-secondary-foreground" };
		}
	}

	function formatCurrency(amount: number | string, currency: string = 'USD') {
		const val = typeof amount === 'string' ? parseFloat(amount) : amount;
		return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(val);
	}

	function formatDate(dateString: string) {
		const d = new Date(dateString);
		return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
	}
</script>

<div class="w-full overflow-x-auto">
	{#if isLoading}
		<div class="flex items-center justify-center p-12">
			<div class="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
		</div>
	{:else if errorMessage}
		<div class="p-8 text-center text-destructive">
			{errorMessage}
		</div>
	{:else if transactions.length === 0}
		<div class="p-12 text-center text-muted-foreground">
			No transactions found for the selected period.
		</div>
	{:else}
		<table class="w-full text-sm text-left">
			<thead class="text-xs text-muted-foreground uppercase bg-secondary/20 border-b border-border/50">
				<tr>
					<th class="px-6 py-4 font-semibold tracking-wider">Transaction</th>
					<th class="px-6 py-4 font-semibold tracking-wider">Date</th>
					<th class="px-6 py-4 font-semibold tracking-wider">Amount</th>
					<th class="px-6 py-4 font-semibold tracking-wider text-right">Actions</th>
				</tr>
			</thead>
			<tbody class="divide-y divide-border/50">
				{#each transactions as tx (tx.id)}
					{@const style = getCategoryStyles(tx)}
					{@const isIncome = tx.type === 'Income' || tx.type === 0 || tx.type === 'income'}
					{@const catName = getCategoryName(tx.categoryId)}
					<tr class="hover:bg-secondary/10 transition-colors group">
						<td class="px-6 py-4">
							<div class="flex items-center gap-4">
								<div class="w-10 h-10 rounded-xl flex items-center justify-center {style.color.split(' ')[0]} bg-opacity-20 text-current">
									<svelte:component this={style.icon} size={20} />
								</div>
								<div>
									<p class="font-bold text-foreground">{tx.comment || catName || 'Transaction'}</p>
									<p class="text-xs text-muted-foreground mt-0.5">{catName !== 'Unknown' ? catName : (tx.type || 'General')}</p>
								</div>
							</div>
						</td>
						<td class="px-6 py-4 text-muted-foreground font-medium">
							{formatDate(tx.date || tx.transactionDate || new Date().toISOString())}
						</td>
						<td class="px-6 py-4">
							<div class="font-bold {isIncome ? 'text-green-600' : 'text-red-600'}">
								{isIncome ? '+' : '-'}{formatCurrency(Math.abs(parseFloat(tx.amount)))}
							</div>
							{#if tx.baseAmount && parseFloat(tx.baseAmount) !== parseFloat(tx.amount)}
								<div class="text-xs text-muted-foreground mt-0.5 font-medium">
									{isIncome ? '+' : '-'}{formatCurrency(Math.abs(parseFloat(tx.baseAmount)), tx.currency || 'PKR')}
								</div>
							{/if}
						</td>
						<td class="px-6 py-4 text-right relative action-dropdown-container">
							<button 
								onclick={() => {
									console.log('Toggling dropdown for transaction ID:', tx.id);
									openDropdownId = openDropdownId === tx.id ? null : tx.id
								}}
								class="p-2 text-muted-foreground hover:text-foreground hover:bg-secondary/50 rounded-lg transition-colors"
							>
								<MoreVertical size={18} />
							</button>
							{#if openDropdownId === tx.id}
								<div class="absolute right-6 top-full mt-1 w-36 bg-popover border border-border/50 rounded-xl shadow-lg z-20 p-1 flex flex-col">
									<button 
										onclick={() => { openDropdownId = null; onedit(tx); }} 
										class="w-full text-left px-3 py-2 text-sm rounded-lg hover:bg-secondary/50 transition-colors flex items-center gap-2 text-foreground"
									>
										<Pencil size={14} />
										Edit
									</button>
									<button 
										onclick={() => { openDropdownId = null; ondelete(tx); }} 
										class="w-full text-left px-3 py-2 text-sm rounded-lg hover:bg-destructive/10 transition-colors flex items-center gap-2 text-destructive"
									>
										<Trash2 size={14} />
										Delete
									</button>
								</div>
							{/if}
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	{/if}
</div>
