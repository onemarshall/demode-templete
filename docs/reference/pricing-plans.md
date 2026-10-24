# Pricing Plans

Product definitions for Creem integration. Use these `productId` values when creating checkout sessions.

---

## Plans Overview

| Plan           | Product ID        | Price | Billing | Description                         |
| -------------- | ----------------- | ----- | ------- | ----------------------------------- |
| **Free**       | `prod_free`       | $0    | -       | Get started with core features      |
| **Basic**      | `prod_basic`      | $9    | Monthly | Essential tools for individuals     |
| **Pro**        | `prod_pro`        | $29   | Monthly | Advanced features for professionals |
| **Enterprise** | `prod_enterprise` | $99   | Monthly | Full platform for teams             |

---

## Free

**Product ID:** `prod_free`

| Attribute   | Value |
| ----------- | ----- |
| **Price**   | $0    |
| **Billing** | None  |
| **Trial**   | N/A   |

### Features

- Core authentication (email/password, social login)
- 1 brand
- Community support
- Basic security analytics
- 1,000 monthly active users
- Standard email delivery

### Use Case

Individual developers testing the platform or building small personal projects.

---

## Basic

**Product ID:** `prod_basic`

| Attribute   | Value             |
| ----------- | ----------------- |
| **Price**   | $9/month          |
| **Billing** | Recurring monthly |
| **Trial**   | 7 days free       |

### Features

- Everything in Free, plus:
- 3 brands
- Email support (48h response)
- Advanced security analytics
- 10,000 monthly active users
- Priority email delivery
- Custom branding
- Webhook access
- API rate limit: 1,000 requests/hour

### Use Case

Freelancers and small startups needing professional auth with moderate scale.

---

## Pro

**Product ID:** `prod_pro`

| Attribute   | Value             |
| ----------- | ----------------- |
| **Price**   | $29/month         |
| **Billing** | Recurring monthly |
| **Trial**   | 14 days free      |

### Features

- Everything in Basic, plus:
- Unlimited brands
- Priority email support (24h response)
- Real-time security analytics
- 100,000 monthly active users
- Dedicated IP for email
- Advanced SSO (SAML, OIDC)
- Custom domains
- Organization management
- API rate limit: 10,000 requests/hour
- Audit logs (90 days)
- Role-based access control (RBAC)

### Use Case

Growing SaaS companies and agencies managing multiple client projects.

---

## Enterprise

**Product ID:** `prod_enterprise`

| Attribute   | Value             |
| ----------- | ----------------- |
| **Price**   | $99/month         |
| **Billing** | Recurring monthly |
| **Trial**   | 30 days free      |

### Features

- Everything in Pro, plus:
- Unlimited everything
- Dedicated support channel (4h response)
- Custom SLA available
- Unlimited monthly active users
- Premium infrastructure (99.99% uptime SLA)
- Advanced fraud detection
- Geographic redundancy
- Custom integrations
- API rate limit: Unlimited
- Audit logs (unlimited retention)
- Security compliance (SOC2, GDPR, HIPAA)
- Dedicated account manager
- Custom contracts & invoicing

### Use Case

Large enterprises and scale-ups requiring maximum reliability, compliance, and support.

---

## Usage Examples

### Checkout Button

```svelte
<script>
  import SubscribeButton from '#lib/components/SubscribeButton.svelte';
</script>

<!-- Free tier - no checkout needed -->
<p>Start for free, no credit card required.</p>

<!-- Basic plan -->
<SubscribeButton productId="prod_basic" />

<!-- Pro plan -->
<SubscribeButton productId="prod_pro" />

<!-- Enterprise plan -->
<SubscribeButton productId="prod_enterprise" />
```

### Dynamic Pricing Display

```svelte
<script>
  const plans = [
    { id: 'prod_free', name: 'Free', price: 0, period: null },
    { id: 'prod_basic', name: 'Basic', price: 9, period: 'month' },
    { id: 'prod_pro', name: 'Pro', price: 29, period: 'month' },
    { id: 'prod_enterprise', name: 'Enterprise', price: 99, period: 'month' }
  ];
</script>

<div class="grid grid-cols-4 gap-4">
  {#each plans as plan}
    <div class="border rounded-lg p-4">
      <h3>{plan.name}</h3>
      <p class="text-2xl font-bold">
        ${plan.price}
        {#if plan.period}
          <span class="text-sm">/{plan.period}</span>
        {/if}
      </p>
      <SubscribeButton productId={plan.id} />
    </div>
  {/each}
</div>
```

---

## Creem Dashboard Setup

Create these products in your [Creem Dashboard](https://creem.io/dashboard/products):

### 1. Basic Plan

- **Name:** Basic
- **Price:** $9.00
- **Billing:** Recurring monthly
- **Product ID:** `prod_basic`

### 2. Pro Plan

- **Name:** Pro
- **Price:** $29.00
- **Billing:** Recurring monthly
- **Product ID:** `prod_pro`

### 3. Enterprise Plan

- **Name:** Enterprise
- **Price:** $99.00
- **Billing:** Recurring monthly
- **Product ID:** `prod_enterprise`

---

## Webhook Events

When subscriptions change, Creem sends webhooks. Handle these in your app:

| Event                   | Action                           |
| ----------------------- | -------------------------------- |
| `subscription.active`   | Grant Pro/Enterprise features    |
| `subscription.canceled` | Schedule downgrade at period end |
| `subscription.expired`  | Downgrade to Free                |
| `payment.failed`        | Send payment retry notification  |

---

## Annual Discounts

Contact sales for annual billing with 2 months free:

- **Basic Annual:** $90/year (save $18)
- **Pro Annual:** $290/year (save $58)
- **Enterprise Annual:** $990/year (save $198)

---

## FAQ

**Q: Can I upgrade/downgrade plans?**
A: Yes, changes take effect at the next billing cycle. Prorated credits applied automatically.

**Q: What happens when I exceed my MAU limit?**
A: We'll notify you at 80% and 100%. You can upgrade instantly or contact sales.

**Q: Is there a refund policy?**
A: 30-day money-back guarantee for all paid plans.

**Q: Can I use this for a nonprofit?**
A: Contact us at <support@creem.io> for nonprofit discounts.
