# Montsel invitation recovery

Workspace access activates only when every intended workspace is active, every grant remains authorised, the invitation is accepted and valid, the verified recipient still matches, organisation membership exists, and the complete assignment set fits within the limits. A failed assignment transaction grants no partial access. Existing independent active assignments are preserved.

## Recovery surfaces

The recipient opens `/invite/<invitation-id>` while signed in with the invited email. A verified recipient can accept, decline, inspect setup state and retry. Organisation owners/admins can inspect invitations and retry, cancel or resend from `/o/<organisation-slug>/settings`. These requests bind the actor to the current session. Retry timing and attempt limits are enforced again under the organisation lock.

| State | Operator action |
| --- | --- |
| `pending_acceptance` | Resend delivery if needed. The recipient must verify their email and accept. A failed delivery grants nothing. |
| `provisioning` | Normal during acceptance. An accepted invitation stranded here for more than 60 seconds is eligible for the recovery sweep. The recipient can also reconcile the interrupted accepted hook. |
| `retry_pending` | Wait for `next_retry_at`, correct the cause, then retry or let the sweep run. Maximum five failed attempts, with a 60-second delay. |
| `active` | Complete. Cancelling an unrelated invitation does not revoke existing independent assignments. Use workspace access management to revoke access. |
| `cancelled`, `expired`, `permanently_failed` | Do not revive this record or edit it to active. Review authority. Assign an existing organisation member through the workspace management flow, or create a new authorised invitation for a person who is not yet a member. |

If Better Auth records acceptance without creating organisation membership, workspace provisioning deliberately refuses to manufacture that membership. Create a new authorised organisation invitation. No workspace access is granted while membership is absent. Native membership-write endpoints are guarded; do not bypass those guards to repair data.

Workspace or organisation revocation cancels relevant pending provisioning while holding the same lock used for activation. Retry workers cannot recreate that withdrawn access. Archiving any intended workspace stops the whole invitation assignment transaction.

## Durable recovery job

`POST /api/internal/montsel/provisioning-retry` is a bounded service operation. It accepts no user/workspace selection and processes at most 25 eligible records. It requires both enabled tenancy and a private `MONTSEL_RECOVERY_TOKEN` of at least 32 random characters. Missing/invalid credentials and disabled tenancy receive the same unavailable response. The processor revalidates the original inviter, recipient, invitation and every grant; the service token is not content authority.

`scripts/database/retry-provisioning.ts` calls that endpoint using private scheduler environment variables `MONTSEL_RECOVERY_ORIGIN` and `MONTSEL_RECOVERY_TOKEN`. Configure it on the deployment's existing scheduler every minute, with one concurrent run, a 60-second timeout, and failure alerting. A crash leaves durable database state for a subsequent run. Check returned `failed` counts and invitation status; the job's process success does not mean every invitation activated.

The endpoint and scheduler entry point are implemented and tested. No deployed schedule or recovery secret was created in this repair. Deploying/configuring the job and proving one failed acceptance through a later successful scheduled run are release conditions before enabling tenancy. Manual recipient/administrator recovery remains available once tenancy is enabled.

Do not log the token, copy invitation URLs into public logs, change attempts/state manually, or alter applied SQL migrations. Use the migration ledger and failure-attempt records for schema recovery; invitation recovery uses the interfaces above.
