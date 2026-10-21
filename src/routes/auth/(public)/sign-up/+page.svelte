<!-- src/routes/auth/(public)/sign-up/+page.svelte -->
<script lang="ts">
	import { signup } from '#lib/remote/auth.remote.js';
	import AuthForm from '#lib/components/forms/auth/AuthForm.svelte';
</script>

<AuthForm mode="sign-up" formAction={signup} />
