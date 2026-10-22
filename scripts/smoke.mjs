const BASE = process.argv[2];
const checks = [
	['/', 200],
	['/auth/sign-in', 200],
	['/auth/sign-up', 200],
	['/auth/forgot-password', 200],
	['/auth/pricing', 200],
	['/api/health/security', 200],
	['/api/system-health', 200],
	['/api/auth/definitely-not-a-real-endpoint', [400, 401, 404, 405]],
	['/admin/security', [200, 301, 302, 303, 307, 308, 401, 403]]
];

let failures = 0;
for (const [path, expected] of checks) {
	const started = Date.now();
	try {
		const res = await fetch(BASE + path, { redirect: 'manual' });
		const ms = Date.now() - started;
		const ok = Array.isArray(expected) ? expected.includes(res.status) : res.status === expected;
		if (!ok) failures++;
		let extra = '';
		if (path === '/api/system-health' || path === '/api/health/security') {
			try {
				const body = await res.json();
				extra = ' ' + JSON.stringify(body).slice(0, 300);
			} catch { extra = ' (non-JSON body)'; }
		}
		const location = res.headers.get('location');
		console.log(`${ok ? 'PASS' : 'FAIL'} ${res.status} ${String(ms).padStart(4)}ms ${path}${location ? ` -> ${location.slice(0, 80)}` : ''}${extra}`);
	} catch (err) {
		failures++;
		console.log(`FAIL ERR ${path} ${err.cause?.code ?? err.message}`);
	}
}
console.log(failures === 0 ? '\nSMOKE: all checks passed' : `\nSMOKE: ${failures} failure(s)`);
process.exit(failures === 0 ? 0 : 1);
