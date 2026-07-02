import type {
  PrismaEnum,
  PrismaField,
  PrismaModel,
  PrismaSchema,
  ScenarioDomain,
  ScenarioPack,
  ScenarioRecord
} from "../prisma/types.js";
import { normalizeName, slugify, titleCase } from "../util/case.js";
import { stableHash, stableId, stablePick } from "../util/stable.js";
import { inferDomain, packName, scenarioDefinitions } from "./domain.js";

export type GenerateScenarioOptions = {
  schemaPath: string;
  requestedScenario?: string;
  domain?: ScenarioDomain;
  maxScenarios?: number;
};

type RecordRegistry = Map<string, Record<string, unknown>>;

const DATE_BASE = Date.UTC(2026, 0, 15, 12, 0, 0);

export function generateScenarioPack(schema: PrismaSchema, options: GenerateScenarioOptions): ScenarioPack {
  const domain = inferDomain(schema, options.domain ?? "auto");
  const scenarios = scenarioDefinitions(domain, options.requestedScenario, options.maxScenarios ?? 4);
  const enumByName = new Map(schema.enums.map((item) => [item.name, item]));
  const orderedModels = orderModels(schema);
  const records: ScenarioRecord[] = [];
  const registry: RecordRegistry = new Map();
  const warnings: string[] = [];

  if (schema.models.length === 0) {
    warnings.push("No Prisma models were found in the schema.");
  }

  for (const scenario of scenarios) {
    for (const model of orderedModels) {
      const data = buildModelRecord({
        model,
        schema,
        scenarioKey: scenario.key,
        scenarioTitle: scenario.title,
        scenarioStory: scenario.story,
        enumByName,
        registry,
        warnings
      });
      registry.set(recordKey(scenario.key, model.name), data);
      records.push({
        scenario: scenario.key,
        model: model.name,
        data
      });
    }
  }

  return {
    name: packName(domain, options.requestedScenario),
    domain,
    source: {
      schema: options.schemaPath,
      requestedScenario: options.requestedScenario
    },
    scenarios,
    records,
    warnings: [...new Set(warnings)]
  };
}

function buildModelRecord(input: {
  model: PrismaModel;
  schema: PrismaSchema;
  scenarioKey: string;
  scenarioTitle: string;
  scenarioStory: string;
  enumByName: Map<string, PrismaEnum>;
  registry: RecordRegistry;
  warnings: string[];
}): Record<string, unknown> {
  const data: Record<string, unknown> = {};

  for (const relationField of input.model.fields.filter((field) => field.kind === "relation")) {
    if (!relationField.relation?.fields.length) {
      continue;
    }
    const parent = input.registry.get(recordKey(input.scenarioKey, relationField.type));
    if (!parent) {
      input.warnings.push(
        `${input.model.name}.${relationField.name} depends on ${relationField.type}, but no parent record was generated before it.`
      );
      continue;
    }
    relationField.relation.fields.forEach((fieldName, index) => {
      const referenceName = relationField.relation?.references[index] ?? "id";
      data[fieldName] = parent[referenceName] ?? parent.id;
    });
  }

  for (const field of input.model.fields) {
    if (field.kind === "relation" || field.isList || data[field.name] !== undefined) {
      continue;
    }

    if (shouldSkipField(field, input.scenarioKey)) {
      continue;
    }

    const value = valueForField({
      field,
      model: input.model,
      scenarioKey: input.scenarioKey,
      scenarioTitle: input.scenarioTitle,
      scenarioStory: input.scenarioStory,
      enumByName: input.enumByName
    });

    if (value === undefined) {
      if (!field.isOptional && !field.hasDefault) {
        input.warnings.push(`Could not infer a value for required field ${input.model.name}.${field.name}.`);
      }
      continue;
    }

    data[field.name] = value;
  }

  return data;
}

function valueForField(input: {
  field: PrismaField;
  model: PrismaModel;
  scenarioKey: string;
  scenarioTitle: string;
  scenarioStory: string;
  enumByName: Map<string, PrismaEnum>;
}): unknown {
  const { field, model, scenarioKey, scenarioTitle, scenarioStory, enumByName } = input;
  const normalizedField = normalizeName(field.name);
  const normalizedModel = normalizeName(model.name);
  const entropy = `${scenarioKey}:${model.name}:${field.name}`;

  if (field.kind === "enum") {
    const prismaEnum = enumByName.get(field.type);
    return prismaEnum ? chooseEnumValue(prismaEnum.values, normalizedField, scenarioKey) : undefined;
  }

  switch (field.type) {
    case "String":
      return stringValue({ field, normalizedField, normalizedModel, scenarioKey, scenarioTitle, scenarioStory, entropy });
    case "Boolean":
      return booleanValue(normalizedField, scenarioKey, entropy);
    case "Int":
      return integerValue(normalizedField, scenarioKey, entropy);
    case "BigInt":
      return integerValue(normalizedField, scenarioKey, entropy);
    case "Float":
      return floatValue(normalizedField, scenarioKey, entropy);
    case "Decimal":
      return decimalValue(normalizedField, scenarioKey, entropy);
    case "DateTime":
      return dateValue(normalizedField, scenarioKey, entropy);
    case "Json":
      return {
        scenario: scenarioKey,
        generatedBy: "scenarioseed",
        note: scenarioStory
      };
    case "Bytes":
      return undefined;
    default:
      return undefined;
  }
}

function stringValue(input: {
  field: PrismaField;
  normalizedField: string;
  normalizedModel: string;
  scenarioKey: string;
  scenarioTitle: string;
  scenarioStory: string;
  entropy: string;
}): string {
  const { field, normalizedField, normalizedModel, scenarioKey, scenarioTitle, scenarioStory, entropy } = input;

  if (field.isId || normalizedField === "id") {
    return `${slugify(normalizedModel).slice(0, 8)}_${stableId([entropy])}`;
  }
  if (normalizedField.endsWith("id") || normalizedField.includes("externalid")) {
    return `ext_${stableId([entropy])}`;
  }
  if (normalizedField.includes("email")) {
    return `${slugify(scenarioKey)}.${slugify(normalizedModel)}@scenarioseed.dev`;
  }
  if (normalizedField.includes("phone")) {
    return "+14155550126";
  }
  if (normalizedField.includes("url") || normalizedField.includes("image") || normalizedField.includes("avatar")) {
    return `https://example.com/${slugify(scenarioKey)}/${slugify(normalizedModel)}`;
  }
  if (normalizedField.includes("currency")) {
    return "USD";
  }
  if (normalizedField.includes("country")) {
    return "US";
  }
  if (normalizedField.includes("slug") || normalizedField === "key" || normalizedField.includes("code")) {
    return `${slugify(scenarioKey)}-${slugify(normalizedModel)}`;
  }
  if (normalizedField.includes("status") || normalizedField.includes("state")) {
    return statusForScenario(scenarioKey);
  }
  if (normalizedField.includes("plan") || normalizedField.includes("tier")) {
    return scenarioKey.includes("enterprise") ? "enterprise" : "pro";
  }
  if (normalizedField.includes("name")) {
    if (normalizedModel.includes("user") || normalizedModel.includes("customer") || normalizedModel.includes("member")) {
      return `${stablePick(["Avery", "Jordan", "Riley", "Casey"], entropy)} ${titleCase(scenarioKey)}`;
    }
    if (normalizedModel.includes("product")) {
      return `${titleCase(scenarioTitle)} Toolkit`;
    }
    return `${titleCase(scenarioTitle)} ${titleCase(normalizedModel)}`;
  }
  if (normalizedField.includes("title") || normalizedField.includes("subject")) {
    return scenarioTitle;
  }
  if (
    normalizedField.includes("description") ||
    normalizedField.includes("body") ||
    normalizedField.includes("note") ||
    normalizedField.includes("reason")
  ) {
    return scenarioStory;
  }
  if (
    normalizedField.includes("stripe") ||
    normalizedField.includes("payment") ||
    normalizedField.includes("subscription") ||
    normalizedField.includes("customer")
  ) {
    return `${normalizedField}_${stableId([entropy])}`;
  }

  return `${titleCase(field.name)} for ${scenarioTitle}`;
}

function booleanValue(fieldName: string, scenarioKey: string, entropy: string): boolean {
  if (fieldName.includes("active") || fieldName.includes("enabled")) {
    return !scenarioKey.includes("canceled") && !scenarioKey.includes("blocked");
  }
  if (fieldName.includes("paid")) {
    return !scenarioKey.includes("past_due") && !scenarioKey.includes("failed");
  }
  if (fieldName.includes("failed") || fieldName.includes("blocked")) {
    return scenarioKey.includes("failed") || scenarioKey.includes("blocked") || scenarioKey.includes("past_due");
  }
  if (fieldName.includes("trial")) {
    return scenarioKey.includes("trial");
  }
  if (fieldName.includes("refunded")) {
    return scenarioKey.includes("refunded");
  }
  return stableHash(entropy) % 2 === 0;
}

function integerValue(fieldName: string, scenarioKey: string, entropy: string): number {
  if (fieldName.includes("amount") || fieldName.includes("price") || fieldName.includes("total")) {
    return scenarioKey.includes("enterprise") ? 49900 : 9900;
  }
  if (fieldName.includes("quantity") || fieldName.includes("count")) {
    return scenarioKey.includes("over_quota") ? 1200 : 3;
  }
  if (fieldName.includes("seat")) {
    return scenarioKey.includes("enterprise") ? 75 : 5;
  }
  if (fieldName.includes("quota") || fieldName.includes("limit")) {
    return 1000;
  }
  if (fieldName.includes("usage") || fieldName.includes("used")) {
    return scenarioKey.includes("over_quota") ? 1250 : 420;
  }
  return 10 + (stableHash(entropy) % 90);
}

function floatValue(fieldName: string, scenarioKey: string, entropy: string): number {
  if (fieldName.includes("amount") || fieldName.includes("price") || fieldName.includes("total")) {
    return scenarioKey.includes("enterprise") ? 499 : 99;
  }
  if (fieldName.includes("rate") || fieldName.includes("ratio")) {
    return scenarioKey.includes("failed") ? 0.18 : 0.82;
  }
  return Number(((stableHash(entropy) % 1000) / 10).toFixed(2));
}

function decimalValue(fieldName: string, scenarioKey: string, entropy: string): string {
  return floatValue(fieldName, scenarioKey, entropy).toFixed(2);
}

function dateValue(fieldName: string, scenarioKey: string, entropy: string): string {
  let offsetDays = stableHash(entropy) % 20;
  if (fieldName.includes("trial") || fieldName.includes("expires") || fieldName.includes("end")) {
    offsetDays = scenarioKey.includes("trial") ? 2 : 30;
  } else if (fieldName.includes("due")) {
    offsetDays = scenarioKey.includes("past_due") ? -8 : 14;
  } else if (fieldName.includes("cancel")) {
    offsetDays = scenarioKey.includes("canceled") ? -20 : 45;
  } else if (fieldName.includes("created")) {
    offsetDays = -45;
  } else if (fieldName.includes("updated")) {
    offsetDays = -2;
  } else if (fieldName.includes("paid")) {
    offsetDays = scenarioKey.includes("failed") || scenarioKey.includes("past_due") ? 21 : -3;
  } else if (fieldName.includes("ship") || fieldName.includes("deliver")) {
    offsetDays = scenarioKey.includes("delayed") ? 10 : 3;
  }
  return new Date(DATE_BASE + offsetDays * 24 * 60 * 60 * 1000).toISOString();
}

function chooseEnumValue(values: string[], fieldName: string, scenarioKey: string): string {
  const statusCandidates: Record<string, string[]> = {
    trial_expiring: ["TRIALING", "TRIAL", "PENDING", "OPEN", "ACTIVE"],
    past_due_enterprise: ["PAST_DUE", "OVERDUE", "UNPAID", "FAILED", "OPEN"],
    usage_over_quota: ["OVER_QUOTA", "LIMITED", "ACTIVE", "WARNED", "OPEN"],
    canceled_winback: ["CANCELED", "CANCELLED", "CHURNED", "INACTIVE", "ARCHIVED"],
    abandoned_cart: ["ABANDONED", "OPEN", "PENDING", "DRAFT"],
    payment_failed: ["FAILED", "DECLINED", "UNPAID", "PENDING"],
    refunded_order: ["REFUNDED", "RETURNED", "CANCELED", "CANCELLED"],
    delayed_shipment: ["DELAYED", "IN_TRANSIT", "SHIPPED", "PENDING"],
    draft_review: ["IN_REVIEW", "REVIEW", "DRAFT", "PENDING"],
    scheduled_publish: ["SCHEDULED", "APPROVED", "PUBLISHED"],
    spam_comment: ["SPAM", "FLAGGED", "PENDING"],
    archived_content: ["ARCHIVED", "INACTIVE"],
    happy_path: ["ACTIVE", "APPROVED", "PAID", "COMPLETE"],
    blocked_state: ["BLOCKED", "PENDING", "FAILED"],
    edge_case: ["PENDING", "OPEN"],
    recovery_state: ["RECOVERING", "ACTIVE", "OPEN"]
  };

  if (fieldName.includes("role")) {
    return preferEnum(values, ["OWNER", "ADMIN", "MEMBER", "USER"]);
  }
  if (fieldName.includes("currency")) {
    return preferEnum(values, ["USD", "EUR", "GBP"]);
  }
  if (fieldName.includes("plan") || fieldName.includes("tier")) {
    return preferEnum(values, ["ENTERPRISE", "PRO", "PLUS", "FREE"]);
  }

  return preferEnum(values, statusCandidates[scenarioKey] ?? ["ACTIVE", "OPEN", "PENDING"]);
}

function preferEnum(values: string[], candidates: string[]): string {
  const normalizedValues = values.map((value) => ({ value, normalized: normalizeName(value) }));
  for (const candidate of candidates) {
    const normalizedCandidate = normalizeName(candidate);
    const exact = normalizedValues.find((item) => item.normalized === normalizedCandidate);
    if (exact) {
      return exact.value;
    }
    const partial = normalizedValues.find(
      (item) => item.normalized.includes(normalizedCandidate) || normalizedCandidate.includes(item.normalized)
    );
    if (partial) {
      return partial.value;
    }
  }
  return values[0];
}

function statusForScenario(scenarioKey: string): string {
  return scenarioKey.replace(/-/g, "_").toUpperCase();
}

function shouldSkipField(field: PrismaField, scenarioKey: string): boolean {
  const defaultCanBeSkipped =
    field.hasDefault &&
    !field.isId &&
    !semanticOptionalField(field.name) &&
    field.type !== "DateTime";
  if (defaultCanBeSkipped) {
    return true;
  }
  return field.isOptional && !includeOptionalField(field.name, scenarioKey);
}

function semanticOptionalField(name: string): boolean {
  const normalized = normalizeName(name);
  return [
    "amount",
    "body",
    "cancel",
    "description",
    "due",
    "email",
    "end",
    "external",
    "failed",
    "limit",
    "metadata",
    "name",
    "note",
    "paid",
    "plan",
    "phone",
    "price",
    "quantity",
    "reason",
    "ship",
    "slug",
    "start",
    "state",
    "status",
    "stripe",
    "title",
    "total",
    "trial",
    "usage"
  ].some((token) => normalized.includes(token));
}

function includeOptionalField(name: string, scenarioKey: string): boolean {
  if (!semanticOptionalField(name)) {
    return false;
  }

  const normalized = normalizeName(name);
  if (normalized.includes("cancel")) {
    return scenarioKey.includes("canceled");
  }
  if (normalized.includes("refund")) {
    return scenarioKey.includes("refunded");
  }
  if (normalized.includes("paid")) {
    return (
      scenarioKey.includes("refunded") ||
      scenarioKey.includes("happy") ||
      scenarioKey.includes("recovery") ||
      scenarioKey.includes("active")
    );
  }
  if (normalized.includes("trial")) {
    return scenarioKey.includes("trial");
  }
  if (normalized.includes("fail")) {
    return scenarioKey.includes("failed") || scenarioKey.includes("past_due");
  }
  if (normalized.includes("deliver")) {
    return scenarioKey.includes("delayed") || scenarioKey.includes("shipped");
  }
  if (normalized.includes("ship")) {
    return scenarioKey.includes("delayed") || scenarioKey.includes("shipped") || scenarioKey.includes("refunded");
  }

  return true;
}

function orderModels(schema: PrismaSchema): PrismaModel[] {
  const modelsByName = new Map(schema.models.map((model) => [model.name, model]));
  const visited = new Set<string>();
  const visiting = new Set<string>();
  const output: PrismaModel[] = [];

  const visit = (model: PrismaModel) => {
    if (visited.has(model.name)) {
      return;
    }
    if (visiting.has(model.name)) {
      output.push(model);
      visited.add(model.name);
      return;
    }
    visiting.add(model.name);
    for (const dependency of dependenciesFor(model)) {
      const dependencyModel = modelsByName.get(dependency);
      if (dependencyModel) {
        visit(dependencyModel);
      }
    }
    visiting.delete(model.name);
    visited.add(model.name);
    if (!output.some((item) => item.name === model.name)) {
      output.push(model);
    }
  };

  for (const model of schema.models) {
    visit(model);
  }

  return output;
}

function dependenciesFor(model: PrismaModel): string[] {
  return model.fields
    .filter((field) => field.kind === "relation" && Boolean(field.relation?.fields.length))
    .map((field) => field.type)
    .filter((name) => name !== model.name);
}

function recordKey(scenarioKey: string, modelName: string): string {
  return `${scenarioKey}:${modelName}`;
}
