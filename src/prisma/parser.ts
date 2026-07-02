import type { PrismaEnum, PrismaField, PrismaModel, PrismaSchema } from "./types.js";

const SCALAR_TYPES = new Set([
  "String",
  "Boolean",
  "Int",
  "BigInt",
  "Float",
  "Decimal",
  "DateTime",
  "Json",
  "Bytes"
]);

export function parsePrismaSchema(source: string): PrismaSchema {
  const withoutBlockComments = source.replace(/\/\*[\s\S]*?\*\//g, "");
  const lines = withoutBlockComments.split(/\r?\n/);
  const models: PrismaModel[] = [];
  const enums: PrismaEnum[] = [];

  for (let index = 0; index < lines.length; index += 1) {
    const line = stripInlineComment(lines[index]).trim();
    const modelMatch = line.match(/^model\s+([A-Za-z_][A-Za-z0-9_]*)\s*\{/);
    const enumMatch = line.match(/^enum\s+([A-Za-z_][A-Za-z0-9_]*)\s*\{/);

    if (modelMatch) {
      const { block, nextIndex } = readBlock(lines, index + 1);
      models.push(parseModelBlock(modelMatch[1], block));
      index = nextIndex;
      continue;
    }

    if (enumMatch) {
      const { block, nextIndex } = readBlock(lines, index + 1);
      enums.push(parseEnumBlock(enumMatch[1], block));
      index = nextIndex;
    }
  }

  const modelNames = new Set(models.map((model) => model.name));
  const enumNames = new Set(enums.map((item) => item.name));
  for (const model of models) {
    for (const field of model.fields) {
      if (modelNames.has(field.type)) {
        field.kind = "relation";
      } else if (enumNames.has(field.type)) {
        field.kind = "enum";
      } else {
        field.kind = "scalar";
      }
    }
  }

  return { models, enums };
}

function readBlock(lines: string[], startIndex: number): { block: string[]; nextIndex: number } {
  const block: string[] = [];
  for (let index = startIndex; index < lines.length; index += 1) {
    const line = lines[index];
    if (stripInlineComment(line).trim() === "}") {
      return { block, nextIndex: index };
    }
    block.push(line);
  }
  return { block, nextIndex: lines.length - 1 };
}

function parseModelBlock(name: string, block: string[]): PrismaModel {
  const fields: PrismaField[] = [];
  const blockAttributes: string[] = [];

  for (const rawLine of block) {
    const line = stripInlineComment(rawLine).trim();
    if (!line) {
      continue;
    }
    if (line.startsWith("@@")) {
      blockAttributes.push(line);
      continue;
    }
    const parsed = parseFieldLine(line);
    if (parsed) {
      fields.push(parsed);
    }
  }

  return { name, fields, blockAttributes };
}

function parseEnumBlock(name: string, block: string[]): PrismaEnum {
  const values: string[] = [];
  for (const rawLine of block) {
    const line = stripInlineComment(rawLine).trim();
    if (!line || line.startsWith("@@")) {
      continue;
    }
    const [value] = line.split(/\s+/);
    if (value && /^[A-Za-z_][A-Za-z0-9_]*$/.test(value)) {
      values.push(value);
    }
  }
  return { name, values };
}

function parseFieldLine(line: string): PrismaField | undefined {
  const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)\s+(.+?)($|\s+@)/);
  if (!match) {
    return undefined;
  }

  const name = match[1];
  const rawType = match[2];
  const typeStart = line.indexOf(rawType, name.length);
  const tail = line.slice(typeStart + rawType.length).trim();
  const attributes = parseAttributes(tail);
  const type = cleanType(rawType);
  const defaultValue = getAttributeArgs(attributes.find((attribute) => attribute.startsWith("@default")));
  const relationAttribute = attributes.find((attribute) => attribute.startsWith("@relation"));

  return {
    name,
    type,
    rawType,
    kind: SCALAR_TYPES.has(type) ? "scalar" : "relation",
    isList: rawType.endsWith("[]"),
    isOptional: rawType.endsWith("?"),
    isId: attributes.some((attribute) => attribute.startsWith("@id")),
    isUnique: attributes.some((attribute) => attribute.startsWith("@unique")),
    hasDefault: Boolean(defaultValue),
    defaultValue,
    attributes,
    relation: relationAttribute ? parseRelation(relationAttribute) : undefined
  };
}

function parseAttributes(input: string): string[] {
  const attributes: string[] = [];
  let index = 0;

  while (index < input.length) {
    const start = input.indexOf("@", index);
    if (start === -1) {
      break;
    }

    let end = start + 1;
    let depth = 0;
    while (end < input.length) {
      const char = input[end];
      if (char === "(") {
        depth += 1;
      } else if (char === ")") {
        depth -= 1;
      } else if (/\s/.test(char) && depth === 0) {
        break;
      }
      end += 1;
    }

    attributes.push(input.slice(start, end));
    index = end + 1;
  }

  return attributes;
}

function parseRelation(attribute: string): PrismaField["relation"] {
  const args = getAttributeArgs(attribute) ?? "";
  const fields = parseListArg(args, "fields");
  const references = parseListArg(args, "references");
  const nameMatch = args.match(/^\s*"([^"]+)"/);
  return {
    fields,
    references,
    name: nameMatch?.[1]
  };
}

function parseListArg(args: string, name: string): string[] {
  const match = args.match(new RegExp(`${name}\\s*:\\s*\\[([^\\]]*)\\]`));
  if (!match) {
    return [];
  }
  return match[1]
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function getAttributeArgs(attribute?: string): string | undefined {
  if (!attribute) {
    return undefined;
  }
  const openIndex = attribute.indexOf("(");
  if (openIndex === -1 || !attribute.endsWith(")")) {
    return undefined;
  }
  return attribute.slice(openIndex + 1, -1);
}

function cleanType(type: string): string {
  return type.replace(/\?$/, "").replace(/\[\]$/, "");
}

function stripInlineComment(line: string): string {
  const commentIndex = line.indexOf("//");
  return commentIndex === -1 ? line : line.slice(0, commentIndex);
}
