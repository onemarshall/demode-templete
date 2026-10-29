-- 0017_user_stripe_customer.sql
-- `user.stripeCustomerId`, which the Stripe plugin declares and checkout reads.
--
-- The table carried `creemCustomerId` from an earlier payment provider and was
-- never given the Stripe column, so mounting the Stripe plugin failed with
-- "Database schema mismatch" and every billing route returned 500.
--
-- `creemCustomerId` is left in place. Creem is retired, but dropping a column
-- destroys historical identifiers and buys nothing: nothing reads it.

ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "stripeCustomerId" text;

-- One Stripe customer per user. Partial, so the many users who never reach
-- checkout do not collide on NULL.
CREATE UNIQUE INDEX IF NOT EXISTS "user_stripe_customer_unique"
	ON "user" ("stripeCustomerId")
	WHERE "stripeCustomerId" IS NOT NULL;
