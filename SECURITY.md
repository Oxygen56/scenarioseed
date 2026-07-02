# Security

ScenarioSeed is a local CLI. It reads schema files and writes generated seed files to the output directory you choose.

## Reporting

Please open a private security advisory on GitHub if available, or file an issue with sensitive details removed.

## Dependency Policy

The CI workflow runs:

```bash
npm audit --audit-level=moderate
```

Runtime dependencies should stay minimal. New dependencies should justify their maintenance and security cost.
