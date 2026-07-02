# Scenario DSL Direction

The first release uses built-in deterministic inference. The next durable extension point should be a small scenario DSL.

## Shape

```yaml
name: past_due_enterprise
domain: saas
story: A high-value account has a failed invoice and should be blocked from expansion.
models:
  Organization:
    planName: enterprise
    seatLimit: 75
  Subscription:
    status: PAST_DUE
  Invoice:
    status: PAST_DUE
    dueAt: -8d
```

## Principles

- scenario files should be reviewable in pull requests
- generated data should remain deterministic
- DSL values should override inference, not replace schema parsing
- the same DSL should target Prisma, Drizzle, SQL, and test fixtures
