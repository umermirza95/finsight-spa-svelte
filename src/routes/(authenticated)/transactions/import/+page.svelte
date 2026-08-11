<script lang="ts">
	import { onMount } from 'svelte';
	import { apiFetch } from '$lib/api';
	import { Upload, Trash2, ArrowLeft, Save, ChevronDown, MoreVertical, Edit2 } from 'lucide-svelte';
	import TransactionPopup from '$lib/components/TransactionPopup.svelte';

	let importedTransactions = $state<any[]>([]);
	let categories = $state<any[]>([]);
	let isLoading = $state(true);
	let isUploading = $state(false);
	let errorMessage = $state('');

	let selectedIds = $state<Set<string>>(new Set());
	let isAllSelected = $derived(
		importedTransactions.length > 0 && selectedIds.size === importedTransactions.length
	);

	let isPopupOpen = $state(false);
	let selectedTx = $state<any>(null);

	let isActionsOpen = $state(false);
	let activeDropdownId = $state<string | null>(null);

	let fileInput: HTMLInputElement;

	async function loadData() {
		isLoading = true;
		errorMessage = '';
		try {
			const token = localStorage.getItem('authToken');
			
			// Load categories for the popup
			const catRes = await apiFetch('/api/Category', {
				headers: { 'Authorization': `Bearer ${token}` }
			});
			if (catRes.ok) {
				const catData = await catRes.json();
				categories = catData.data?.categories || [];
			}

			const res = await apiFetch('/api/ImportTransaction/imported', {
				headers: { 'Authorization': `Bearer ${token}` }
			});
			
			if (!res.ok) {
				const errorText = await res.text().catch(() => '');
				let errorMessage = `Failed to fetch imported transactions (Status: ${res.status})`;
				try {
					const errorJson = JSON.parse(errorText);
					errorMessage = errorJson.error || errorJson.message || errorMessage;
				} catch {
					// Not JSON, might be a redirect or plain text error
					if (errorText) errorMessage += ` - ${errorText.substring(0, 100)}`;
				}
				throw new Error(errorMessage);
			}
			
			const data = await res.json();
			importedTransactions = data.data?.transactions || [];
			selectedIds.clear();

		} catch (e: any) {
			errorMessage = e.message;
		} finally {
			isLoading = false;
		}
	}

	onMount(() => {
		loadData();
		document.addEventListener('click', handleOutsideClick);
		return () => {
			document.removeEventListener('click', handleOutsideClick);
		};
	});

	function handleOutsideClick(event: MouseEvent) {
		const target = event.target as HTMLElement;
		if (!target.closest('.actions-dropdown-container')) {
			isActionsOpen = false;
		}
		if (!target.closest('.row-dropdown-container')) {
			activeDropdownId = null;
		}
	}

	async function handleFileUpload(event: Event) {
		const target = event.target as HTMLInputElement;
		if (!target.files || target.files.length === 0) return;

		const file = target.files[0];
		if (file.type !== 'application/pdf') {
			alert('Please select a PDF file.');
			return;
		}

		isUploading = true;
		errorMessage = '';

		const formData = new FormData();
		formData.append('file', file);

		try {
			const token = localStorage.getItem('authToken');
			const res = await apiFetch('/api/ImportTransaction/upload', {
				method: 'POST',
				headers: { 'Authorization': `Bearer ${token}` },
				body: formData
			});
			if (!res.ok) {
				const errorData = await res.json().catch(() => null);
				throw new Error(errorData?.error || errorData?.message || `Upload failed with status ${res.status}`);
			}
			const result = await res.json();
			
			// Optional: verify if we got transactions back or an empty list
			const newTransactions = result.data?.transactions || [];
			if (newTransactions.length === 0) {
				alert('No transactions could be extracted from this PDF. Please check the file format.');
			}
			
			await loadData();
		} catch (e: any) {
			errorMessage = e.message;
			alert(`Upload failed: ${e.message}`);
		} finally {
			isUploading = false;
			if (fileInput) fileInput.value = '';
		}
	}

	function toggleSelectAll() {
		if (isAllSelected) {
			selectedIds.clear();
		} else {
			importedTransactions.forEach(tx => selectedIds.add(tx.id));
		}
	}

	function toggleSelect(id: string) {
		if (selectedIds.has(id)) {
			selectedIds.delete(id);
		} else {
			selectedIds.add(id);
		}
	}

	function batchSaveSelected() {
		if (selectedIds.size === 0) return;

		const selectedItems = importedTransactions.filter(tx => selectedIds.has(tx.id));
		if (selectedItems.length === 0) return;

		const firstTx = selectedItems[0];
		const type = firstTx.type;
		const currency = firstTx.fsCurrencyCode;

		// Validate all have same type and currency
		const hasMismatch = selectedItems.some(tx => tx.type !== type || tx.fsCurrencyCode !== currency);
		if (hasMismatch) {
			alert('All selected transactions must have the same Type (Income/Expense) and Currency to be batched.');
			return;
		}

		const sumAmount = selectedItems.reduce((sum, tx) => sum + tx.amount, 0);

		selectedTx = {
			id: Array.from(selectedIds),
			amount: sumAmount,
			currency: currency,
			date: firstTx.date,
			type: type,
			comment: firstTx.description
		};
		activeDropdownId = null;
		isActionsOpen = false;
		isPopupOpen = true;
	}

	async function deleteSelected() {
		if (selectedIds.size === 0) return;
		if (!confirm(`Are you sure you want to delete ${selectedIds.size} transactions?`)) return;

		try {
			const token = localStorage.getItem('authToken');
			const res = await apiFetch('/api/ImportTransaction/imported/delete-multiple', {
				method: 'POST',
				headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
				body: JSON.stringify(Array.from(selectedIds))
			});
			if (!res.ok) throw new Error('Failed to delete transactions');
			
			// Close dropdown
			isActionsOpen = false;
			selectedIds.clear();
			
			await loadData();
		} catch (e: any) {
			alert(`Error: ${e.message}`);
		}
	}

	async function deleteItem(id: string) {
		if (!confirm('Are you sure you want to delete this transaction?')) return;
		try {
			const token = localStorage.getItem('authToken');
			const res = await apiFetch(`/api/ImportTransaction/imported/${id}`, {
				method: 'DELETE',
				headers: { 'Authorization': `Bearer ${token}` }
			});
			if (!res.ok) throw new Error('Failed to delete transaction');
			await loadData();
		} catch (e: any) {
			alert(`Error: ${e.message}`);
		}
	}

	function openSavePopup(tx: any) {
		selectedTx = {
			id: tx.id,
			amount: tx.amount,
			currency: tx.fsCurrencyCode,
			date: tx.date,
			type: tx.type,
			comment: tx.description
		};
		activeDropdownId = null;
		isPopupOpen = true;
	}

	async function handleSaveSuccess() {
		isPopupOpen = false;
		selectedTx = null;
		await loadData();
	}
</script>

<div class="space-y-6 pb-12">
	<!-- Header & Toolbar -->
	<div class="flex items-center justify-between">
		<div class="flex items-center gap-4">
			<a href="/transactions" class="text-muted-foreground hover:text-foreground transition-colors p-2 rounded-full hover:bg-secondary/50">
				<ArrowLeft size={20} />
			</a>
			
		</div>

		<div class="flex items-center gap-3">
			<div class="relative actions-dropdown-container">
				<button 
					onclick={() => isActionsOpen = !isActionsOpen}
					class="flex items-center gap-2 px-4 py-2 bg-background border border-border/60 rounded-xl text-sm font-medium hover:bg-secondary/50 transition-colors h-10"
				>
					Actions
					<ChevronDown size={14} class="opacity-50" />
				</button>
				{#if isActionsOpen}
					<div class="absolute right-0 top-full mt-2 w-48 bg-popover border border-border/50 rounded-xl shadow-lg z-20 p-2">
						<button 
							onclick={() => { fileInput.click(); isActionsOpen = false; }} 
							class="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-lg hover:bg-secondary/50 transition-colors text-foreground font-medium"
							disabled={isUploading}
						>
							{#if isUploading}
								<span class="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></span>
								Uploading...
							{:else}
								<Upload size={16} />
								Select File
							{/if}
						</button>
						
						{#if selectedIds.size > 0}
							<div class="h-px bg-border/50 my-1"></div>
							<button 
								onclick={batchSaveSelected}
								class="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-lg hover:bg-primary/10 text-primary transition-colors font-medium"
							>
								<Save size={16} />
								Save Selected ({selectedIds.size})
							</button>
							<button 
								onclick={deleteSelected}
								class="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-lg hover:bg-destructive/10 text-destructive transition-colors font-medium"
							>
								<Trash2 size={16} />
								Delete Selected ({selectedIds.size})
							</button>
						{/if}
					</div>
				{/if}
			</div>
			
			<input 
				type="file" 
				accept=".pdf" 
				class="hidden" 
				bind:this={fileInput}
				onchange={handleFileUpload}
			/>
		</div>
	</div>

	<!-- Content -->
	<div class="bg-card border border-border/50 rounded-3xl shadow-sm overflow-hidden">
		{#if isLoading}
			<div class="p-12 text-center text-muted-foreground">
				<span class="animate-spin inline-block rounded-full h-8 w-8 border-b-2 border-primary mb-4"></span>
				<p>Loading imported transactions...</p>
			</div>
		{:else if errorMessage}
			<div class="p-12 text-center text-destructive">
				<p>{errorMessage}</p>
			</div>
		{:else if importedTransactions.length === 0}
			<div class="p-12 text-center text-muted-foreground flex flex-col items-center">
				<div class="w-16 h-16 bg-secondary/50 rounded-full flex items-center justify-center mb-4">
					<Upload size={32} class="opacity-50" />
				</div>
				<h3 class="text-lg font-semibold text-foreground mb-2">No Imported Transactions</h3>
				<p class="max-w-md mx-auto">Upload a bank statement PDF to extract transactions using AI. They will appear here for review before saving permanently.</p>
			</div>
		{:else}
			<div class="overflow-x-auto">
				<table class="w-full text-left text-sm whitespace-nowrap">
					<thead class="bg-secondary/30 text-muted-foreground font-medium border-b border-border/50">
						<tr>
							<th class="p-4 w-12">
								<input 
									type="checkbox" 
									class="rounded border-border text-primary focus:ring-primary w-4 h-4 cursor-pointer"
									checked={isAllSelected}
									onchange={toggleSelectAll}
								/>
							</th>
							<th class="p-4">Date</th>
							<th class="p-4 w-full">Description</th>
							<th class="p-4">Type</th>
							<th class="p-4 text-right">Amount</th>
							<th class="p-4 text-center w-24">Actions</th>
						</tr>
					</thead>
					<tbody class="divide-y divide-border/50">
						{#each importedTransactions as tx (tx.id)}
							<tr class="hover:bg-secondary/20 transition-colors {selectedIds.has(tx.id) ? 'bg-secondary/10' : ''}">
								<td class="p-4">
									<input 
										type="checkbox" 
										class="rounded border-border text-primary focus:ring-primary w-4 h-4 cursor-pointer"
										checked={selectedIds.has(tx.id)}
										onchange={() => toggleSelect(tx.id)}
									/>
								</td>
								<td class="p-4 font-medium">{new Date(tx.date).toLocaleDateString()}</td>
								<td class="p-4 text-muted-foreground whitespace-normal" title={tx.description}>{tx.description}</td>
								<td class="p-4">
									<span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold {tx.type === 'income' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}">
										{tx.type}
									</span>
								</td>
								<td class="p-4 text-right font-semibold {tx.type === 'income' ? 'text-emerald-500' : 'text-foreground'}">
									{tx.fsCurrencyCode} {tx.amount.toLocaleString()}
								</td>
								<td class="p-4">
									<div class="relative row-dropdown-container flex justify-end">
										<button 
											onclick={() => activeDropdownId = activeDropdownId === tx.id ? null : tx.id}
											class="p-2 text-muted-foreground hover:bg-secondary/50 rounded-lg transition-colors"
										>
											<MoreVertical size={16} />
										</button>
										
										{#if activeDropdownId === tx.id}
											<div class="absolute right-0 top-full mt-1 w-36 bg-popover border border-border/50 rounded-xl shadow-lg z-20 p-2">
												<button 
													onclick={() => openSavePopup(tx)}
													class="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-lg hover:bg-secondary/50 transition-colors text-foreground font-medium"
												>
													<Edit2 size={14} />
													Save
												</button>
												<div class="h-px bg-border/50 my-1"></div>
												<button 
													onclick={() => { deleteItem(tx.id); activeDropdownId = null; }}
													class="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-lg hover:bg-destructive/10 text-destructive transition-colors font-medium"
												>
													<Trash2 size={14} />
													Delete
												</button>
											</div>
										{/if}
									</div>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{/if}
	</div>
</div>

{#if isPopupOpen}
	<!-- TransactionPopup has isOpen inside itself or it conditionally renders content, 
		 based on the signature it expects isOpen prop and callbacks. -->
	<TransactionPopup 
		isOpen={isPopupOpen}
		{categories} 
		transaction={selectedTx}
		isImported={true}
		onClose={() => isPopupOpen = false} 
		onSuccess={handleSaveSuccess} 
	/>
{/if}
