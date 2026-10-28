import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { FIELD_DEFINITIONS } from "../../src/lib/modules/strategy/shared/fields/m04";
import { STAGE_SCHEMAS } from "../../src/lib/modules/strategy/server/stages/m04/contracts";
import { TypedEconomicInputSchema } from "../../src/lib/modules/strategy/server/stages/m04/economics";

type SchemaInfo = { kind: string; nullable: boolean; optional: boolean; schema: any };
function inspect(input: any): SchemaInfo {
  let schema = input;
  let nullable = false,
    optional = false;
  while (schema?._def) {
    const type = (schema._def.typeName ?? schema._def.type) as string;
    if (type === "ZodNullable" || type === "nullable") {
      nullable = true;
      schema = schema._def.innerType;
      continue;
    }
    if (["ZodOptional", "ZodDefault", "optional", "default"].includes(type)) {
      optional = true;
      schema = schema._def.innerType ?? schema._def.type;
      continue;
    }
    if (["ZodEffects", "ZodBranded", "ZodReadonly", "pipe", "readonly"].includes(type)) {
      schema = schema._def.schema ?? schema._def.type;
      continue;
    }
    if (["ZodUnion", "ZodDiscriminatedUnion", "union"].includes(type)) {
      const options =
        schema._def.options instanceof Map
          ? [...schema._def.options.values()]
          : schema._def.options;
      const nonNull = options.filter((option: any) => inspect(option).kind !== "ZodNull");
      if (nonNull.length === 1 && nonNull.length !== options.length) {
        nullable = true;
        schema = nonNull[0];
        continue;
      }
      if (
        options.some((option: any) => inspect(option).kind === "ZodNumber") &&
        options.some((option: any) => inspect(option).kind === "ZodObject")
      )
        return { kind: "ZodNumericRange", nullable, optional, schema };
      return { kind: "ZodUnion", nullable, optional, schema };
    }
    const kinds: Record<string, string> = {
      object: "ZodObject",
      array: "ZodArray",
      string: "ZodString",
      number: "ZodNumber",
      boolean: "ZodBoolean",
      enum: "ZodEnum",
      unknown: "ZodUnknown",
      null: "ZodNull",
    };
    return { kind: kinds[type] ?? type, nullable, optional, schema };
  }
  return { kind: "unknown", nullable, optional, schema };
}

function fieldsMatch(fields: readonly any[], objectSchema: any, path: string): string[] {
  const shape = objectSchema.shape ?? objectSchema._def?.shape?.();
  const errors: string[] = [];
  if (!shape) return [`${path}: expected an object schema for nested fields`];
  const byKey = new Map(fields.map((field) => [field.key, field]));
  for (const key of Object.keys(shape))
    if (!byKey.has(key) && !fields.some((field) => field.mirrorBoolean === key))
      errors.push(`${path}.${key}: schema field has no descriptor`);
  for (const field of fields) {
    const raw = shape[field.key];
    if (!raw) {
      errors.push(`${path}.${field.key}: descriptor has no schema field`);
      continue;
    }
    const info = inspect(raw),
      childPath = `${path}.${field.key}`;
    if (field.optional && !info.optional)
      errors.push(`${childPath}: marked optional but schema is required`);
    if (field.nullable && !info.nullable)
      errors.push(`${childPath}: marked nullable but schema is not nullable`);
    if (info.nullable && !field.nullable)
      errors.push(`${childPath}: schema is nullable but descriptor does not preserve null`);
    if (info.kind === "ZodObject") {
      if (field.kind !== "object")
        errors.push(`${childPath}: object schema requires object editor, got ${field.kind}`);
      else errors.push(...fieldsMatch(field.itemFields ?? [], info.schema, childPath));
    } else if (info.kind === "ZodArray") {
      const element = inspect(info.schema.element ?? info.schema._def.type).kind;
      const expected =
        element === "ZodObject" || element === "ZodUnknown"
          ? "object-list"
          : element === "ZodEnum"
            ? "select-list"
            : "list";
      if (field.kind !== expected && field.kind !== "computed")
        errors.push(`${childPath}: array of ${element} requires ${expected}, got ${field.kind}`);
      if (expected === "object-list" && element === "ZodObject")
        errors.push(
          ...fieldsMatch(
            field.itemFields ?? [],
            info.schema.element ?? info.schema._def.type,
            childPath + "[]",
          ),
        );
    } else if (info.kind === "ZodBoolean") {
      if (field.kind !== "boolean" && field.kind !== "nullable-boolean")
        errors.push(`${childPath}: boolean schema requires boolean editor, got ${field.kind}`);
    } else if (info.kind === "ZodEnum") {
      if (field.kind !== "select" && field.kind !== "computed")
        errors.push(`${childPath}: enum schema requires select editor, got ${field.kind}`);
      const values = [...(info.schema.options ?? info.schema._def.values ?? [])].sort().join("|");
      const options = (field.options ?? [])
        .map((option: any) => option.value)
        .sort()
        .join("|");
      if (field.kind !== "computed" && values !== options)
        errors.push(`${childPath}: select options do not match schema enum`);
    } else if (info.kind === "ZodNumber") {
      if (field.kind !== "number" && field.kind !== "range" && field.kind !== "computed")
        errors.push(`${childPath}: numeric schema requires number editor, got ${field.kind}`);
    } else if (info.kind === "ZodNumericRange") {
      if (field.kind !== "range" && field.kind !== "computed")
        errors.push(
          `${childPath}: numeric scalar/range union requires range editor, got ${field.kind}`,
        );
    } else if (info.kind === "ZodString") {
      if (!["text", "textarea", "computed", "select"].includes(field.kind))
        errors.push(`${childPath}: string schema requires text editor, got ${field.kind}`);
    } else if (info.kind === "ZodUnknown") {
      // Opaque arrays such as typed economic inputs are shape-checked by their dedicated runtime schema.
    } else if (info.kind !== "ZodUnion")
      errors.push(`${childPath}: unhandled schema kind ${info.kind}`);
  }
  return errors;
}

describe("M04 stage field descriptors", () => {
  it("cover every contract field with an editor matching its schema shape", () => {
    const errors = Object.entries(STAGE_SCHEMAS).flatMap(([stage, schema]) => {
      const definition = FIELD_DEFINITIONS[stage];
      assert.ok(definition, `missing stage definition ${stage}`);
      return fieldsMatch(definition.fields, schema, stage);
    });
    assert.deepEqual(errors, []);
    const inputFields = FIELD_DEFINITIONS["financial-grounding"].fields.find(
      (field) => field.key === "inputs",
    )!.itemFields!;
    const inputKeys = new Set(inputFields.map((field) => field.key));
    const variants = TypedEconomicInputSchema.options.flatMap((variant: any) =>
      variant._def.type === "union" ? variant.options : [variant],
    );
    for (const variant of variants as any[])
      assert.deepEqual(
        Object.keys(variant.shape).sort(),
        [...inputKeys].sort(),
        "typed economic input descriptors must cover each variant exactly",
      );
    assert.equal(inputFields.find((field) => field.key === "input_type")?.kind, "select");
    assert.deepEqual(
      inputFields
        .find((field) => field.key === "input_type")
        ?.options?.map((option) => option.value),
      ["actual", "estimate", "hypothesis", "unknown"],
    );
    assert.equal(inputFields.find((field) => field.key === "value_or_range")?.kind, "range");
  });
});
