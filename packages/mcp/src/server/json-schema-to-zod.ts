import { z } from "zod";

type JsonPrimitive = string | number | boolean | null;
type JsonRecord = Record<string, unknown>;

export function firstDefined<T>(items: readonly T[]): T | undefined {
  return items[0];
}

export function describedAnySchema(description: string | undefined) {
  const anySchema = z.any();
  return description ? anySchema.describe(description) : anySchema;
}

export function singleLiteralOrAny(
  literalSchemas: readonly z.ZodLiteral<JsonPrimitive>[],
  description: string | undefined,
) {
  const single = firstDefined(literalSchemas);
  if (!single) {
    return describedAnySchema(description);
  }
  return description ? single.describe(description) : single;
}

function matchesJsonType(value: unknown, type: string): boolean {
  switch (type) {
    case "object":
      return (
        value !== null && typeof value === "object" && !Array.isArray(value)
      );
    case "array":
      return Array.isArray(value);
    case "string":
      return typeof value === "string";
    case "number":
      return Number.isFinite(value);
    case "integer":
      return Number.isInteger(value);
    case "boolean":
      return typeof value === "boolean";
    case "null":
      return value === null;
    default:
      return true;
  }
}

function sameJsonValue(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

// Evaluates a JSON Schema `if` condition the way a JSON Schema validator
// would for the keywords Kibi's operation schemas use in conditionals:
// boolean schemas, type, const, enum, required, properties (applied only to
// present keys), not, anyOf, allOf and oneOf. Keywords outside this set do not
// constrain the condition. The CLI validates the same schemas with ajv, so
// this must stay faithful: a mismatch makes MCP reject payloads the CLI
// accepts (or the reverse).
export function matchesJsonSchemaCondition(
  value: unknown,
  schema: unknown,
): boolean {
  if (schema === false) return false;
  // `true`, a missing schema and any other non-object accept everything.
  if (schema === null || typeof schema !== "object") return true;
  const condition = schema as JsonRecord;
  const types = [condition.type]
    .flat()
    .filter((entry): entry is string => typeof entry === "string");
  if (types.length > 0 && !types.some((type) => matchesJsonType(value, type))) {
    return false;
  }
  if (
    Object.hasOwn(condition, "const") &&
    !sameJsonValue(value, condition.const)
  ) {
    return false;
  }
  if (
    Array.isArray(condition.enum) &&
    !condition.enum.some((entry) => sameJsonValue(value, entry))
  ) {
    return false;
  }
  const isObject =
    value !== null && typeof value === "object" && !Array.isArray(value);
  if (isObject) {
    const record = value as JsonRecord;
    const required = Array.isArray(condition.required)
      ? condition.required.filter(isRequiredKey)
      : [];
    if (!required.every((key) => Object.hasOwn(record, key))) return false;
    // Entries of a non-object `properties` are non-object schemas, which
    // accept everything.
    for (const [key, propertySchema] of Object.entries(
      (condition.properties ?? {}) as JsonRecord,
    )) {
      if (
        Object.hasOwn(record, key) &&
        !matchesJsonSchemaCondition(record[key], propertySchema)
      ) {
        return false;
      }
    }
  }
  if ("not" in condition && matchesJsonSchemaCondition(value, condition.not)) {
    return false;
  }
  if (
    Array.isArray(condition.anyOf) &&
    !condition.anyOf.some((entry) => matchesJsonSchemaCondition(value, entry))
  ) {
    return false;
  }
  if (
    Array.isArray(condition.allOf) &&
    !condition.allOf.every((entry) => matchesJsonSchemaCondition(value, entry))
  ) {
    return false;
  }
  if (
    Array.isArray(condition.oneOf) &&
    condition.oneOf.filter((entry) => matchesJsonSchemaCondition(value, entry))
      .length !== 1
  ) {
    return false;
  }
  return true;
}

/** A usable `required` entry: a non-empty key name. */
function isRequiredKey(key: unknown): key is string {
  return typeof key === "string" && key !== "";
}

function conditionalRequiredKeys(
  value: JsonRecord,
  condition: unknown,
): readonly string[] {
  if (condition === null || typeof condition !== "object") return [];
  const rule = condition as JsonRecord;
  if (!("if" in rule) || !("then" in rule)) return [];
  if (!matchesJsonSchemaCondition(value, rule.if)) return [];
  // A non-object `then` has no `required` list.
  const required = (rule.then as JsonRecord | null | undefined)?.required;
  return Array.isArray(required) ? required.filter(isRequiredKey) : [];
}

const GUARD_KEYWORDS = new Set([
  "required",
  "not",
  "anyOf",
  "allOf",
  "description",
]);

// A guard branch only states which keys must or must not be present
// (required/not/anyOf/allOf of such conditions). It carries no property
// schemas, so enforcing a oneOf of guard branches can only tighten
// validation, never loosen it.
function isGuardBranch(branch: unknown): boolean {
  // A primitive or a list has no guard keywords among its keys, so only a
  // non-empty record of guard keywords qualifies.
  const record = (branch ?? {}) as JsonRecord;
  const keys = Object.keys(record);
  return (
    keys.length > 0 &&
    keys.every((key) => {
      if (!GUARD_KEYWORDS.has(key)) return false;
      const entry = record[key];
      if (key === "required")
        return (
          Array.isArray(entry) &&
          entry.every((item) => typeof item === "string")
        );
      if (key === "not") return isGuardBranch(entry);
      if (key === "anyOf" || key === "allOf")
        return Array.isArray(entry) && entry.every(isGuardBranch);
      return true;
    })
  );
}

function guardOneOfBranches(obj: JsonRecord): readonly JsonRecord[] | null {
  const branches = obj.oneOf;
  return Array.isArray(branches) &&
    branches.length >= 2 &&
    branches.every(isGuardBranch)
    ? (branches as JsonRecord[])
    : null;
}

function describeGuardBranch(branch: JsonRecord): string {
  const required = Array.isArray(branch.required)
    ? (branch.required as string[])
    : [];
  const forbidden = new Set<string>();
  // Only guard branches get here, so `not` and its parts are records or absent.
  const collect = (entry: unknown) => {
    const record = (entry ?? {}) as JsonRecord;
    if (Array.isArray(record.required))
      for (const key of record.required as string[]) forbidden.add(key);
    if (Array.isArray(record.anyOf))
      for (const item of record.anyOf) collect(item);
    if (Array.isArray(record.allOf))
      for (const item of record.allOf) collect(item);
  };
  collect(branch.not);
  const parts = [`{${required.join(", ")}}`];
  if (forbidden.size > 0) parts.push(`without ${[...forbidden].join(", ")}`);
  return parts.join(" ");
}

export function jsonSchemaToZod(schema: unknown): z.ZodTypeAny {
  // A missing or primitive schema has none of the keywords below, so it
  // becomes an undescribed z.any().
  const obj = (schema ?? {}) as Record<string, unknown>;

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
      return singleLiteralOrAny(literalSchemas, description);
    }
    const union = z.union(
      literalSchemas as [
        z.ZodLiteral<JsonPrimitive>,
        ...z.ZodLiteral<JsonPrimitive>[],
      ],
    );
    return description ? union.describe(description) : union;
  }

  const schemaTypes = [obj.type]
    .flat()
    .filter((value): value is string => typeof value === "string");

  // JSON Schema anyOf unions become real Zod unions so MCP output
  // validation enforces the declared alternatives instead of silently
  // degrading to z.any() — e.g. kb_check's synchronous payload versus its
  // kibi.job.v1 async receipt. oneOf is not turned into a union: its
  // required-guard branches carry no properties and a union would loosen
  // input validation. Guard oneOf branches on an object are enforced as a
  // refinement in the object case below instead.
  const anyOfVariants = Array.isArray(obj.anyOf) ? obj.anyOf : [];
  if (anyOfVariants.length > 0) {
    const variants = anyOfVariants.map((variant) =>
      jsonSchemaToZod(variant),
    ) as [z.ZodTypeAny, z.ZodTypeAny, ...z.ZodTypeAny[]];
    const union = z.union(variants);
    return typeof obj.description === "string"
      ? union.describe(obj.description)
      : union;
  }

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
      // Property names are text, so a non-text entry never matches one.
      const required = new Set<unknown>(
        Array.isArray(obj.required)
          ? obj.required.filter((key) => key !== "")
          : undefined,
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
            // Refinements run only on a value that parsed as an object.
            const record = value as JsonRecord;
            for (const condition of obj.allOf as readonly unknown[]) {
              for (const key of conditionalRequiredKeys(record, condition)) {
                if (!Object.hasOwn(record, key)) {
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
      // A top-level oneOf of guard branches (for example "plan with
      // approvedPlanHash, or recoveryJournalId alone") is enforced with the
      // same condition matcher as if/then: exactly one branch must match.
      // It is not republished as JSON Schema metadata, because hosts reject
      // a top-level oneOf in a tool input schema; the CLI enforces the same
      // rule with ajv.
      const guardBranches = guardOneOfBranches(obj);
      if (guardBranches) {
        result = result.superRefine((value, context) => {
          const matches = guardBranches.filter((branch) =>
            matchesJsonSchemaCondition(value, branch),
          ).length;
          if (matches === 1) return;
          context.addIssue({
            code: "custom",
            path: [],
            message: `Input must match exactly one of: ${guardBranches.map(describeGuardBranch).join("; ")} (matched ${matches}).`,
          });
        });
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
    default:
      return describedAnySchema(
        typeof obj.description === "string" ? obj.description : undefined,
      );
  }
}
