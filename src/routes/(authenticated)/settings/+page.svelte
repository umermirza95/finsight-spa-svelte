<script lang="ts">
	import PushNotifications from '$lib/components/PushNotifications.svelte';
	import { Settings, Shield, BellRing, Smartphone } from 'lucide-svelte';
</script>

<svelte:head>
	<title>Settings | Finsight</title>
</svelte:head>

<div class="max-w-4xl mx-auto space-y-8">
	<div class="grid grid-cols-1 md:grid-cols-4 gap-6">
		<!-- Sidebar navigation for settings -->
		<div class="flex overflow-x-auto md:flex-col col-span-1 gap-2 md:gap-0 md:space-y-1 pb-2 md:pb-0 scrollbar-hide">
			<button class="shrink-0 w-auto md:w-full flex items-center gap-2 md:gap-3 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium transition-colors">
				<BellRing size={16} />
				Notifications
			</button>
			<button class="shrink-0 w-auto md:w-full flex items-center gap-2 md:gap-3 px-4 py-2.5 rounded-xl hover:bg-muted text-primary/70 hover:text-primary text-sm font-medium transition-colors">
				<Shield size={16} />
				Security
			</button>
			<button class="shrink-0 w-auto md:w-full flex items-center gap-2 md:gap-3 px-4 py-2.5 rounded-xl hover:bg-muted text-primary/70 hover:text-primary text-sm font-medium transition-colors">
				<Smartphone size={16} />
				Devices
			</button>
		</div>

		<!-- Settings content area -->
		<div class="col-span-1 md:col-span-3 space-y-6">
			<div class="bg-card border border-border/60 rounded-2xl p-6 shadow-sm">
				<div class="flex items-start gap-4 mb-6">
					<div class="w-10 h-10 rounded-full bg-brand-blue/20 flex items-center justify-center text-primary shrink-0 mt-1">
						<BellRing size={20} />
					</div>
					<div>
						<h3 class="text-lg font-semibold text-primary">Push Notifications</h3>
						<p class="text-sm text-muted-foreground mt-1">
							Receive real-time alerts about your portfolio, budget limits, and system updates directly on this device.
						</p>
					</div>
				</div>
				
				<div class="pl-0 md:pl-14">
					<PushNotifications />
				</div>
			</div>
		</div>
	</div>
</div>
