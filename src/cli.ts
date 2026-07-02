#!/usr/bin/env node
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { parsePrismaSchema } from "./prisma/parser.js";
import type { ScenarioDomain } from "./prisma/types.js";
import { renderScenarioJson, renderScenarioMarkdown } from "./generator/json.js";
import { renderPrismaSeed } from "./generator/prismaSeed.js";
import { generateScenarioPack } from "./generator/scenario.js";

type ParsedArgs = {
  command?: string;
  positional: string[];
  flags: Record<string, string | boolean>;
};

const VALID_DOMAINS = new Set(["auto", "saas", "commerce", "content", "generic"]);
const VALID_FORMATS = new Set(["both", "json", "prisma"]);

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));

  if (!args.command || args.flags.help || args.flags.h) {
    printHelp();
    return;
  }

  if (args.command === "inspect") {
    await inspect(args);
    return;
  }

  if (args.command === "generate") {
    await generate(args);
    return;
  }

  throw new Error(`Unknown command: ${args.command}`);
}

async function inspect(args: ParsedArgs): Promise<void> {
  const schemaPath = args.positional[0];
  if (!schemaPath) {
    throw new Error("Missing schema path. Example: scenarioseed inspect prisma/schema.prisma");
  }

  const absoluteSchemaPath = path.resolve(schemaPath);
  const source = await readFile(absoluteSchemaPath, "utf8");
  const schema = parsePrismaSchema(source);

  console.log(`Models: ${schema.models.length}`);
  for (const model of schema.models) {
    const scalarCount = model.fields.filter((field) => field.kind !== "relation").length;
    const relationCount = model.fields.filter((field) => field.kind === "relation").length;
    console.log(`- ${model.name}: ${scalarCount} fields, ${relationCount} relations`);
  }

  if (schema.enums.length > 0) {
    console.log(`Enums: ${schema.enums.length}`);
    for (const item of schema.enums) {
      console.log(`- ${item.name}: ${item.values.join(", ")}`);
    }
  }
}

async function generate(args: ParsedArgs): Promise<void> {
  const schemaPath = args.positional[0];
  if (!schemaPath) {
    throw new Error("Missing schema path. Example: scenarioseed generate prisma/schema.prisma");
  }

  const absoluteSchemaPath = path.resolve(schemaPath);
  const source = await readFile(absoluteSchemaPath, "utf8");
  const schema = parsePrismaSchema(source);
  const outDir = path.resolve(readStringFlag(args, "out", "scenarioseed-output"));
  const format = readStringFlag(args, "format", "both");
  const domain = readStringFlag(args, "domain", "auto");

  if (!VALID_FORMATS.has(format)) {
    throw new Error(`Invalid --format value: ${format}. Use both, json, or prisma.`);
  }
  if (!VALID_DOMAINS.has(domain)) {
    throw new Error(`Invalid --domain value: ${domain}. Use auto, saas, commerce, content, or generic.`);
  }

  const pack = generateScenarioPack(schema, {
    schemaPath: path.relative(process.cwd(), absoluteSchemaPath),
    requestedScenario: readOptionalStringFlag(args, "scenario"),
    domain: domain as ScenarioDomain,
    maxScenarios: readNumberFlag(args, "max-scenarios", 4)
  });

  await mkdir(outDir, { recursive: true });
  await writeFile(path.join(outDir, "SCENARIOS.md"), renderScenarioMarkdown(pack, schema), "utf8");

  if (format === "both" || format === "json") {
    await writeFile(path.join(outDir, "scenario-pack.json"), renderScenarioJson(pack), "utf8");
  }
  if (format === "both" || format === "prisma") {
    await writeFile(path.join(outDir, "seed.scenario.ts"), renderPrismaSeed(pack, schema), "utf8");
  }

  console.log(`Generated ${pack.records.length} records across ${pack.scenarios.length} scenarios.`);
  console.log(`Domain: ${pack.domain}`);
  console.log(`Output: ${outDir}`);
  if (pack.warnings.length > 0) {
    console.log(`Warnings: ${pack.warnings.length}`);
  }
}

function parseArgs(argv: string[]): ParsedArgs {
  const [command, ...rest] = argv;
  const positional: string[] = [];
  const flags: Record<string, string | boolean> = {};

  for (let index = 0; index < rest.length; index += 1) {
    const token = rest[index];
    if (!token.startsWith("--")) {
      positional.push(token);
      continue;
    }

    const withoutPrefix = token.slice(2);
    const equalsIndex = withoutPrefix.indexOf("=");
    if (equalsIndex !== -1) {
      flags[withoutPrefix.slice(0, equalsIndex)] = withoutPrefix.slice(equalsIndex + 1);
      continue;
    }

    const next = rest[index + 1];
    if (next && !next.startsWith("--")) {
      flags[withoutPrefix] = next;
      index += 1;
    } else {
      flags[withoutPrefix] = true;
    }
  }

  return { command, positional, flags };
}

function readStringFlag(args: ParsedArgs, name: string, fallback: string): string {
  const value = args.flags[name];
  return typeof value === "string" && value.length > 0 ? value : fallback;
}

function readOptionalStringFlag(args: ParsedArgs, name: string): string | undefined {
  const value = args.flags[name];
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function readNumberFlag(args: ParsedArgs, name: string, fallback: number): number {
  const value = args.flags[name];
  if (typeof value !== "string") {
    return fallback;
  }
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function printHelp(): void {
  console.log(`ScenarioSeed

Generate scenario-first seed data from a Prisma schema.

Commands:
  scenarioseed inspect <schema.prisma>
  scenarioseed generate <schema.prisma> [options]

Options:
  --scenario <text>       Business focus, for example "SaaS billing edge cases"
  --domain <domain>       auto, saas, commerce, content, generic
  --format <format>       both, json, prisma
  --out <dir>             Output directory
  --max-scenarios <n>     Number of scenario states to generate

Examples:
  scenarioseed inspect prisma/schema.prisma
  scenarioseed generate prisma/schema.prisma --scenario "SaaS billing edge cases" --out ./scenarioseed
`);
}
