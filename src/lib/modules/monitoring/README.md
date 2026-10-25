# Monitoring module

Owns infrastructure health probes, the APM emission hook and the health remote query.
Use `remote/index.ts` for `getInfrastructureHealth`, `types.ts` for browser-safe
response types, and `server/infrastructure-health.ts` for server-side probes. The
`server/apm.ts` emitter is currently a logging hook; configure a real collector there
if required.

Requires platform config, database, Redis, CMS and logger. The health remote also
uses auth session/admin role checks. Its direct runtime platform dependency is
Node-compatible `node:os`; ensure the destination deployment supports it. There are
no separate monitoring SDK dependencies today. Auth receives the dashboard health
callback through host integrations, keeping auth independent of monitoring.

Configure and provision the services being checked. Optional unconfigured services
are reported separately from configured failures. Detailed errors and process metrics
must remain restricted to admins by the remote query. The destination app decides
where to expose health UI/routes and what to report to its monitoring provider.

Follow `../../README.md` for host setup. A copied folder cannot provision the systems
being checked or install the auth API, environment declarations or platform bindings.
