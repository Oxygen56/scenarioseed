import { describe, expect, it } from "vitest";
import { parsePrismaSchema } from "../src/prisma/parser.js";

describe("parsePrismaSchema", () => {
  it("parses models, enums, defaults, and relation metadata", () => {
    const schema = parsePrismaSchema(`
      enum Role {
        OWNER
        MEMBER
      }

      model Organization {
        id      String   @id @default(cuid())
        name    String
        members Member[]
      }

      model Member {
        id             String       @id @default(cuid())
        organizationId String
        organization   Organization @relation(fields: [organizationId], references: [id])
        role           Role
      }
    `);

    expect(schema.models.map((model) => model.name)).toEqual(["Organization", "Member"]);
    expect(schema.enums[0]).toEqual({ name: "Role", values: ["OWNER", "MEMBER"] });

    const member = schema.models.find((model) => model.name === "Member");
    const relation = member?.fields.find((field) => field.name === "organization");

    expect(relation?.kind).toBe("relation");
    expect(relation?.relation?.fields).toEqual(["organizationId"]);
    expect(relation?.relation?.references).toEqual(["id"]);
  });
});
