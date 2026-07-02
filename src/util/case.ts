export function camelCaseModel(modelName: string): string {
  return modelName.charAt(0).toLowerCase() + modelName.slice(1);
}

export function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64) || "scenario";
}

export function titleCase(value: string): string {
  return value
    .replace(/([a-z0-9])([A-Z][a-z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export function normalizeName(value: string): string {
  return value.replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
}
