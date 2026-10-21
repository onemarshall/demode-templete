<!-- src/routes/auth/(sign-in)/sign-in/+page.svelte -->
<script lang="ts">
	import { login } from '$lib/remote/auth.remote';
	import AuthForm from '$lib/components/forms/auth/AuthForm.svelte';
</script>

<AuthForm mode="sign-in" formAction={login} />
