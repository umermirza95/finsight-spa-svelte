<script lang="ts">
    import { RefreshCw, Play, TrendingUp } from 'lucide-svelte';

    // State
    let ticker = $state('AAPL');
    let dateStr = $state('20231010'); // e.g. YYYYMMDD
    let percentage = $state(0.5); // percentage change
    let onlyRTH = $state(false); // regular trading hours only
    
    let loading = $state(false);
    let error = $state<string | null>(null);
    let historicalData = $state<any[]>([]);
    let bricks = $state<any[]>([]);

    // Form submission
    async function fetchData() {
        if (!ticker || !dateStr || !percentage) return;
        
        loading = true;
        error = null;
        historicalData = [];
        bricks = [];

        try {
            const res = await fetch('/local-api/ibkr/historical', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ticker, dateStr, onlyRTH })
            });

            const json = await res.json();
            
            if (!res.ok) {
                throw new Error(json.error || 'Failed to fetch data');
            }

            historicalData = json.data || [];
            if (historicalData.length > 0) {
                calculateRenko();
            } else {
                error = 'No data returned for this date and ticker.';
            }

        } catch (e: any) {
            error = e.message;
        } finally {
            loading = false;
        }
    }

    function calculateRenko() {
        if (!historicalData || historicalData.length === 0) return;

        // Base price is the first valid close price
        const basePrice = historicalData[0].close;
        const brickSize = basePrice * (percentage / 100);

        if (brickSize <= 0) {
            error = "Brick size must be greater than 0";
            return;
        }

        const newBricks = [];
        let lastBrickTop = basePrice;
        let lastBrickBottom = basePrice;
        let currentDirection: 'UP' | 'DOWN' | null = null;

        for (const bar of historicalData) {
            const price = bar.close;

            if (currentDirection === null) {
                // Initial state
                if (price >= basePrice + brickSize) {
                    const bricksToForm = Math.floor((price - basePrice) / brickSize);
                    for(let i=0; i<bricksToForm; i++) {
                        const open = basePrice + i * brickSize;
                        const close = open + brickSize;
                        newBricks.push({ type: 'UP', open, close, time: bar.time });
                    }
                    currentDirection = 'UP';
                    lastBrickTop = basePrice + bricksToForm * brickSize;
                    lastBrickBottom = lastBrickTop - brickSize;
                } else if (price <= basePrice - brickSize) {
                    const bricksToForm = Math.floor((basePrice - price) / brickSize);
                    for(let i=0; i<bricksToForm; i++) {
                        const open = basePrice - i * brickSize;
                        const close = open - brickSize;
                        newBricks.push({ type: 'DOWN', open, close, time: bar.time });
                    }
                    currentDirection = 'DOWN';
                    lastBrickBottom = basePrice - bricksToForm * brickSize;
                    lastBrickTop = lastBrickBottom + brickSize;
                }
            } else if (currentDirection === 'UP') {
                if (price >= lastBrickTop + brickSize) {
                    // Continue UP
                    const bricksToForm = Math.floor((price - lastBrickTop) / brickSize);
                    for (let i=0; i<bricksToForm; i++) {
                        const open = lastBrickTop + i * brickSize;
                        const close = open + brickSize;
                        newBricks.push({ type: 'UP', open, close, time: bar.time });
                    }
                    lastBrickTop += bricksToForm * brickSize;
                    lastBrickBottom = lastBrickTop - brickSize;
                } else if (price <= lastBrickBottom - brickSize) {
                    // Reversal DOWN
                    const bricksToForm = Math.floor((lastBrickBottom - price) / brickSize);
                    for (let i=0; i<bricksToForm; i++) {
                        const open = lastBrickBottom - i * brickSize;
                        const close = open - brickSize;
                        newBricks.push({ type: 'DOWN', open, close, time: bar.time });
                    }
                    currentDirection = 'DOWN';
                    lastBrickBottom -= bricksToForm * brickSize;
                    lastBrickTop = lastBrickBottom + brickSize;
                }
            } else if (currentDirection === 'DOWN') {
                if (price <= lastBrickBottom - brickSize) {
                    // Continue DOWN
                    const bricksToForm = Math.floor((lastBrickBottom - price) / brickSize);
                    for (let i=0; i<bricksToForm; i++) {
                        const open = lastBrickBottom - i * brickSize;
                        const close = open - brickSize;
                        newBricks.push({ type: 'DOWN', open, close, time: bar.time });
                    }
                    lastBrickBottom -= bricksToForm * brickSize;
                    lastBrickTop = lastBrickBottom + brickSize;
                } else if (price >= lastBrickTop + brickSize) {
                    // Reversal UP
                    const bricksToForm = Math.floor((price - lastBrickTop) / brickSize);
                    for (let i=0; i<bricksToForm; i++) {
                        const open = lastBrickTop + i * brickSize;
                        const close = open + brickSize;
                        newBricks.push({ type: 'UP', open, close, time: bar.time });
                    }
                    currentDirection = 'UP';
                    lastBrickTop += bricksToForm * brickSize;
                    lastBrickBottom = lastBrickTop - brickSize;
                }
            }
        }
        bricks = newBricks;
    }

    // Reactively recalculate if percentage changes while data exists
    $effect(() => {
        if (percentage && historicalData.length > 0) {
            calculateRenko();
        }
    });

    // Chart dimensions
    const svgWidth = 800;
    const svgHeight = 400;
    const brickWidth = 10;
    const brickSpacing = 0; // Classic Renko bricks touch perfectly

    let totalWidth = $derived(bricks.length * (brickWidth + brickSpacing) + 50);
    let maxPrice = $derived(Math.max(...bricks.map(b => Math.max(b.open, b.close)), historicalData[0]?.close || 0));
    let minPrice = $derived(Math.min(...bricks.map(b => Math.min(b.open, b.close)), historicalData[0]?.close || 0));
    let greenBricksCount = $derived(bricks.filter(b => b.type === 'UP').length);
    
    // Add some padding to Y axis
    let yRange = $derived((maxPrice - minPrice) || 1);
    let yPadding = $derived(yRange * 0.1);
    let yMin = $derived(minPrice - yPadding);
    let yMax = $derived(maxPrice + yPadding);
    let actualYRange = $derived(yMax - yMin);

    function getY(price: number) {
        return svgHeight - ((price - yMin) / actualYRange) * svgHeight;
    }
</script>

<div class="bg-card border border-border/50 rounded-3xl shadow-sm overflow-hidden flex flex-col mb-8">
    <div class="p-4 md:p-6 border-b border-border/50 flex items-center justify-between w-full bg-card/50">
        <div class="flex items-center gap-3">
            <TrendingUp class="text-foreground w-6 h-6" />
            <h2 class="text-xl font-bold text-foreground">
                Renko Historical Analyzer
            </h2>
            {#if bricks.length > 0}
                <div class="flex items-center gap-2 ml-2">
                    <span class="px-2.5 py-0.5 rounded-full bg-secondary text-secondary-foreground text-sm font-semibold">
                        {bricks.length} Total
                    </span>
                    <span class="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-sm font-semibold">
                        {greenBricksCount} Green
                    </span>
                </div>
            {/if}
        </div>
    </div>

    <div class="p-4 md:p-6 space-y-6">
        <!-- Controls -->
        <div class="flex flex-wrap gap-4 items-end bg-background border border-border/60 p-4 rounded-xl">
            <div class="space-y-2 flex-1 min-w-[150px]">
                <label class="text-sm font-medium text-foreground">Ticker</label>
                <input type="text" bind:value={ticker} placeholder="e.g. AAPL" class="w-full h-10 px-3 bg-background border border-border/60 rounded-xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 uppercase" />
            </div>
            
            <div class="space-y-2 flex-1 min-w-[150px]">
                <label class="text-sm font-medium text-foreground">Date (YYYYMMDD)</label>
                <input type="text" bind:value={dateStr} placeholder="20231010" class="w-full h-10 px-3 bg-background border border-border/60 rounded-xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" />
            </div>

            <div class="space-y-2 flex-1 min-w-[150px]">
                <label class="text-sm font-medium text-foreground">Brick Size (%)</label>
                <input type="number" step="0.01" bind:value={percentage} class="w-full h-10 px-3 bg-background border border-border/60 rounded-xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" />
            </div>
            
            <div class="flex items-center gap-2 mb-2 sm:mb-0 h-10 px-2 min-w-[150px]">
                <input type="checkbox" id="onlyRTH" bind:checked={onlyRTH} class="w-4 h-4 rounded border-border/60 text-primary focus:ring-primary/50 cursor-pointer" />
                <label for="onlyRTH" class="text-sm font-medium text-foreground cursor-pointer whitespace-nowrap">RTH Only</label>
            </div>

            <button 
                class="w-full sm:w-auto h-10 px-6 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-xl flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                onclick={fetchData}
                disabled={loading}
            >
                {#if loading}
                    <RefreshCw class="w-5 h-5 animate-spin" />
                    Fetching...
                {:else}
                    <Play class="w-5 h-5" />
                    Analyze
                {/if}
            </button>
        </div>

        <!-- Error Message -->
        {#if error}
            <div class="p-4 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-xl flex items-center gap-3">
                <span class="block sm:inline">{error}</span>
            </div>
        {/if}

        <!-- Chart Area -->
        <div class="relative w-full h-[500px] bg-background rounded-xl border border-border/60 overflow-x-auto overflow-y-hidden shadow-inner custom-scrollbar">
            {#if loading}
                <div class="absolute inset-0 flex flex-col items-center justify-center bg-card/40 backdrop-blur-sm z-10">
                    <RefreshCw class="w-10 h-10 text-primary animate-spin mb-4" />
                    <p class="text-primary font-medium">Connecting to IB Gateway & Fetching History...</p>
                </div>
            {:else if bricks.length > 0}
                <svg width={Math.max(totalWidth, svgWidth)} height={svgHeight} class="min-h-[400px] my-4 mx-4">
                    <!-- Grid lines -->
                    {#each Array.from({length: 10}) as _, i}
                        <line 
                            x1="0" 
                            y1={svgHeight * (i/10)} 
                            x2={Math.max(totalWidth, svgWidth)} 
                            y2={svgHeight * (i/10)} 
                            stroke="currentColor" 
                            class="text-border opacity-50"
                            stroke-width="1"
                        />
                        <!-- Price labels -->
                        <text 
                            x="10" 
                            y={(svgHeight * (i/10)) - 5} 
                            fill="currentColor" 
                            class="text-muted-foreground"
                            font-size="10" 
                            font-family="monospace"
                        >
                            {(yMax - (actualYRange * (i/10))).toFixed(2)}
                        </text>
                    {/each}

                    <!-- Bricks -->
                    {#each bricks as brick, index}
                        {@const x = index * (brickWidth + brickSpacing) + 50}
                        {@const yTop = getY(Math.max(brick.open, brick.close))}
                        {@const yBottom = getY(Math.min(brick.open, brick.close))}
                        {@const height = Math.abs(yBottom - yTop) || 1}
                        {@const isUp = brick.type === 'UP'}
                        
                        <g class="transition-opacity duration-300 hover:opacity-80 cursor-crosshair">
                            <!-- Brick Body -->
                            <rect 
                                {x} 
                                y={yTop} 
                                width={brickWidth} 
                                {height} 
                                fill={isUp ? '#26a69a' : '#ef5350'} 
                                stroke={isUp ? '#26a69a' : '#ef5350'}
                                stroke-width="1"
                                rx="0"
                            />
                            
                            <!-- Tooltip on hover -->
                            <title>
                                Time: {brick.time}
                                Type: {brick.type}
                                Open: {brick.open.toFixed(2)}
                                Close: {brick.close.toFixed(2)}
                            </title>
                        </g>
                    {/each}
                </svg>
            {:else if historicalData.length > 0 && bricks.length === 0}
                <div class="absolute inset-0 flex items-center justify-center">
                    <p class="text-muted-foreground font-medium">Price didn't move enough to form any bricks at {percentage}%.</p>
                </div>
            {:else}
                <div class="absolute inset-0 flex items-center justify-center">
                    <p class="text-muted-foreground font-medium">Enter parameters and analyze to view chart.</p>
                </div>
            {/if}
        </div>
    </div>
</div>

<style>
    .custom-scrollbar::-webkit-scrollbar {
        height: 8px;
    }
    .custom-scrollbar::-webkit-scrollbar-track {
        background: hsl(var(--border) / 0.3);
        border-radius: 8px;
    }
    .custom-scrollbar::-webkit-scrollbar-thumb {
        background: hsl(var(--muted-foreground) / 0.3);
        border-radius: 8px;
    }
    .custom-scrollbar::-webkit-scrollbar-thumb:hover {
        background: hsl(var(--muted-foreground) / 0.5);
    }
</style>
