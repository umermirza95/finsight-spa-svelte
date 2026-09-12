<script lang="ts">
	import { Button } from "$lib/components/ui/button";
	import PushNotifications from "$lib/components/PushNotifications.svelte";
</script>

<div class="flex min-h-screen flex-col items-center justify-center bg-background p-4">
	<div class="text-center space-y-4 w-full max-w-md">
		<h1 class="text-4xl font-bold tracking-tight">Welcome to FinSight</h1>
		<p class="text-muted-foreground">A modern SPA built with SvelteKit, Tailwind, and Shadcn.</p>
		<div class="pb-8">
			<Button>Get Started</Button>
		</div>
		<PushNotifications />
	</div>
</div>
