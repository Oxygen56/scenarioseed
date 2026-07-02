# Examples

This directory contains schemas and generated outputs that show the intended project shape.

## SaaS Billing

Schema: `examples/saas/schema.prisma`

```bash
npm run dev -- generate examples/saas/schema.prisma \
  --scenario "SaaS billing edge cases" \
  --out examples/saas/generated
```

Generated scenarios:

- `trial_expiring`
- `past_due_enterprise`
- `usage_over_quota`
- `canceled_winback`

## Commerce Fulfillment

Schema: `examples/commerce/schema.prisma`

```bash
npm run dev -- generate examples/commerce/schema.prisma \
  --scenario "commerce fulfillment failures" \
  --out examples/commerce/generated
```

Generated scenarios:

- `abandoned_cart`
- `payment_failed`
- `refunded_order`
- `delayed_shipment`
