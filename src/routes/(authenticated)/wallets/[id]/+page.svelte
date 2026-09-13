<script lang="ts">
	import { page } from '$app/stores';
	import TransactionsView from '$lib/components/TransactionsView.svelte';
</script>

<TransactionsView walletId={$page.params.id} />
