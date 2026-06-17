<script lang="ts">
	import { X } from 'lucide-svelte';

	let {
		isOpen = false,
		onClose,
		onSuccess,
		categories = [],
		transaction = null
	} = $props<{
		isOpen: boolean;
		onClose: () => void;
		onSuccess: () => void;
		categories?: any[];
		transaction?: any;
	}>();

	let isSubmitting = $state(false);
	let errorMessage = $state('');

	// Form fields
	let amount = $state('');
	let currency = $state('PKR');
	let categoryId = $state('');
	let subCategoryId = $state('');
	let date = $state(new Date().toISOString().split('T')[0]);
	let type = $state(1); // 1 = expense
	let mode = $state(1); // 1 = cash
	let comment = $state('');

	// Reset form when opened or transaction changes
	$effect(() => {
		if (isOpen) {
			if (transaction) {
				amount = transaction.baseAmount?.toString() || transaction.amount?.toString() || '';
				currency = transaction.currency || 'PKR';
				categoryId = transaction.categoryId || '';
				subCategoryId = transaction.subCategoryId || '';
				date = transaction.date ? transaction.date.split('T')[0] : new Date().toISOString().split('T')[0];
				type = transaction.type ?? 1;
				mode = transaction.mode ?? 1;
				comment = transaction.comment || '';
			} else {
				amount = '';
				currency = 'PKR';
				categoryId = categories.length > 0 ? categories[0].id : '';
				subCategoryId = '';
				date = new Date().toISOString().split('T')[0];
				type = 1;
				mode = 1;
				comment = '';
			}
			errorMessage = '';
		}
	});

	let currentSubCategories = $derived.by(() => {
		const cat = categories.find((c: any) => c.id === categoryId);
		return cat?.subCategories || [];
	});

	async function handleSubmit() {
		if (!amount || !categoryId) {
			errorMessage = 'Amount and Category are required.';
			return;
		}

		isSubmitting = true;
		errorMessage = '';

		try {
			const token = localStorage.getItem('authToken');
			const payload = {
				amount: parseFloat(amount),
				currency,
				categoryId,
				subCategoryId: subCategoryId || null,
				date,
				type: Number(type),
				mode: Number(mode),
				comment
			};

			const url = transaction ? `/api/Transactions/${transaction.id}` : '/api/Transactions';
			const method = transaction ? 'PUT' : 'POST';

			const res = await fetch(url, {
				method,
				headers: {
					'Content-Type': 'application/json',
					'Authorization': `Bearer ${token}`
				},
				body: JSON.stringify(payload)
			});

			if (!res.ok) {
				const errorData = await res.json().catch(() => ({}));
				throw new Error(errorData.message || errorData.error || 'Failed to save transaction');
			}

			onSuccess();
			onClose();
		} catch (error: any) {
			errorMessage = error.message || 'An error occurred';
		} finally {
			isSubmitting = false;
		}
	}
</script>

{#if isOpen}
	<div class="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div class="absolute inset-0" onclick={onClose}></div>
		
		<div 
			class="relative w-full max-w-md bg-card border border-border/50 rounded-3xl shadow-xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200"
			role="dialog"
			aria-modal="true"
		>
			<!-- Header -->
			<div class="flex items-center justify-between p-6 border-b border-border/50 bg-card/50">
				<h2 class="text-xl font-bold text-foreground">
					{transaction ? 'Edit Transaction' : 'Add Transaction'}
				</h2>
				<button 
					type="button"
					onclick={onClose}
					class="p-2 text-muted-foreground hover:bg-secondary/50 hover:text-foreground rounded-full transition-colors"
				>
					<X size={20} />
				</button>
			</div>

			<form 
				onsubmit={(e) => { e.preventDefault(); handleSubmit(); }} 
				onkeydown={(e) => { if (e.key === 'Escape') onClose(); }}
				class="flex flex-col flex-1"
			>
				<!-- Body -->
				<div class="p-6 overflow-y-auto max-h-[70vh] space-y-4">
					{#if errorMessage}
						<div class="p-3 bg-destructive/10 text-destructive border border-destructive/20 rounded-xl text-sm">
							{errorMessage}
						</div>
					{/if}

					<!-- Amount and Currency -->
					<div class="flex gap-4">
						<div class="space-y-2 flex-1">
							<label class="text-sm font-semibold text-foreground">Amount</label>
							<input 
								type="number" 
								step="0.01"
								min="0.01"
								bind:value={amount}
								placeholder="0.00"
								class="w-full px-3 py-2.5 bg-background border border-border/60 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all text-foreground"
								required
								autofocus
							/>
						</div>
						<div class="space-y-2 w-1/3">
							<label class="text-sm font-semibold text-foreground">Currency</label>
							<select 
								bind:value={currency}
								class="w-full px-3 py-2.5 bg-background border border-border/60 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all text-foreground"
							>
								<option value="PKR">PKR</option>
							</select>
						</div>
					</div>

					<!-- Category -->
					<div class="flex gap-4">
						<div class="space-y-2 flex-1">
							<label class="text-sm font-semibold text-foreground">Category</label>
							<select 
								bind:value={categoryId}
								onchange={() => subCategoryId = ''}
								class="w-full px-3 py-2.5 bg-background border border-border/60 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all text-foreground"
								required
							>
								<option value="" disabled>Select a category</option>
								{#each categories as cat}
									<option value={cat.id}>{cat.name}</option>
								{/each}
							</select>
						</div>

						{#if currentSubCategories.length > 0}
							<div class="space-y-2 flex-1 animate-in fade-in slide-in-from-right-4 duration-200">
								<label class="text-sm font-semibold text-foreground">Sub Category</label>
								<select 
									bind:value={subCategoryId}
									class="w-full px-3 py-2.5 bg-background border border-border/60 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all text-foreground"
									required
								>
									<option value="" disabled>Select a sub category</option>
									{#each currentSubCategories as subCat}
										<option value={subCat.id}>{subCat.name}</option>
									{/each}
								</select>
							</div>
						{/if}
					</div>

					<!-- Date -->
					<div class="space-y-2">
						<label class="text-sm font-semibold text-foreground">Date</label>
						<input 
							type="date" 
							bind:value={date}
							class="w-full px-3 py-2.5 bg-background border border-border/60 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all text-foreground"
							required
						/>
					</div>

					<!-- Type and Mode -->
					<div class="flex gap-4">
						<div class="space-y-2 flex-1">
							<label class="text-sm font-semibold text-foreground">Type</label>
							<select 
								bind:value={type}
								class="w-full px-3 py-2.5 bg-background border border-border/60 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all text-foreground"
							>
								<option value={1}>Expense</option>
								<option value={0}>Income</option>
							</select>
						</div>
						<div class="space-y-2 flex-1">
							<label class="text-sm font-semibold text-foreground">Mode</label>
							<select 
								bind:value={mode}
								class="w-full px-3 py-2.5 bg-background border border-border/60 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all text-foreground"
							>
								<option value={1}>Cash</option>
								<option value={0}>Card</option>
								<option value={2}>Transfer</option>
								<option value={3}>Online</option>
							</select>
						</div>
					</div>

					<!-- Comment -->
					<div class="space-y-2">
						<label class="text-sm font-semibold text-foreground">Comment</label>
						<input 
							type="text" 
							bind:value={comment}
							placeholder="Optional notes"
							class="w-full px-3 py-2.5 bg-background border border-border/60 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all text-foreground"
						/>
					</div>
				</div>

				<!-- Footer -->
				<div class="p-6 border-t border-border/50 bg-card/50 flex justify-end gap-3">
					<button 
						type="button"
						onclick={onClose}
						class="px-5 py-2.5 text-sm font-semibold text-muted-foreground hover:bg-secondary/50 rounded-xl transition-colors"
						disabled={isSubmitting}
					>
						Cancel
					</button>
					<button 
						type="submit"
						disabled={isSubmitting}
						class="px-5 py-2.5 bg-primary text-primary-foreground text-sm font-semibold rounded-xl hover:opacity-90 transition-opacity shadow-sm disabled:opacity-50 flex items-center gap-2"
					>
						{#if isSubmitting}
							<span class="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin"></span>
							Saving...
						{:else}
							Save Transaction
						{/if}
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}
