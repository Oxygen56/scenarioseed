import type { PrismaSchema, ScenarioPack } from "../prisma/types.js";

export function renderScenarioJson(pack: ScenarioPack): string {
  return `${JSON.stringify(pack, null, 2)}\n`;
}

export function renderScenarioMarkdown(pack: ScenarioPack, schema: PrismaSchema): string {
  const lines: string[] = [
    `# ${pack.name}`,
    "",
    `Domain: \`${pack.domain}\``,
    `Schema: \`${pack.source.schema}\``,
    "",
    "## Scenarios",
    ""
  ];

  for (const scenario of pack.scenarios) {
    lines.push(`### ${scenario.title}`, "", scenario.story, "");
    const records = pack.records.filter((record) => record.scenario === scenario.key);
    lines.push("| Model | Generated fields |", "| --- | --- |");
    for (const record of records) {
      lines.push(`| ${record.model} | ${Object.keys(record.data).join(", ")} |`);
    }
    lines.push("");
  }

  lines.push("## Model Coverage", "", "| Model | Fields |", "| --- | --- |");
  for (const model of schema.models) {
    lines.push(`| ${model.name} | ${model.fields.map((field) => field.name).join(", ")} |`);
  }
  lines.push("");

  if (pack.warnings.length > 0) {
    lines.push("## Warnings", "");
    for (const warning of pack.warnings) {
      lines.push(`- ${warning}`);
    }
    lines.push("");
  }

  return `${lines.join("\n")}\n`;
}
