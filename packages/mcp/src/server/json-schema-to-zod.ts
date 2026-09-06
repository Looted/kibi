import { z } from "zod";

type JsonPrimitive = string | number | boolean | null;
type JsonRecord = Record<string, unknown>;

export function firstDefined<T>(items: readonly T[]): T | undefined {
  return items[0];
}

function hasRequiredProperties(value: JsonRecord, schema: unknown): boolean {
  if (schema === null || typeof schema !== "object") return false;
  const condition = schema as JsonRecord;
  const required = Array.isArray(condition.required)
    ? condition.required.filter(
        (key): key is string => typeof key === "string" && key.length > 0,
      )
    : [];
  if (
    required.length > 0 &&
    !required.every((key) => Object.hasOwn(value, key))
  ) {
    return false;
  }
  if (
    Array.isArray(condition.anyOf) &&
    !condition.anyOf.some((entry) => hasRequiredProperties(value, entry))
  ) {
    return false;
  }
  if (
    Array.isArray(condition.allOf) &&
    !condition.allOf.every((entry) => hasRequiredProperties(value, entry))
  ) {
    return false;
  }
  return true;
}

function conditionalRequiredKeys(
  value: JsonRecord,
  condition: unknown,
): readonly string[] {
  if (condition === null || typeof condition !== "object") return [];
  const rule = condition as JsonRecord;
  if (!("if" in rule) || !("then" in rule)) return [];
  if (!hasRequiredProperties(value, rule.if)) return [];
  if (rule.then === null || typeof rule.then !== "object") return [];
  const required = (rule.then as JsonRecord).required;
  return Array.isArray(required)
    ? required.filter(
        (key): key is string => typeof key === "string" && key.length > 0,
      )
    : [];
}

// implements REQ-002
export function jsonSchemaToZod(schema: unknown): z.ZodTypeAny {
  if (!schema || typeof schema !== "object") {
    return z.any();
  }

  const obj = schema as Record<string, unknown>;

  if (Object.hasOwn(obj, "const")) {
    const description =
      typeof obj.description === "string" ? obj.description : undefined;
    const value = obj.const;
    if (
      typeof value === "string" ||
      typeof value === "number" ||
      typeof value === "boolean" ||
      value === null
    ) {
      const literal = z.literal(value);
      return description ? literal.describe(description) : literal;
    }
    return description ? z.any().describe(description) : z.any();
  }

  if (Array.isArray(obj.enum) && obj.enum.length > 0) {
    const description =
      typeof obj.description === "string" ? obj.description : undefined;
    const literals = obj.enum.filter(
      (value): value is JsonPrimitive =>
        typeof value === "string" ||
        typeof value === "number" ||
        typeof value === "boolean" ||
        value === null,
    );
    if (literals.length === 0) {
      return description ? z.any().describe(description) : z.any();
    }
    const literalSchemas = literals.map((value) => z.literal(value));
    if (literalSchemas.length === 1) {
      const single = firstDefined(literalSchemas);
      if (!single) {
        return description ? z.any().describe(description) : z.any();
      }
      return description ? single.describe(description) : single;
    }
    const union = z.union(
      literalSchemas as [
        z.ZodLiteral<JsonPrimitive>,
        ...z.ZodLiteral<JsonPrimitive>[],
      ],
    );
    return description ? union.describe(description) : union;
  }

  const schemaTypes = Array.isArray(obj.type)
    ? obj.type.filter((value): value is string => typeof value === "string")
    : typeof obj.type === "string"
      ? [obj.type]
      : [];

  // JSON Schema nullable fields are represented as a type union in the
  // catalog. Build a real Zod union so MCP publishes and validates the same
  // nullability instead of silently degrading the field to z.any().
  if (schemaTypes.length > 1) {
    const variants = schemaTypes.map((type) =>
      jsonSchemaToZod({ ...obj, type }),
    );
    return z.union(variants as [z.ZodTypeAny, z.ZodTypeAny, ...z.ZodTypeAny[]]);
  }

  const schemaType = schemaTypes[0];

  switch (schemaType) {
    case "object": {
      const properties =
        obj.properties && typeof obj.properties === "object"
          ? (obj.properties as Record<string, unknown>)
          : {};
      const required = new Set(
        Array.isArray(obj.required)
          ? obj.required.filter(
              (k): k is string => typeof k === "string" && k.length > 0,
            )
          : [],
      );

      const shape: Record<string, z.ZodTypeAny> = {};
      for (const [key, value] of Object.entries(properties)) {
        const propSchema = jsonSchemaToZod(value);
        shape[key] = required.has(key) ? propSchema : propSchema.optional();
      }

      const objectSchema =
        obj.additionalProperties === false
          ? z.object(shape)
          : z.looseObject(shape);
      const description =
        typeof obj.description === "string" ? obj.description : undefined;
      let result: z.ZodTypeAny = description
        ? objectSchema.describe(description)
        : objectSchema;
      if (Array.isArray(obj.allOf)) {
        result = result
          .superRefine((value, context) => {
            if (value === null || typeof value !== "object") return;
            for (const condition of obj.allOf as readonly unknown[]) {
              for (const key of conditionalRequiredKeys(
                value as JsonRecord,
                condition,
              )) {
                if (!Object.hasOwn(value, key)) {
                  context.addIssue({
                    code: "custom",
                    path: [key],
                    message: `Required by conditional JSON Schema rule: ${key}`,
                  });
                }
              }
            }
          })
          .meta({ allOf: obj.allOf });
      }
      return result;
    }
    case "array": {
      const itemSchema = jsonSchemaToZod(obj.items);
      let arraySchema = z.array(itemSchema);
      const description =
        typeof obj.description === "string" ? obj.description : undefined;
      if (typeof obj.minItems === "number") {
        arraySchema = arraySchema.min(obj.minItems);
      }
      if (typeof obj.maxItems === "number") {
        arraySchema = arraySchema.max(obj.maxItems);
      }
      let result: z.ZodTypeAny = description
        ? arraySchema.describe(description)
        : arraySchema;
      if (obj.uniqueItems === true) {
        result = result
          .refine(
            (values) =>
              Array.isArray(values) &&
              new Set(values.map((value) => JSON.stringify(value))).size ===
                values.length,
            { message: "Array items must be unique" },
          )
          .meta({ uniqueItems: true });
      }
      return result;
    }
    case "string": {
      let s = z.string();
      const description =
        typeof obj.description === "string" ? obj.description : undefined;
      if (typeof obj.minLength === "number") {
        s = s.min(obj.minLength);
      }
      if (typeof obj.maxLength === "number") {
        s = s.max(obj.maxLength);
      }
      if (typeof obj.pattern === "string") {
        s = s.regex(new RegExp(obj.pattern));
      }
      return description ? s.describe(description) : s;
    }
    case "number": {
      let n = z.number();
      const description =
        typeof obj.description === "string" ? obj.description : undefined;
      if (typeof obj.minimum === "number") {
        n = n.min(obj.minimum);
      }
      if (typeof obj.maximum === "number") {
        n = n.max(obj.maximum);
      }
      return description ? n.describe(description) : n;
    }
    case "integer": {
      let n = z.number().int();
      const description =
        typeof obj.description === "string" ? obj.description : undefined;
      if (typeof obj.minimum === "number") {
        n = n.min(obj.minimum);
      }
      if (typeof obj.maximum === "number") {
        n = n.max(obj.maximum);
      }
      return description ? n.describe(description) : n;
    }
    case "boolean": {
      const b = z.boolean();
      const description =
        typeof obj.description === "string" ? obj.description : undefined;
      return description ? b.describe(description) : b;
    }
    case "null": {
      const n = z.null();
      const description =
        typeof obj.description === "string" ? obj.description : undefined;
      return description ? n.describe(description) : n;
    }
    default: {
      const anySchema = z.any();
      const description =
        typeof obj.description === "string" ? obj.description : undefined;
      return description ? anySchema.describe(description) : anySchema;
    }
  }
}
