<!-- src/routes/auth/(public)/sign-in/+page.svelte -->
<script lang="ts">
	import { login } from '#lib/modules/auth/remote/auth.remote.js';
	import AuthForm from '#lib/modules/auth/components/forms/auth/AuthForm.svelte';
</script>

<AuthForm mode="sign-in" formAction={login} />
