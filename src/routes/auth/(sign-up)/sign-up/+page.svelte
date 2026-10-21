<!-- src/routes/auth/(sign-up)/sign-up/+page.svelte -->
<script lang="ts">
	import { signup } from '$lib/remote/auth.remote';
	import AuthForm from '$lib/components/forms/auth/AuthForm.svelte';
</script>

<AuthForm mode="sign-up" formAction={signup} />
