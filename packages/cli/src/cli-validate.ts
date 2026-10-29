import Ajv from "ajv";

// implements REQ-kibi-operation-interface-parity
export type DiagnosticTelemetry = Readonly<Record<string, unknown>>;

// implements REQ-kibi-operation-interface-parity
export type ValidationResult =
  | { readonly valid: true }
  | { readonly valid: false; readonly errors: readonly string[] };

// implements REQ-kibi-operation-interface-parity
export type PreparedInputResult =
  | {
      readonly valid: true;
      readonly businessInput: Readonly<Record<string, unknown>>;
      readonly telemetry?: DiagnosticTelemetry;
    }
  | { readonly valid: false; readonly errors: readonly string[] };

function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

// One validator per operation schema. Building an Ajv instance compiles the
// JSON Schema meta-schema, and a CLI call validates its input more than once.
const inputValidator = new Ajv({ allErrors: true, strict: false });
const compiledInputSchemas = new WeakMap<object, ReturnType<Ajv["compile"]>>();

function compileInputSchema(schema: object): ReturnType<Ajv["compile"]> {
  let validator = compiledInputSchemas.get(schema);
  if (validator === undefined) {
    const exact = { ...schema, additionalProperties: false };
    try {
      validator = inputValidator.compile(exact);
    } catch {
      // A schema whose $id the shared instance already holds for another
      // schema object compiles on an instance of its own.
      validator = new Ajv({ allErrors: true, strict: false }).compile(exact);
    }
    compiledInputSchemas.set(schema, validator);
  }
  return validator;
}

function formatValidationErrors(
  errors: NonNullable<ReturnType<Ajv["compile"]>["errors"]>,
): string[] {
  return errors.map((error) => {
    const location = error.instancePath.length > 0 ? error.instancePath : "/";
    const parameters = Object.values(error.params).join(", ");
    return `${location} ${error.message ?? "is invalid"}${parameters.length > 0 ? `: ${parameters}` : ""}`;
  });
}

// implements REQ-kibi-operation-interface-parity
export function prepareOperationInput(
  input: unknown,
  schema: object,
): PreparedInputResult {
  if (!isObject(input)) {
    return { valid: false, errors: ["input must be an object"] };
  }

  const telemetryValue = input._diagnostic_telemetry;
  if (telemetryValue !== undefined && !isObject(telemetryValue)) {
    return {
      valid: false,
      errors: ["_diagnostic_telemetry must be an object when provided"],
    };
  }

  const businessInput = Object.fromEntries(
    Object.entries(input).filter(([key]) => key !== "_diagnostic_telemetry"),
  );
  const validator = compileInputSchema(schema);
  if (!validator(businessInput)) {
    return {
      valid: false,
      errors: validator.errors
        ? formatValidationErrors(validator.errors)
        : ["input is invalid"],
    };
  }

  return telemetryValue === undefined
    ? { valid: true, businessInput }
    : { valid: true, businessInput, telemetry: telemetryValue };
}

// implements REQ-kibi-operation-interface-parity
export function validateAgainstSchema(
  input: unknown,
  schema: object,
): ValidationResult {
  const result = prepareOperationInput(input, schema);
  return result.valid
    ? { valid: true }
    : { valid: false, errors: result.errors };
}
