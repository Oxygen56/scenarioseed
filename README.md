# ScenarioSeed

[![CI](https://github.com/Oxygen56/scenarioseed/actions/workflows/ci.yml/badge.svg)](https://github.com/Oxygen56/scenarioseed/actions/workflows/ci.yml)

Scenario-first seed data for product teams.

Most seed tools answer: "Can I generate 100 realistic rows for this schema?"

ScenarioSeed answers: "Can I open the app and immediately see the states that break real product logic?"

It reads a Prisma schema and generates named business scenarios such as:

- `trial_expiring`
- `past_due_enterprise`
- `usage_over_quota`
- `payment_failed`
- `refunded_order`
- `delayed_shipment`

Each scenario includes related records, stable IDs, foreign keys, enums, dates, JSON metadata, a Prisma seed file, and a scenario brief.

## Why This Exists

Fake data is easy. Useful fake businesses are hard.

Faker-style tools create plausible fields. Schema seeders create rows that fit the database. ScenarioSeed creates coherent product states that a developer, designer, QA engineer, or AI coding agent can use to test actual workflows.

That makes it useful for:

- testing billing, quota, lifecycle, checkout, fulfillment, and moderation states
- demoing edge cases without hand-writing fixtures
- giving AI coding agents a reproducible local world to debug against
- replacing "seed some users" with "seed the states our product actually needs"

## Quick Start

```bash
npx scenarioseed generate prisma/schema.prisma \
  --scenario "SaaS billing edge cases" \
  --out ./scenarioseed
```

Generated files:

```text
scenarioseed/
  SCENARIOS.md
  scenario-pack.json
  seed.scenario.ts
```

Run the generated Prisma seed:

```bash
npx tsx scenarioseed/seed.scenario.ts
```

Inspect a schema first:

```bash
npx scenarioseed inspect prisma/schema.prisma
```

Try the included examples:

```bash
npm run dev -- generate examples/saas/schema.prisma \
  --scenario "SaaS billing edge cases" \
  --out examples/saas/generated

npm run dev -- generate examples/commerce/schema.prisma \
  --scenario "commerce fulfillment failures" \
  --out examples/commerce/generated
```

## CLI

```text
scenarioseed inspect <schema.prisma>
scenarioseed generate <schema.prisma> [options]
```

Options:

```text
--scenario <text>       Business focus, for example "SaaS billing edge cases"
--domain <domain>       auto, saas, commerce, content, generic
--format <format>       both, json, prisma
--out <dir>             Output directory
--max-scenarios <n>     Number of scenario states to generate
```

## Example

Given a SaaS billing schema with `Organization`, `Member`, `Subscription`, `Invoice`, and `UsageEvent`, ScenarioSeed generates states like:

| Scenario | What It Gives You |
| --- | --- |
| `trial_expiring` | trial subscription, near-term trial end date, owner member, open invoice |
| `past_due_enterprise` | enterprise account, past-due invoice, blocked expansion state |
| `usage_over_quota` | active account with usage above quota |
| `canceled_winback` | canceled subscription with cancellation metadata |

The generated Prisma seed uses deterministic IDs and relation-aware inserts:

```ts
await prisma.organization.upsert({
  where: { id: "organiza_00abc123def4" },
  update: {},
  create: {
    id: "organiza_00abc123def4",
    name: "Past-Due Enterprise Organization",
    slug: "past-due-enterprise-organization",
    planName: "enterprise",
    seatLimit: 75,
    usageLimit: 1000
  }
});
```

## Positioning

ScenarioSeed is not trying to replace broad fake-data libraries or schema seeders.

| Tool Category | Typical Output | ScenarioSeed Difference |
| --- | --- | --- |
| Faker libraries | fake names, emails, addresses | business-state fixtures |
| schema seeders | rows that satisfy schema constraints | named scenarios that test product logic |
| AI seed prompts | realistic-looking table data | deterministic, reviewable, relation-aware scenario packs |
| handwritten fixtures | accurate but slow to maintain | generated from schema with stable conventions |

## Current Support

- Prisma schema parsing
- scalar fields, enums, defaults, optional fields
- relation-aware foreign key generation
- SaaS, commerce, content, and generic domains
- JSON scenario pack output
- Prisma seed TypeScript output
- deterministic generation for stable diffs

## Library API

```ts
import {
  generateScenarioPack,
  parsePrismaSchema,
  renderPrismaSeed
} from "scenarioseed";

const schema = parsePrismaSchema(schemaSource);
const pack = generateScenarioPack(schema, {
  schemaPath: "prisma/schema.prisma",
  requestedScenario: "SaaS billing edge cases"
});

const seed = renderPrismaSeed(pack, schema);
```

## Roadmap

- Drizzle, SQL, and Rails schema adapters
- custom scenario DSL
- optional LLM enrichment for domain-specific stories and field semantics
- Playwright fixture export
- Supabase seed export
- seed validation against a live database
- VS Code and Codex/Claude Code integration

## Development

```bash
npm install
npm test
npm run build
npm run dev -- generate examples/saas/schema.prisma --out tmp/saas
```

## License

MIT
