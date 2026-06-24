import { z } from "zod";

type JsonPrimitive = string | number | boolean | null;

// implements REQ-002
export function jsonSchemaToZod(schema: unknown): z.ZodTypeAny {
  if (!schema || typeof schema !== "object") {
    return z.any();
  }

  const obj = schema as Record<string, unknown>;

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
      const single = literalSchemas[0];
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

  const schemaType = typeof obj.type === "string" ? obj.type : undefined;

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
      return description ? objectSchema.describe(description) : objectSchema;
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
      return description ? arraySchema.describe(description) : arraySchema;
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
    default: {
      const anySchema = z.any();
      const description =
        typeof obj.description === "string" ? obj.description : undefined;
      return description ? anySchema.describe(description) : anySchema;
    }
  }
}
