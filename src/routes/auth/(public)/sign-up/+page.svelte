<!-- src/routes/auth/(public)/sign-up/+page.svelte -->
<script lang="ts">
	import { signup } from '#lib/modules/auth/remote/auth.remote.js';
	import AuthForm from '#lib/modules/auth/components/forms/auth/AuthForm.svelte';
</script>

<AuthForm mode="sign-up" formAction={signup} />
