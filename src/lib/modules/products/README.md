# Products module

Owns the product registry, access derivation and the brand-scoped repositories
for entitlements, work items, outputs and approvals.

- `shared/` is browser-safe: product descriptors, access/work-state contracts
  and the pure functions that turn authorised data into display state. It never
  decides access.
- `server/` holds every query. Functions take the branded `OperationContext`
  from `modules/tenancy` as their first argument and constrain both `brand_id`
  and `organisation_id`, so a caller cannot read one brand's work with another
  brand's context.

The registry is the presentation authority only. Entitlement comes from
`product_entitlement` rows; a planned or retired product is restricted even
when a row exists.

Database schema lives outside this folder: apply
`database/migrations/0009_montsel_products.sql` after the tenancy migrations.
The migration seeds `product` with the registry keys; the schema-consistency
test fails if the two drift.

Adding a product: add a descriptor to `shared/registry.ts`, add its key to
`product` in a new migration, and implement its route. Navigation and the Tools
Library read the registry, so neither needs editing.
