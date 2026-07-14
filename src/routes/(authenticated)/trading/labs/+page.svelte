<script lang="ts">
    import RenkoChartWidget from '$lib/components/trading/RenkoChartWidget.svelte';
</script>

<svelte:head>
    <title>Trading Labs | Finsight</title>
</svelte:head>

<div class="space-y-8 pb-12">
    <!-- Widgets Grid -->
    <div class="grid grid-cols-1 gap-8">
        <!-- Renko Chart Widget -->
        <RenkoChartWidget />
        
        <!-- Future widgets can go here -->
    </div>
</div>
