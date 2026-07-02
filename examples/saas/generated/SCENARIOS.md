# SaaS Billing Edge Cases

Domain: `saas`
Schema: `examples/saas/schema.prisma`

## Scenarios

### Trial Expiring

A self-serve customer is close to the end of trial and has not converted yet. Requested focus: SaaS billing edge cases.

| Model | Generated fields |
| --- | --- |
| Organization | id, name, slug, planName, seatLimit, usageLimit, billingEmail, createdAt, updatedAt |
| Member | organizationId, id, email, name, role, createdAt |
| Subscription | organizationId, id, status, planName, trialEndsAt, currentPeriodEnd, createdAt |
| Invoice | organizationId, id, status, amountCents, currency, dueAt, externalId, createdAt |
| UsageEvent | organizationId, id, metric, quantity, occurredAt, metadata |

### Past-Due Enterprise

A high-value account has a failed invoice and should be blocked from expansion.

| Model | Generated fields |
| --- | --- |
| Organization | id, name, slug, planName, seatLimit, usageLimit, billingEmail, createdAt, updatedAt |
| Member | organizationId, id, email, name, role, createdAt |
| Subscription | organizationId, id, status, planName, currentPeriodEnd, createdAt |
| Invoice | organizationId, id, status, amountCents, currency, dueAt, externalId, createdAt |
| UsageEvent | organizationId, id, metric, quantity, occurredAt, metadata |

### Usage Over Quota

An active workspace exceeded its plan limit and should see upgrade pressure.

| Model | Generated fields |
| --- | --- |
| Organization | id, name, slug, planName, seatLimit, usageLimit, billingEmail, createdAt, updatedAt |
| Member | organizationId, id, email, name, role, createdAt |
| Subscription | organizationId, id, status, planName, currentPeriodEnd, createdAt |
| Invoice | organizationId, id, status, amountCents, currency, dueAt, externalId, createdAt |
| UsageEvent | organizationId, id, metric, quantity, occurredAt, metadata |

### Canceled Winback

A canceled account still has historical value and is eligible for a winback flow.

| Model | Generated fields |
| --- | --- |
| Organization | id, name, slug, planName, seatLimit, usageLimit, billingEmail, createdAt, updatedAt |
| Member | organizationId, id, email, name, role, createdAt |
| Subscription | organizationId, id, status, planName, canceledAt, cancelReason, currentPeriodEnd, createdAt |
| Invoice | organizationId, id, status, amountCents, currency, dueAt, externalId, createdAt |
| UsageEvent | organizationId, id, metric, quantity, occurredAt, metadata |

## Model Coverage

| Model | Fields |
| --- | --- |
| Organization | id, name, slug, planName, seatLimit, usageLimit, billingEmail, members, subscriptions, invoices, usageEvents, createdAt, updatedAt |
| Member | id, organizationId, organization, email, name, role, active, createdAt |
| Subscription | id, organizationId, organization, status, planName, trialEndsAt, canceledAt, cancelReason, currentPeriodEnd, createdAt |
| Invoice | id, organizationId, organization, status, amountCents, currency, dueAt, paidAt, externalId, createdAt |
| UsageEvent | id, organizationId, organization, metric, quantity, occurredAt, metadata |

