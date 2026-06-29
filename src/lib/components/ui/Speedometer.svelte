<script lang="ts">
  let { value = 0, max = 100 } = $props();

  let ratio = $derived(max > 0 ? Math.min(Math.max(value / max, 0), 1) : 0);
  let angle = $derived(-90 + (ratio * 180));
  
  let activeColor = $derived(
    ratio < 0.5 ? '#22c55e' : 
    ratio < 0.8 ? '#eab308' : 
    '#ef4444'
  );
</script>

<div class="relative w-full min-w-[200px] max-w-[320px] aspect-[2/1] flex flex-col items-center justify-end overflow-visible" aria-label="Capital Deployment Speedometer">
  <svg viewBox="-10 -15 120 75" class="w-full h-full overflow-visible drop-shadow-xl">
    <defs>
      <!-- Glow Filter -->
      <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur stdDeviation="3" result="blur" />
        <feMerge>
          <feMergeNode in="blur" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
      <!-- Track Gradient -->
      <linearGradient id="track-grad" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="#22c55e" stop-opacity="0.1" />
        <stop offset="50%" stop-color="#eab308" stop-opacity="0.1" />
        <stop offset="100%" stop-color="#ef4444" stop-opacity="0.1" />
      </linearGradient>
    </defs>

    <!-- Background Arc -->
    <path d="M 10 50 A 40 40 0 0 1 90 50" fill="none" stroke="url(#track-grad)" stroke-width="14" stroke-linecap="round" />
    
    <!-- Ticks -->
    <g stroke="currentColor" class="text-foreground/20" stroke-width="1.5">
      {#each Array(11) as _, i}
        {@const tickAngle = -180 + (i * 18)}
        <line 
          x1="50" y1="50" 
          x2="50" y2="10" 
          style="transform: rotate({tickAngle + 90}deg); transform-origin: 50px 50px;" 
          stroke-dasharray="0 32 8 0" 
        />
      {/each}
    </g>

    <!-- Glowing Arcs -->
    <g filter="url(#glow)">
      <!-- Green Arc (0-50%) -->
      <path d="M 10 50 A 40 40 0 0 1 50 10" fill="none" stroke="#22c55e" stroke-width="14" stroke-linecap="round" class="transition-opacity duration-500 {ratio < 0.5 ? 'opacity-100' : 'opacity-40'}" />
      <!-- Yellow Arc (50-80%) -->
      <path d="M 50 10 A 40 40 0 0 1 82.36 26.49" fill="none" stroke="#eab308" stroke-width="14" stroke-linecap="round" class="transition-opacity duration-500 {ratio >= 0.5 && ratio < 0.8 ? 'opacity-100' : 'opacity-40'}" />
      <!-- Red Arc (80-100%) -->
      <path d="M 82.36 26.49 A 40 40 0 0 1 90 50" fill="none" stroke="#ef4444" stroke-width="14" stroke-linecap="round" class="transition-opacity duration-500 {ratio >= 0.8 ? 'opacity-100' : 'opacity-40'}" />
    </g>

    <!-- Shadow for Needle Base -->
    <circle cx="50" cy="50" r="9" fill="black" opacity="0.4" style="filter: blur(2px);" />

    <!-- Sleek Needle -->
    <g style="transform: rotate({angle}deg); transform-origin: 50px 50px;" class="transition-transform duration-1000 ease-[cubic-bezier(0.34,1.56,0.64,1)]">
      <!-- Main Needle Blade -->
      <path d="M 47 50 L 53 50 L 51 5 L 49 5 Z" fill="{activeColor}" class="transition-colors duration-1000" />
      <!-- Inner Highlight -->
      <path d="M 49.5 50 L 50.5 50 L 50.2 10 L 49.8 10 Z" fill="rgba(255,255,255,0.5)" />
      
      <!-- Central Hub -->
      <circle cx="50" cy="50" r="8" fill="{activeColor}" class="transition-colors duration-1000" />
      <circle cx="50" cy="50" r="5" fill="currentColor" class="text-card transition-colors duration-1000" />
      <circle cx="50" cy="50" r="2" fill="currentColor" class="text-foreground" />
    </g>
  </svg>
</div>
