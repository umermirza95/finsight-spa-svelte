<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { isAuthenticated } from '$lib/stores/auth';
	import { 
		LayoutDashboard, 
		ArrowRightLeft, 
		PieChart, 
		Briefcase, 
		TrendingUp,
		Search,
		Bell,
		Hexagon
	} from 'lucide-svelte';

	let { children } = $props();

	function handleLogout() {
		localStorage.removeItem('authToken');
		$isAuthenticated = false;
		goto('/login');
	}

	const navItems = [
		{ name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
		{ name: 'Transactions', path: '/transactions', icon: ArrowRightLeft },
		{ name: 'Budgets', path: '/budgets', icon: PieChart },
		{ name: 'Assets', path: '/assets', icon: Briefcase },
		{ name: 'Trading', path: '/trading', icon: TrendingUp },
	];

	let pageInfo = $derived.by(() => {
		const path = $page.url.pathname;
		if (path === '/' || path.startsWith('/dashboard')) return { title: 'Dashboard', desc: 'Your financial overview and recent activity.' };
		if (path.startsWith('/transactions')) return { title: 'Transactions', desc: 'Manage and monitor your institutional cash flow in real-time.' };
		if (path.startsWith('/budgets')) return { title: 'Budgets', desc: 'Track and manage your spending limits.' };
		if (path.startsWith('/assets')) return { title: 'Assets', desc: 'Monitor your portfolio and asset allocation.' };
		if (path.startsWith('/trading')) return { title: 'Trading', desc: 'Execute trades and monitor market movements.' };
		return { title: 'Overview', desc: 'Welcome back.' };
	});
</script>

<div class="flex h-screen w-full bg-background overflow-hidden relative">
	<!-- Sidebar (Desktop) -->
	<aside class="hidden lg:flex w-[280px] bg-brand-blue flex-shrink-0 flex-col pt-8 pb-10 rounded-[2.5rem] z-10 shadow-sm my-6 ml-6 h-[calc(100vh-3rem)]">
		<!-- Logo -->
		<div class="px-10 mb-12 flex items-center gap-3">
			<div class="w-10 h-10 bg-primary text-primary-foreground rounded-full flex items-center justify-center">
				<Hexagon size={20} fill="currentColor" />
			</div>
			<span class="font-bold text-xl tracking-tight text-primary">Finsight</span>
		</div>

		<!-- Navigation -->
		<nav class="flex-1 px-6 space-y-2">
			{#each navItems as item (item.path)}
				{@const isActive = $page.url.pathname === item.path || ($page.url.pathname === '/' && item.name === 'Dashboard')}
				<a 
					href={resolve(item.path)}
					class="flex items-center gap-4 px-5 py-4 rounded-[1.5rem] font-medium transition-all duration-200 {isActive ? 'bg-primary text-primary-foreground shadow-md' : 'text-primary/70 hover:bg-black/5 hover:text-primary'}"
				>
					<svelte:component this={item.icon} size={20} />
					{item.name}
				</a>
			{/each}
		</nav>

		<!-- Bottom section in sidebar (e.g. logout) -->
		<div class="px-6 mt-auto">
			<button 
				onclick={handleLogout} 
				class="w-full flex items-center gap-4 px-5 py-4 rounded-[1.5rem] font-medium text-primary/70 hover:bg-black/5 hover:text-primary transition-all duration-200"
			>
				Log Out
			</button>
		</div>
	</aside>

	<!-- Main Content Area -->
	<main class="flex-1 flex flex-col h-screen overflow-hidden bg-background">
		<!-- Topbar -->
		<header class="h-20 lg:h-28 px-6 lg:px-10 flex items-center justify-between shrink-0">
			<!-- Desktop Greeting -->
			<div class="hidden lg:block">
				<h1 class="text-3xl font-bold text-primary mb-1">{pageInfo.title}</h1>
				<p class="text-sm text-muted-foreground">{pageInfo.desc}</p>
			</div>
			
			<!-- Mobile Greeting -->
			<div class="flex lg:hidden items-center gap-3">
				<button class="w-10 h-10 rounded-full overflow-hidden border-2 border-transparent hover:border-primary transition-all shrink-0">
					<img src="https://i.pravatar.cc/150?u=a042581f4e29026704d" alt="Profile" class="w-full h-full object-cover" />
				</button>
				<div class="flex flex-col justify-center">
					<h1 class="text-base font-bold text-primary leading-tight mb-0.5">{pageInfo.title}</h1>
					<p class="text-[11px] text-muted-foreground line-clamp-1">{pageInfo.desc}</p>
				</div>
			</div>
			
			<div class="flex items-center gap-4 lg:gap-6">
				<!-- Search (Desktop) -->
				<div class="relative hidden lg:block">
					<div class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
						<Search size={18} class="text-muted-foreground" />
					</div>
					<input 
						type="text" 
						placeholder="Search something" 
						class="w-64 pl-11 pr-4 py-3 bg-secondary/50 border-none rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
					/>
				</div>

				<!-- Notifications -->
				<button class="w-10 h-10 lg:w-12 lg:h-12 rounded-full bg-secondary/50 lg:bg-secondary/50 flex items-center justify-center text-primary hover:bg-secondary transition-colors relative border-none lg:border-transparent">
					<Bell size={18} class="lg:hidden" />
					<Bell size={20} class="hidden lg:block" />
					<span class="absolute top-2.5 right-2.5 lg:top-3 lg:right-3 w-2 h-2 bg-destructive rounded-full"></span>
				</button>

				<!-- Profile Avatar (Desktop) -->
				<button class="hidden lg:block w-12 h-12 rounded-full overflow-hidden border-2 border-transparent hover:border-primary transition-all">
					<img src="https://i.pravatar.cc/150?u=a042581f4e29026704d" alt="Profile" class="w-full h-full object-cover" />
				</button>
			</div>
		</header>

		<!-- Page Content -->
		<div class="flex-1 overflow-y-auto px-6 lg:px-10 pb-6 lg:pb-10">
			{@render children()}
		</div>

		<!-- Mobile Bottom Navigation -->
		<nav class="lg:hidden shrink-0 bg-card border border-border/60 mx-4 mb-4 rounded-[1.5rem] px-2 py-2 flex items-center justify-between shadow-sm z-20">
			{#each navItems as item (item.path)}
				{@const isActive = $page.url.pathname === item.path || ($page.url.pathname === '/' && item.name === 'Dashboard')}
				<a 
					href={resolve(item.path)}
					class="flex flex-col items-center justify-center w-[4.5rem] h-14 rounded-2xl transition-all duration-200 {isActive ? 'bg-brand-blue text-primary' : 'text-muted-foreground hover:text-primary'}"
				>
					<svelte:component this={item.icon} size={20} class="mb-1 {isActive ? 'opacity-100' : 'opacity-70'}" />
					<span class="text-[10px] font-medium">{item.name}</span>
				</a>
			{/each}
		</nav>
	</main>
</div>
