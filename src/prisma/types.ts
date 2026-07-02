export type FieldKind = "scalar" | "enum" | "relation";

export type PrismaField = {
  name: string;
  type: string;
  rawType: string;
  kind: FieldKind;
  isList: boolean;
  isOptional: boolean;
  isId: boolean;
  isUnique: boolean;
  hasDefault: boolean;
  defaultValue?: string;
  attributes: string[];
  relation?: {
    fields: string[];
    references: string[];
    name?: string;
  };
};

export type PrismaModel = {
  name: string;
  fields: PrismaField[];
  blockAttributes: string[];
};

export type PrismaEnum = {
  name: string;
  values: string[];
};

export type PrismaSchema = {
  models: PrismaModel[];
  enums: PrismaEnum[];
};

export type ScenarioDomain = "auto" | "saas" | "commerce" | "content" | "generic";

export type ScenarioDefinition = {
  key: string;
  title: string;
  story: string;
};

export type ScenarioRecord = {
  scenario: string;
  model: string;
  data: Record<string, unknown>;
};

export type ScenarioPack = {
  name: string;
  domain: Exclude<ScenarioDomain, "auto">;
  source: {
    schema: string;
    requestedScenario?: string;
  };
  scenarios: ScenarioDefinition[];
  records: ScenarioRecord[];
  warnings: string[];
};
