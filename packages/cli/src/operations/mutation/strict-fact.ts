const PROPERTY_VALUE_FIELDS = [
  "value_string",
  "value_int",
  "value_number",
  "value_bool",
] as const;

// implements REQ-kibi-operation-interface-parity
export function valueFieldHint(value: unknown): string {
  if (typeof value === "boolean") {
    return `Use value_type: "bool" plus value_bool: ${String(value)}.`;
  }
  if (typeof value === "number") {
    return Number.isInteger(value)
      ? `Use value_type: "int" plus value_int: ${String(value)}.`
      : `Use value_type: "number" plus value_number: ${String(value)}.`;
  }
  if (typeof value === "string") {
    return `Use value_type: "string" plus value_string: ${JSON.stringify(value)}.`;
  }
  return "Use value_type plus exactly one of value_string, value_int, value_number, or value_bool.";
}

// implements REQ-kibi-operation-interface-parity
export function factKindShapeHints(
  entity: Readonly<Record<string, unknown>>,
): string[] {
  if (entity.type !== "fact") return [];
  if (entity.fact_kind === "property_value") {
    const missing = [
      "subject_key",
      "property_key",
      "operator",
      "value_type",
    ].filter((field) => entity[field] === undefined);
    const present = PROPERTY_VALUE_FIELDS.filter(
      (field) => entity[field] !== undefined,
    );
    const hints: string[] = [];
    if (missing.length > 0) {
      hints.push(`fact_kind 'property_value' requires ${missing.join(", ")}.`);
    }
    if (present.length !== 1) {
      hints.push(
        "fact_kind 'property_value' requires exactly one typed value field: value_string, value_int, value_number, or value_bool.",
      );
    }
    if (hints.length > 0) {
      hints.push(
        "Next action: use kb_model_requirement for prose claims, or provide subject_key, property_key, operator, value_type, and one value_* field in kb_upsert.properties.",
      );
    }
    return hints;
  }
  if (entity.fact_kind !== "predicate") return [];
  const args = entity.predicate_args;
  const missing = [
    ...(entity.predicate_name === undefined ? ["predicate_name"] : []),
    ...(!Array.isArray(args) || args.length === 0 ? ["predicate_args"] : []),
    ...(entity.canonical_key === undefined ? ["canonical_key"] : []),
  ];
  return missing.length === 0
    ? []
    : [
        `fact_kind 'predicate' requires ${missing.join(", ")}.`,
        "Next action: call kb_suggest_predicates before hand-writing ontology predicate facts.",
      ];
}

// implements REQ-kibi-operation-interface-parity
export function validateFactModelingShape(
  entity: Readonly<Record<string, unknown>>,
): void {
  const hints = factKindShapeHints(entity);
  if (hints.length > 0) {
    throw new Error(`Entity validation failed: ${hints.join("; ")}`);
  }
}
