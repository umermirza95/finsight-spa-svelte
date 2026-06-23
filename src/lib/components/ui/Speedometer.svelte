<script lang="ts">
  let { value = 0, max = 100 } = $props();

  let ratio = $derived(max > 0 ? Math.min(Math.max(value / max, 0), 1) : 0);
  let angle = $derived(-90 + (ratio * 180));
</script>

<div class="relative w-24 h-12 flex flex-col items-center justify-end overflow-hidden" aria-label="Capital Deployment Speedometer">
  <svg viewBox="0 0 100 50" class="w-full h-full overflow-visible">
    <!-- Green Arc (0-50%) -->
    <path d="M 10 50 A 40 40 0 0 1 50 10" fill="none" stroke="#22c55e" stroke-width="12" stroke-linecap="butt" />
    <!-- Yellow Arc (50-80%) -->
    <path d="M 50 10 A 40 40 0 0 1 82.36 26.49" fill="none" stroke="#eab308" stroke-width="12" stroke-linecap="butt" />
    <!-- Red Arc (80-100%) -->
    <path d="M 82.36 26.49 A 40 40 0 0 1 90 50" fill="none" stroke="#ef4444" stroke-width="12" stroke-linecap="butt" />
    
    <!-- Needle -->
    <g style="transform: rotate({angle}deg); transform-origin: 50px 50px;" class="transition-transform duration-1000 ease-out">
      <polygon points="48,50 52,50 50,15" fill="currentColor" class="text-foreground" />
      <circle cx="50" cy="50" r="4" fill="currentColor" class="text-foreground" />
    </g>
  </svg>
</div>
