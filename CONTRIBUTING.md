# Contributing

ScenarioSeed is optimized for small, reviewable changes that improve generated business states.

Good contributions include:

- new domain scenario packs
- better field inference rules
- schema parser fixes with a minimal repro
- adapters for Drizzle, SQL, Rails, or Supabase
- examples that show real product states

## Development

```bash
npm install
npm run typecheck
npm test
npm run build
```

Run the demo generator:

```bash
npm run demo
```

## Scenario Quality Bar

A generated scenario should be:

- coherent across related models
- deterministic across runs
- easy to explain in one sentence
- useful for testing a real product workflow
- conservative when the schema does not provide enough signal

Prefer focused rules over broad "AI magic" behavior. The default path should work without an API key.
