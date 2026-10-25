<script lang="ts">
	import { goto } from '$app/navigation'
	import { page } from '$app/state'
	import { authClient } from '#lib/modules/auth/client/client.js'
	import { Button } from '#lib/components/ui/button/index.js'
	import { Input } from '#lib/components/ui/input/index.js'
	import { Card } from '#lib/components/ui/card/index.js'
	import { Alert, AlertDescription } from '#lib/components/ui/alert/index.js'
	import { CircleCheck, CircleAlert, Loader, Copy, Check } from '@lucide/svelte'
	import { logger } from '#lib/platform/logger.js'

	let token = $state('')
	let isLoading = $state(false)
	let error = $state('')
	let success = $state(false)
	let copied = $state(false)
	let hasTokenFromUrl = $state(false)

	// Get token from URL if present
	$effect(() => {
		const urlToken = page.url.searchParams.get('token')
		if (urlToken) {
			token = urlToken
			hasTokenFromUrl = true
			// Auto-verify if token is in URL
			verifyMagicLink()
		}
	})

	/**
	 * Verify magic link token
	 */
	async function verifyMagicLink() {
		error = ''
		success = false

		if (!token) {
			error = 'Please enter a verification code'
			return
		}

		isLoading = true

		try {
			const { data: result, error: verifyError } = await authClient.magicLink.verify({
				query: {
					token,
					callbackURL: '/auth/dashboard',
				},
			})

			if (verifyError) {
				error = verifyError.message || 'Invalid or expired verification code. Please try again.'
				isLoading = false
				return
			}

			// Success
			success = true

			// Redirect after 2 seconds
			setTimeout(() => {
				goto('/auth/dashboard')
			}, 2000)
		} catch (err) {
			error = err instanceof Error ? err.message : 'An unexpected error occurred'
			logger.error('One Time Password link verification error:', err)
		} finally {
			isLoading = false
		}
	}

	/**
	 * Handle form submission
	 */
	function handleSubmit(e: SubmitEvent) {
		e.preventDefault()
		verifyMagicLink()
	}

	/**
	 * Copy token to clipboard
	 */
	async function copyToClipboard() {
		try {
			await navigator.clipboard.writeText(token)
			copied = true
			setTimeout(() => {
				copied = false
			}, 2000)
		} catch (err) {
			logger.error('Failed to copy:', err)
		}
	}

	/**
	 * Handle "Back to sign in" action
	 */
	function handleBackToSignIn() {
		goto('/auth/sign-in-magic-link')
	}
</script>

<div class="flex flex-1 flex-col items-center justify-center px-6 py-12">
	<div class="w-full max-w-md">
		<!-- Header -->
		<div class="mb-8 text-center">
			<div class="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100">
				<CircleCheck class="h-6 w-6 text-blue-600" />
			</div>
			<h1 class="mb-2 text-3xl font-bold text-gray-900">Verify Magic Link</h1>
			<p class="text-gray-600">Enter the verification code from your email</p>
		</div>

		<!-- Success State -->
		{#if success}
			<Card class="mb-6 border-green-200 bg-green-50 p-6">
				<div class="flex items-start gap-3">
					<CircleCheck class="mt-0.5 h-5 w-5 shrink-0 text-green-600" />
					<div class="flex-1">
						<h3 class="mb-1 font-semibold text-green-900">Sign in successful!</h3>
						<p class="text-sm text-green-800">Redirecting you to your profile...</p>
					</div>
				</div>
			</Card>
		{:else if hasTokenFromUrl && isLoading}
			<!-- Auto-verifying from URL -->
			<Card class="mb-6 border-blue-200 bg-blue-50 p-6">
				<div class="flex items-center gap-3">
					<Loader class="h-5 w-5 animate-spin text-blue-600" />
					<div>
						<h3 class="font-semibold text-blue-900">Verifying your magic link...</h3>
						<p class="text-sm text-blue-800">Please wait while we sign you in.</p>
					</div>
				</div>
			</Card>
		{:else if hasTokenFromUrl && error}
			<!-- Error during auto-verification -->
			<Card class="mb-6 border-red-200 bg-red-50 p-6">
				<div class="flex items-start gap-3">
					<CircleAlert class="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
					<div class="flex-1">
						<h3 class="mb-1 font-semibold text-red-900">Verification failed</h3>
						<p class="text-sm text-red-800">{error}</p>
					</div>
				</div>
			</Card>
			<!-- Back to Sign In -->
			<div class="text-center">
				<Button
					variant="ghost"
					onclick={handleBackToSignIn}
					class="text-blue-600 hover:bg-blue-50 hover:text-blue-700"
				>
					← Back to sign in
				</Button>
			</div>
		{:else}
			<!-- Verification Form (for manual entry) -->
			<Card class="mb-6 p-6">
				<form onsubmit={handleSubmit} class="space-y-4">
					<!-- Token Input -->
					<div class="space-y-2">
						<label for="token" class="block text-sm font-medium text-gray-700"
							>Verification code</label
						>
						<div class="flex gap-2">
							<Input
								id="token"
								type="text"
								placeholder="Enter code from email"
								bind:value={token}
								disabled={isLoading}
								required
								class="flex-1"
							/>
							{#if token}
								<Button
									type="button"
									variant="outline"
									size="icon"
									onclick={copyToClipboard}
									title="Copy to clipboard"
								>
									{#if copied}
										<Check class="h-4 w-4 text-green-600" />
									{:else}
										<Copy class="h-4 w-4" />
									{/if}
								</Button>
							{/if}
						</div>
					</div>

					<!-- Error Alert -->
					{#if error}
						<Alert variant="destructive">
							<CircleAlert class="h-4 w-4" />
							<AlertDescription>{error}</AlertDescription>
						</Alert>
					{/if}

					<!-- Submit Button -->
					<Button
						type="submit"
						disabled={isLoading || !token}
						class="w-full bg-blue-600 text-white hover:bg-blue-700"
					>
						{#if isLoading}
							<Loader class="h-4 w-4 animate-spin" />
							Verifying...
						{:else}
							<CircleCheck class="h-4 w-4" />
							Verify code
						{/if}
					</Button>
				</form>
			</Card>

			<!-- Info Box -->
			<Card class="mb-6 border-blue-200 bg-blue-50 p-4">
				<p class="text-sm text-blue-900">
					<strong>Didn't receive an email?</strong> Check your spam folder or try sending a new magic
					link.
				</p>
			</Card>

			<!-- Back to Sign In -->
			<div class="text-center">
				<Button
					variant="ghost"
					onclick={handleBackToSignIn}
					class="text-blue-600 hover:bg-blue-50 hover:text-blue-700"
				>
					← Back to sign in
				</Button>
			</div>
		{/if}
	</div>
</div>

<style>
	:global(body) {
		background: linear-gradient(to bottom right, rgb(241, 245, 249), rgb(226, 232, 240));
	}
</style>
