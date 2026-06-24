<script lang="ts">
    import { Activity } from "lucide-svelte";

    let { ticker, fallbackClass = "bg-brand-blue/20 text-brand-blue-foreground" } = $props<{ ticker: string, fallbackClass?: string }>();

    const logoTickers = ['AAPL', 'NVDA', 'GOOGL', 'ASML'];
    const invertLogos = ['AAPL', 'NVDA', 'GOOGL'];
    
    let hasLogo = $derived(logoTickers.includes(ticker));
    let shouldInvert = $derived(invertLogos.includes(ticker));
</script>

<div class="w-8 h-8 rounded-lg flex items-center justify-center {hasLogo ? 'bg-transparent' : fallbackClass}">
    {#if hasLogo}
        <img src="/logos/{ticker}.svg" alt="{ticker} logo" class="w-full h-full object-contain {shouldInvert ? 'dark:invert opacity-80' : ''}" />
    {:else}
        <Activity size={16} />
    {/if}
</div>
