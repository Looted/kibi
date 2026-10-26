import {
  type Payload,
  normalizeKey,
  normalizeSubjectKey,
  strictSuggestion,
} from "./shared.js";
import { detectCountStrictSuggestion } from "./strict-count-rules.js";
import type {
  SemanticModelingSuggestion,
  SemanticStrictPropertyClaim,
} from "./types.js";

function suggestion(
  payload: Payload,
  match: RegExpMatchArray,
  claim: SemanticStrictPropertyClaim,
  rationale: string,
  confidence: number,
  evidence = match[0],
): SemanticModelingSuggestion {
  return strictSuggestion(payload, evidence, claim, rationale, confidence);
}

const splitValues = (text: string): string[] =>
  [
    ...new Set(
      text
        .split(/,|\band\b|\bor\b|\bnor\b/i)
        .map((value) =>
          value
            .trim()
            .replace(/^(?:the|a|an)\s+/i, "")
            .replace(/^`|`$/g, ""),
        )
        .filter(Boolean),
    ),
  ].sort();

const IDENTIFIER = /^[A-Za-z_][\w.:/@-]*$/;

const NEVER_VERBS: Readonly<Record<string, string>> = {
  use: "uses",
  import: "imports",
  call: "calls",
  read: "reads",
  throw: "throws",
};

/**
 * Set claims a source or state_machine proof decides: a machine state that
 * can never reach another, a state every path passes through, middleware
 * every route under a prefix runs, fields every table or object has, a
 * nullable field, members a set must stay within, and references the code
 * must never make.
 */
// implements REQ-kibi-source-proof-kinds
export function detectSourceShape(
  payload: Payload,
  statement: string,
): SemanticModelingSuggestion | null {
  const never = statement.match(
    /^(?:an?\s+|the\s+)?(?<from>[\w-]+)\s+(?<base>[\w\s-]+?)\s+(?:can|may|must|shall|should)\s+never\s+(?:become|reach|transition\s+to|move\s+to|go\s+(?:back\s+)?to)\s+(?<to>[\w-]+)\.?$/i,
  );
  if (never?.groups?.from && never.groups.base && never.groups.to)
    return suggestion(
      payload,
      never,
      {
        subject_key: normalizeSubjectKey(never.groups.base),
        property_key: "reachable_pairs",
        operator: "excludes",
        value_type: "set",
        value_set: [
          `${never.groups.from.toLowerCase()}->${never.groups.to.toLowerCase()}`,
        ],
      },
      "A state that can never reach another is a reachable_pairs set fact with operator excludes; a state_machine proof checks that no path of the code's machine joins them.",
      0.86,
      `${never.groups.from} ... never ... ${never.groups.to}`,
    );

  const waypoint = statement.match(
    /^(?:in\s+(?:the\s+|an?\s+)?(?<base>.+?),\s*)?(?:every|each|any)\s+path\s+from\s+(?<from>[\w-]+)\s+to\s+(?<to>[\w-]+)\s+(?:must|shall|should)\s+(?:pass|go)\s+through\s+(?<via>[\w-]+)\.?$/i,
  );
  if (waypoint?.groups?.from && waypoint.groups.to && waypoint.groups.via)
    return suggestion(
      payload,
      waypoint,
      {
        subject_key: normalizeSubjectKey(waypoint.groups.base ?? "workflow"),
        property_key: "required_waypoints",
        operator: "includes",
        value_type: "set",
        value_set: [
          `${waypoint.groups.from}->${waypoint.groups.to} via ${waypoint.groups.via}`,
        ],
      },
      'A state every path passes through is a required_waypoints set fact ("from->to via state"); a state_machine proof checks that the target is reachable and every path to it passes through the state.',
      0.86,
      `path from ${waypoint.groups.from} to ${waypoint.groups.to} ... through ${waypoint.groups.via}`,
    );

  const middleware = statement.match(
    /^(?:every|each|all)\s+(?:routes?|endpoints?|handlers?)\s+(?:under|below|in)\s+`?(?<prefix>\/[^\s`]*)`?\s+(?:must|shall|should)\s+(?:use|run|apply|be\s+(?:protected|guarded)\s+by|go\s+through)\s+(?:the\s+)?(?<values>.+?)(?:\s+middleware)?\.?$/i,
  );
  if (middleware?.groups?.prefix && middleware.groups.values) {
    const values = splitValues(middleware.groups.values);
    if (values.length > 0 && values.every((value) => IDENTIFIER.test(value)))
      return suggestion(
        payload,
        middleware,
        {
          subject_key: normalizeSubjectKey(
            `routes ${middleware.groups.prefix}`,
          ),
          property_key: "middleware",
          operator: "includes",
          value_type: "set",
          value_set: values,
        },
        "Middleware every route under a prefix runs is a middleware set fact with operator includes; a source proof reads the app's route table and checks each route.",
        0.84,
        `under ${middleware.groups.prefix} ... ${middleware.groups.values}`,
      );
  }

  const fields = statement.match(
    /^(?:every|each|all)\s+(?<subject>[\w\s-]+?)\s+(?:must|shall|should)\s+(?:have|include|contain|define)\s+(?:the\s+)?(?:(?:required\s+)?(?:fields?|columns?|properties)\s+)?(?<values>.+?)\.?$/i,
  );
  if (fields?.groups?.subject && fields.groups.values) {
    const values = splitValues(fields.groups.values);
    if (values.length > 0 && values.every((value) => IDENTIFIER.test(value)))
      return suggestion(
        payload,
        fields,
        {
          subject_key: normalizeSubjectKey(fields.groups.subject),
          property_key: "required_fields",
          operator: "includes",
          value_type: "set",
          value_set: values,
        },
        "Fields every table or object must have are a required_fields set fact; a source proof reads the schema or validator and checks each one (typecheck proves it for one type).",
        0.84,
        `have ${fields.groups.values}`,
      );
  }

  const nullable = statement.match(
    /^(?:the\s+)?(?<values>.+?)\s+(?:column|field|property)s?\s+(?:of|in|on)\s+(?:the\s+)?(?<subject>[\w\s-]+?)\s+(?:must|shall|should)\s+be\s+(?:nullable|optional\s+null)\.?$/i,
  );
  if (nullable?.groups?.subject && nullable.groups.values) {
    const values = splitValues(nullable.groups.values);
    if (values.length > 0 && values.every((value) => IDENTIFIER.test(value)))
      return suggestion(
        payload,
        nullable,
        {
          subject_key: normalizeSubjectKey(nullable.groups.subject),
          property_key: "nullable_fields",
          operator: "includes",
          value_type: "set",
          value_set: values,
        },
        "A field that must accept null is a nullable_fields set fact; a source proof reads the schema or validator and checks it.",
        0.84,
        `${nullable.groups.values} ... nullable`,
      );
  }

  const within = statement.match(
    /^(?:every|each|all|any)\s+(?<subject>.+?)\s+(?:must|shall|should)\s+be\s+(?:one\s+of|(?:declared|listed)\s+(?:in|among))\s+(?<values>.+?)\.?$/i,
  );
  if (within?.groups?.subject && within.groups.values) {
    const values = splitValues(within.groups.values);
    if (values.length > 1)
      return suggestion(
        payload,
        within,
        {
          subject_key: normalizeSubjectKey(within.groups.subject),
          property_key: "allowed_values",
          operator: "subset_of",
          value_type: "set",
          value_set: values,
        },
        "A claim that every member stays within a set is a set fact with operator subset_of: the members the code uses must all be listed, and listed values need not all be used. A source proof reads the members from the project.",
        0.84,
        `one of ${within.groups.values}`,
      );
  }

  const forbidden = statement.match(
    /^(?<subject>.+?)\s+(?:must|shall|should)\s+never\s+(?<verb>use|import|call|read|throw)\s+(?<values>.+?)\.?$/i,
  );
  if (
    forbidden?.groups?.subject &&
    forbidden.groups.verb &&
    forbidden.groups.values
  ) {
    const values = splitValues(forbidden.groups.values);
    const property = NEVER_VERBS[forbidden.groups.verb.toLowerCase()];
    if (
      property !== undefined &&
      values.length > 0 &&
      values.every((value) => IDENTIFIER.test(value))
    )
      return suggestion(
        payload,
        forbidden,
        {
          subject_key: normalizeSubjectKey(forbidden.groups.subject),
          property_key: property,
          operator: "excludes",
          value_type: "set",
          value_set: values,
        },
        "Something the code must never use is a set fact with operator excludes; a source proof reads every reference the code makes (imports, calls, environment variables) and checks none is listed.",
        0.84,
        `never ${forbidden.groups.verb} ${forbidden.groups.values}`,
      );
  }

  const atLeast = statement.match(
    /^(?<subject>.+?)\s+(?:must|shall|should)\s+(?:always\s+)?(?:include|contain|list|declare)\s+at\s+least\s+(?<values>.+?)\.?$/i,
  );
  if (atLeast?.groups?.subject && atLeast.groups.values) {
    const values = splitValues(atLeast.groups.values);
    if (values.length > 0 && values.every((value) => IDENTIFIER.test(value)))
      return suggestion(
        payload,
        atLeast,
        {
          subject_key: normalizeSubjectKey(atLeast.groups.subject),
          property_key: "members",
          operator: "includes",
          value_type: "set",
          value_set: values,
        },
        "Members a set must contain are a set fact with operator includes; a source proof reads the members from the project.",
        0.84,
        `at least ${atLeast.groups.values}`,
      );
  }
  return null;
}

// implements REQ-mcp-semantic-advisor-preflight
export function detectStrictSuggestion(
  payload: Payload,
  statement: string,
): SemanticModelingSuggestion | null {
  const expiry = statement.match(
    /^(?<subject>.+?)\s+expir(?:e|es)\s+after\s+(?<value>\d+)\s+(?<unit>days?|months?|years?|hours?|minutes?)\.?$/i,
  );
  if (expiry?.groups?.subject && expiry.groups.value && expiry.groups.unit) {
    const unit = expiry.groups.unit.toLowerCase().replace(/s?$/, "s");
    return suggestion(
      payload,
      expiry,
      {
        subject_key: normalizeSubjectKey(expiry.groups.subject),
        property_key: `expiry_${unit}`,
        operator: "eq",
        value_type: "int",
        value_int: Number(expiry.groups.value),
        unit,
      },
      "Expiry duration is a scalar strict property and should be explicit.",
      0.88,
      `expire after ${expiry.groups.value} ${expiry.groups.unit}`,
    );
  }

  const comparative = statement.match(
    /^(?<subject>.+?)\s+(?:must|shall|should)\s+be\s+(?<operator>less\s+than|greater\s+than|below|above|minimum|maximum|at\s+least|at\s+most)\s+(?<value>\d+)\.?$/i,
  );
  if (
    comparative?.groups?.subject &&
    comparative.groups.operator &&
    comparative.groups.value
  ) {
    const operatorText = comparative.groups.operator.toLowerCase();
    const operator = /less|below/.test(operatorText)
      ? "lt"
      : /greater|above/.test(operatorText)
        ? "gt"
        : /minimum|least/.test(operatorText)
          ? "gte"
          : "lte";
    return suggestion(
      payload,
      comparative,
      {
        subject_key: normalizeSubjectKey(comparative.groups.subject),
        property_key: "value",
        operator,
        value_type: "int",
        value_int: Number(comparative.groups.value),
      },
      "Comparative numeric prose is a strict property constraint.",
      0.86,
      `${comparative.groups.operator} ${comparative.groups.value}`,
    );
  }

  const precision = statement.match(
    /^.+?\s+(?:must|shall|should)\s+normalize\s+into\s+canonical\s+integer\s+decisecond\s+(?<subject>[a-z][a-z0-9_-]*)\s+values?\.?$/i,
  );
  if (precision?.groups?.subject) {
    return suggestion(
      payload,
      precision,
      {
        subject_key: normalizeSubjectKey(precision.groups.subject),
        property_key: "slot_precision",
        operator: "eq",
        value_type: "string",
        value_string: "decisecond",
      },
      "Canonical decisecond slot prose is a strict precision property.",
      0.9,
    );
  }

  const threshold = statement.match(
    /^(?<subject>.+?)\s+(?:must|shall|should)\s+return\s+within\s+(?<value>\d+)\s+(?<unit>ms|milliseconds?|s|sec|secs|seconds?)\.?$/i,
  );
  if (
    threshold?.groups?.subject &&
    threshold.groups.value &&
    threshold.groups.unit
  ) {
    const unit = threshold.groups.unit.toLowerCase().startsWith("m")
      ? "ms"
      : "seconds";
    return suggestion(
      payload,
      threshold,
      {
        subject_key: normalizeSubjectKey(threshold.groups.subject),
        property_key: unit === "ms" ? "latency_ms" : "latency_seconds",
        operator: "lte",
        value_type: "int",
        value_int: Number(threshold.groups.value),
        unit,
      },
      "Response-time thresholds are bounded numeric properties and should be modeled explicitly.",
      0.88,
      `within ${threshold.groups.value} ${threshold.groups.unit}`,
    );
  }

  const booleanState = statement.match(
    /^(?<subject>.+?)\s+(?:must|shall|should)\s+be\s+(?<state>enabled|disabled)\.?$/i,
  );
  if (booleanState?.groups?.subject && booleanState.groups.state) {
    return suggestion(
      payload,
      booleanState,
      {
        subject_key: normalizeSubjectKey(booleanState.groups.subject),
        property_key: "enabled",
        operator: "eq",
        value_type: "bool",
        value_bool: booleanState.groups.state.toLowerCase() === "enabled",
      },
      "Enabled/disabled requirements are boolean properties and can participate in strict checks.",
      0.88,
      `be ${booleanState.groups.state}`,
    );
  }

  const retention = statement.match(
    /^(?<subject>.+?)\s+(?:must|shall|should)\s+be\s+retained\s+for\s+(?<value>\d+)\s+(?<unit>days?|months?|years?)\.?$/i,
  );
  if (
    retention?.groups?.subject &&
    retention.groups.value &&
    retention.groups.unit
  ) {
    const unit = retention.groups.unit.toLowerCase().replace(/s$/, "s");
    return suggestion(
      payload,
      retention,
      {
        subject_key: normalizeSubjectKey(retention.groups.subject),
        property_key: `retention_${unit}`,
        operator: "eq",
        value_type: "int",
        value_int: Number(retention.groups.value),
        unit,
      },
      "Retention duration is a scalar strict property and can participate in contradiction checks.",
      0.92,
      `retained for ${retention.groups.value} ${retention.groups.unit}`,
    );
  }

  // "Every currency in GBP, ILS and ZAR must fail closed": every member of
  // the set must have the property, which names the fact. The operator is
  // includes, not eq: other members may have the property too, so two such
  // claims over different sets agree. A rule certificate over the property's
  // predicate, or an exhaustive one whose per-member check is the property,
  // proves it.
  const everyMember = statement.match(
    /^(?:every|each|all)\s+(?<subject>.+?)\s+in\s+(?<values>.+?)\s+(?:must|shall|should)\s+(?<predicate>.+?)\.?$/i,
  );
  if (
    everyMember?.groups?.subject &&
    everyMember.groups.values &&
    everyMember.groups.predicate
  ) {
    const values = everyMember.groups.values
      .split(/,|\band\b|\bor\b/i)
      .map((value) => value.trim())
      .filter(Boolean);
    const property = normalizeKey(everyMember.groups.predicate)
      .split("_")
      .slice(0, 6)
      .join("_");
    if (values.length > 1 && property !== "")
      return suggestion(
        payload,
        everyMember,
        {
          subject_key: normalizeSubjectKey(everyMember.groups.subject),
          property_key: property,
          operator: "includes",
          value_type: "set",
          value_set: [...new Set(values)].sort(),
        },
        `A claim that every member of a closed set has a property is a set fact named for the property (${property}) with operator includes: every member of its value must have the property, and other members may have it too. An exhaustive proof binds to it when its domain is that set and its per-member check is the property.`,
        0.84,
        `in ${everyMember.groups.values}`,
      );
  }

  // implements REQ-kibi-non-numeric-proof-kinds
  const pattern = statement.match(
    /^(?<subject>.+?)\s+(?:must|shall|should)\s+(?:always\s+)?match\s+(?:the\s+(?:pattern|regular\s+expression|regex)\s+)?(?:`(?<tick>[^`]+)`|\/(?<slash>.+)\/)\.?$/i,
  );
  const patternSource = pattern?.groups?.tick ?? pattern?.groups?.slash;
  if (pattern?.groups?.subject && patternSource) {
    return suggestion(
      payload,
      pattern,
      {
        subject_key: normalizeSubjectKey(pattern.groups.subject),
        property_key: "format",
        operator: "matches",
        value_type: "string",
        value_string: patternSource,
      },
      "A required format is a string fact with operator matches; a regex proof decides whether the code's pattern accepts exactly these strings.",
      0.86,
      `match ${patternSource}`,
    );
  }

  const exactString = statement.match(
    /^(?<subject>.+?)\s+(?:must|shall|should)\s+(?:always\s+)?be\s+`(?<value>[^`]+)`\.?$/i,
  );
  if (exactString?.groups?.subject && exactString.groups.value) {
    return suggestion(
      payload,
      exactString,
      {
        subject_key: normalizeSubjectKey(exactString.groups.subject),
        property_key: "value",
        operator: "eq",
        value_type: "string",
        value_string: exactString.groups.value,
      },
      "An exact quoted value is a string fact; a regex proof checks the code's constant against it.",
      0.86,
      `be ${exactString.groups.value}`,
    );
  }

  const sourceShape = detectSourceShape(payload, statement);
  if (sourceShape !== null) return sourceShape;

  // implements REQ-kibi-non-numeric-proof-kinds
  const enumSet = statement.match(
    /^(?<subject>.+?)\s+(?:must|shall|should)\s+be\s+one\s+of\s+(?<values>.+?)\.?$/i,
  );
  if (enumSet?.groups?.subject && enumSet.groups.values) {
    const values = enumSet.groups.values
      .split(/,|\bor\b/i)
      .map((value) => value.trim())
      .filter(Boolean);
    // A machine's transitions ("draft -> sent") or its initial, terminal
    // (final) or reachable states name the projection a state_machine
    // proof checks.
    const machine = enumSet.groups.subject.match(
      /^(?<base>.+?)\s+(?<projection>transitions|(?:initial|terminal|final|reachable)\s+states)$/i,
    );
    const projection = machine?.groups?.projection
      ?.toLowerCase()
      .replace(/^final/, "terminal")
      .replace(/\s+/, "_");
    if (
      machine?.groups?.base &&
      projection !== undefined &&
      values.length > 0 &&
      (projection !== "transitions" ||
        values.every((value) => /->|\u2192/.test(value)))
    )
      return suggestion(
        payload,
        enumSet,
        {
          subject_key: normalizeSubjectKey(machine.groups.base),
          property_key: projection,
          operator: "eq",
          value_type: "set",
          value_set: [
            ...new Set(
              values.map((value) => value.replace(/\s*(?:->|\u2192)\s*/, "->")),
            ),
          ].sort(),
        },
        "A state machine's transitions or states are a set fact named after the projection; a state_machine proof checks the code's machine against it.",
        0.86,
        `one of ${enumSet.groups.values}`,
      );
    if (values.length > 1)
      return suggestion(
        payload,
        enumSet,
        {
          subject_key: normalizeSubjectKey(enumSet.groups.subject),
          property_key: "allowed_values",
          operator: "eq",
          value_type: "set",
          value_set: [...new Set(values)].sort(),
        },
        "Allowed enum sets are explicit set values and should not remain prose-only; an exhaustive or typecheck proof can bind to the set.",
        0.86,
        `one of ${enumSet.groups.values}`,
      );
  }

  return detectCountStrictSuggestion(payload, statement);
}
