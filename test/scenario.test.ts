import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { renderPrismaSeed } from "../src/generator/prismaSeed.js";
import { generateScenarioPack } from "../src/generator/scenario.js";
import { parsePrismaSchema } from "../src/prisma/parser.js";

const saasSchemaPath = path.join(process.cwd(), "examples", "saas", "schema.prisma");

describe("generateScenarioPack", () => {
  it("generates business-state records instead of anonymous random rows", () => {
    const schema = parsePrismaSchema(readFileSync(saasSchemaPath, "utf8"));
    const pack = generateScenarioPack(schema, {
      schemaPath: "examples/saas/schema.prisma",
      requestedScenario: "SaaS billing edge cases",
      domain: "auto"
    });

    expect(pack.domain).toBe("saas");
    expect(pack.scenarios.map((scenario) => scenario.key)).toContain("past_due_enterprise");
    expect(pack.records).toHaveLength(schema.models.length * pack.scenarios.length);

    const organization = pack.records.find(
      (record) => record.scenario === "past_due_enterprise" && record.model === "Organization"
    );
    const invoice = pack.records.find(
      (record) => record.scenario === "past_due_enterprise" && record.model === "Invoice"
    );

    expect(invoice?.data.status).toBe("PAST_DUE");
    expect(invoice?.data.organizationId).toBe(organization?.data.id);
  });

  it("renders a runnable Prisma seed file", () => {
    const schema = parsePrismaSchema(readFileSync(saasSchemaPath, "utf8"));
    const pack = generateScenarioPack(schema, {
      schemaPath: "examples/saas/schema.prisma",
      domain: "saas",
      maxScenarios: 1
    });
    const seed = renderPrismaSeed(pack, schema);

    expect(seed).toContain("import { PrismaClient }");
    expect(seed).toContain("await prisma.organization.upsert");
    expect(seed).toContain("new Date(");
    expect(seed).toContain("Trial Expiring");
  });
});
