<script lang="ts">
	import { Button } from "$lib/components/ui/button";
	import { Input } from "$lib/components/ui/input";
	import { Mail, Lock, EyeOff, Eye } from "lucide-svelte";
	import { goto } from "$app/navigation";
	import { isAuthenticated } from "$lib/stores/auth";

	// Simple theme toggle for demonstration
	let isDark = $state(false);
	let showPassword = $state(false);

	let email = $state("");
	let password = $state("");
	let errorMessage = $state("");
	let isLoading = $state(false);

	function toggleTheme() {
		isDark = !isDark;
		if (isDark) {
			document.documentElement.classList.add("dark");
		} else {
			document.documentElement.classList.remove("dark");
		}
	}

	async function handleLogin(e: Event) {
		e.preventDefault();
		errorMessage = "";

		if (!email || !password) {
			errorMessage = "Please enter both email and password.";
			return;
		}

		isLoading = true;
		try {
			const res = await fetch("/api/Auth/login", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({ email, password }),
			});

			if (!res.ok) {
				const data = await res.json().catch(() => null);
				throw new Error(
					data?.title || data?.message || "Invalid credentials",
				);
			}

			const data = await res.json();
			localStorage.setItem("authToken", data.token);
			$isAuthenticated = true;
			goto("/dashboard");
		} catch (error) {
			if (error instanceof Error) {
				errorMessage = error.message;
			} else {
				errorMessage = String(error);
			}
		} finally {
			isLoading = false;
		}
	}
</script>

<div
	class="min-h-screen bg-brand-blue md:bg-brand-blue/30 flex flex-col md:items-center md:justify-center relative p-0 md:p-6 transition-colors duration-300"
>
	<!-- Theme Toggle -->
	<button
		onclick={toggleTheme}
		class="absolute top-4 right-6 text-sm font-medium z-50 px-4 py-2 bg-background/50 backdrop-blur-md rounded-full shadow-sm hover:bg-background/80 transition-colors"
	>
		Toggle Theme
	</button>

	<!-- Card wrapper -->
	<div
		class="flex flex-col md:flex-row md:bg-card md:rounded-[3rem] md:overflow-hidden md:shadow-2xl md:max-w-[1000px] md:w-full md:min-h-[600px] md:border md:border-border/50 flex-1 w-full transition-colors duration-300"
	>
		<!-- Blue section (Top on mobile, Left on desktop) -->
		<div
			class="bg-brand-blue px-8 pt-16 pb-28 md:p-14 md:pb-14 flex-1 md:flex-none md:w-5/12 flex flex-col md:m-2 md:rounded-[2.5rem] relative z-0 transition-colors duration-300"
		>
			<!-- Logo SVG Approximation -->
			<div class="w-12 h-12 mb-10 md:mb-16 relative">
				<div
					class="absolute w-10 h-4 bg-black dark:bg-white rounded-full rotate-45 top-2 -left-1"
				></div>
				<div
					class="absolute w-10 h-4 bg-white dark:bg-black rounded-full rotate-45 top-6 left-3"
				></div>
			</div>

			<h1
				class="text-5xl md:text-6xl font-bold tracking-tight text-brand-blue-foreground leading-[1.1] mt-auto mb-4 transition-colors duration-300"
			>
				Welcome<br />back!
			</h1>
		</div>

		<!-- White section (Bottom on mobile, Right on desktop) -->
		<div
			class="bg-card text-card-foreground rounded-t-[2.5rem] md:rounded-none px-8 py-10 md:p-16 flex flex-col flex-1 -mt-16 md:mt-0 relative z-10 shadow-[0_-10px_40px_rgba(0,0,0,0.05)] md:shadow-none md:justify-center md:w-7/12 transition-colors duration-300"
		>
			<h2 class="text-2xl md:text-4xl font-semibold mb-8 md:mb-12">
				Log In
			</h2>

			{#if errorMessage}
				<div
					class="bg-red-50 text-red-600 border border-red-200 rounded-xl p-4 mb-6 text-sm"
				>
					{errorMessage}
				</div>
			{/if}

			<form onsubmit={handleLogin} class="flex flex-col flex-1">
				<div class="space-y-5 mb-4">
					<div class="relative">
						<Mail
							class="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground"
						/>
						<Input
							type="email"
							placeholder="Email Address"
							bind:value={email}
							required
							class="pl-12 bg-secondary/40 border-border/50 focus-visible:ring-brand-blue rounded-2xl h-14 md:h-16 text-base"
						/>
					</div>
					<div class="relative">
						<Lock
							class="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground"
						/>
						<Input
							type={showPassword ? "text" : "password"}
							placeholder="Password"
							bind:value={password}
							required
							class="pl-12 pr-12 bg-secondary/40 border-border/50 focus-visible:ring-brand-blue rounded-2xl h-14 md:h-16 text-base"
						/>
						<button
							type="button"
							onclick={() => (showPassword = !showPassword)}
							class="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
						>
							{#if showPassword}
								<Eye class="w-5 h-5" />
							{:else}
								<EyeOff class="w-5 h-5" />
							{/if}
						</button>
					</div>
				</div>

				<div class="flex justify-end mb-8 md:mb-12">
					<a
						href="#"
						class="text-sm font-semibold hover:underline text-foreground"
						>Forgot Password?</a
					>
				</div>

				<Button
					type="submit"
					disabled={isLoading}
					class="w-full h-14 md:h-16 rounded-full text-lg mb-8 md:mb-12"
				>
					{isLoading ? "Logging in..." : "Login"}
				</Button>

				<p class="text-center text-sm text-muted-foreground mt-auto">
					Don't have an account? <a
						href="#"
						class="font-bold text-foreground hover:underline"
						>Sign up</a
					>
				</p>
			</form>
		</div>
	</div>
</div>
