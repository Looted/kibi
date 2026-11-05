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

// The named groups of a match, typed by name. A required group of a pattern
// that matched is always set; an optional one may still be undefined.
function groupsOf<K extends string>(
  text: string,
  pattern: RegExp,
): Readonly<Record<K, string>> | undefined {
  return text.match(pattern)?.groups as Readonly<Record<K, string>> | undefined;
}

function suggestion(
  payload: Payload,
  evidence: string,
  claim: SemanticStrictPropertyClaim,
  rationale: string,
  confidence: number,
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

// A member name: an identifier, a dotted or scoped module specifier
// (@scope/pkg, node:fs/promises, ./local) or a key.
const IDENTIFIER = /^(?:\.\.?\/|[@.])?[A-Za-z_][\w.:/@-]*$/;

// A subject whose members have fields: "every table", "each request body".
const FIELD_OWNER =
  /\b(?:tables?|objects?|schemas?|rows?|records?|models?|entit(?:y|ies)|types?|payloads?|dtos?|interfaces?|request\s+bod(?:y|ies)|response\s+bod(?:y|ies))\b/i;

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
  // The article is not a state: "A member can never become owner" is about
  // the member state, with no machine named.
  const never = groupsOf<"base" | "from" | "to">(
    statement.replace(/^(?:an?|the)\s+/i, ""),
    /^(?<from>[\w-]+)(?:\s(?<base>[\w\s-]+?))?\s+(?:can|may|must|shall|should)\s+never\s+(?:become|reach|transition\s+to|move\s+to|go\s+(?:back\s+)?to)\s+(?<to>[\w-]+)\.?$/i,
  );
  if (never)
    return suggestion(
      payload,
      `${never.from} ... never ... ${never.to}`,
      {
        subject_key: normalizeSubjectKey(never.base ?? "workflow"),
        property_key: "reachable_pairs",
        operator: "excludes",
        value_type: "set",
        value_set: [`${never.from.toLowerCase()}->${never.to.toLowerCase()}`],
      },
      "A state that can never reach another is a reachable_pairs set fact with operator excludes; a state_machine proof checks that no path of the code's machine joins them.",
      0.86,
    );

  const waypoint = groupsOf<"base" | "from" | "to" | "via">(
    statement,
    /^(?:in\s+(?:the\s|an?\s)?(?<base>.+?),\s*)?(?:every|each|any)\s+path\s+from\s+(?<from>[\w-]+)\s+to\s+(?<to>[\w-]+)\s+(?:must|shall|should)\s+(?:pass|go)\s+through\s+(?<via>[\w-]+)\.?$/i,
  );
  if (waypoint)
    return suggestion(
      payload,
      `path from ${waypoint.from} to ${waypoint.to} ... through ${waypoint.via}`,
      {
        subject_key: normalizeSubjectKey(waypoint.base ?? "workflow"),
        property_key: "required_waypoints",
        operator: "includes",
        value_type: "set",
        value_set: [`${waypoint.from}->${waypoint.to} via ${waypoint.via}`],
      },
      'A state every path passes through is a required_waypoints set fact ("from->to via state"); a state_machine proof checks that the target is reachable and every path to it passes through the state.',
      0.86,
    );

  const middleware = groupsOf<"prefix" | "values">(
    statement,
    /^(?:every|each|all)\s+(?:routes?|endpoints?|handlers?)\s+(?:under|below|in)\s+`?(?<prefix>\/[^\s`]*)`?\s+(?:must|shall|should)\s+(?:use|run|apply|be\s+(?:protected|guarded)\s+by|go\s+through)\s+(?:the\s+)?(?<values>.+?)(?:\s+middleware)?\.?$/i,
  );
  if (middleware) {
    const values = splitValues(middleware.values);
    if (values.length > 0 && values.every((value) => IDENTIFIER.test(value)))
      return suggestion(
        payload,
        `under ${middleware.prefix} ... ${middleware.values}`,
        {
          subject_key: normalizeSubjectKey(`routes ${middleware.prefix}`),
          property_key: "middleware",
          operator: "includes",
          value_type: "set",
          value_set: values,
        },
        "Middleware every route under a prefix runs is a middleware set fact with operator includes; a source proof reads the app's route table and checks each route.",
        0.84,
      );
  }

  // Fields need a schema word: "every table must have id", "every
  // organization must have the field owner_id" or "... an id column".
  // "Every organization must have an owner" is about membership, not a
  // column, and stays out.
  const fields = groupsOf<"lead" | "subject" | "trail" | "values">(
    statement,
    /^(?:every|each|all)\s(?<subject>.+?)\s(?:must|shall|should)\s+(?:have|include|contain|define|declare)\s+(?:an?\s+|the\s+)?(?:(?:required|non-null)\s+)?(?:(?<lead>fields?|columns?|propert(?:y|ies))\s+)?(?<values>.+?)(?:\s+(?:as\s+)?(?:(?:required|non-null)\s+)?(?<trail>fields?|columns?|propert(?:y|ies)))?\.?$/i,
  );
  if (
    fields &&
    (fields.lead !== undefined ||
      fields.trail !== undefined ||
      FIELD_OWNER.test(fields.subject))
  ) {
    const values = splitValues(fields.values);
    if (values.length > 0 && values.every((value) => IDENTIFIER.test(value)))
      return suggestion(
        payload,
        `have ${fields.values}`,
        {
          subject_key: normalizeSubjectKey(fields.subject),
          property_key: "required_fields",
          operator: "includes",
          value_type: "set",
          value_set: values,
        },
        "Fields every table or object must have are a required_fields set fact; a source proof reads the schema or validator and checks each one (typecheck proves it for one type).",
        0.84,
      );
  }

  const nullable = groupsOf<"subject" | "values">(
    statement,
    /^(?:the\s+)?(?<values>.+?)\s+(?:column|field|property)s?\s+(?:of|in|on)\s+(?:the\s)?(?<subject>[\w\s-]+?)\s(?:must|shall|should)\s+be\s+(?:nullable|optional\s+null)\.?$/i,
  );
  if (nullable) {
    const values = splitValues(nullable.values);
    if (values.length > 0 && values.every((value) => IDENTIFIER.test(value)))
      return suggestion(
        payload,
        `${nullable.values} ... nullable`,
        {
          subject_key: normalizeSubjectKey(nullable.subject),
          property_key: "nullable_fields",
          operator: "includes",
          value_type: "set",
          value_set: values,
        },
        "A field that must accept null is a nullable_fields set fact; a source proof reads the schema or validator and checks it.",
        0.84,
      );
  }

  const within = groupsOf<"subject" | "values">(
    statement,
    /^(?:every|each|all|any)\s(?<subject>.+?)\s(?:must|shall|should)\s+be\s+(?:one\s+of|(?:declared|listed)\s+(?:in|among))\s+(?<values>.+?)\.?$/i,
  );
  if (within) {
    const values = splitValues(within.values);
    if (values.length > 1)
      return suggestion(
        payload,
        `one of ${within.values}`,
        {
          subject_key: normalizeSubjectKey(within.subject),
          property_key: "allowed_values",
          operator: "subset_of",
          value_type: "set",
          value_set: values,
        },
        "A claim that every member stays within a set is a set fact with operator subset_of: the members the code uses must all be listed, and listed values need not all be used. A source proof reads the members from the project.",
        0.84,
      );
  }

  const forbidden = groupsOf<"subject" | "values" | "verb">(
    statement,
    /^(?<subject>.+?)\s(?:must|shall|should)\s+never\s+(?<verb>use|import|call|read|throw)\s+(?<values>.+?)\.?$/i,
  );
  if (forbidden) {
    const values = splitValues(forbidden.values);
    // The pattern only reads the verbs NEVER_VERBS names.
    const property = NEVER_VERBS[forbidden.verb.toLowerCase()] as string;
    if (values.length > 0 && values.every((value) => IDENTIFIER.test(value)))
      return suggestion(
        payload,
        `never ${forbidden.verb} ${forbidden.values}`,
        {
          subject_key: normalizeSubjectKey(forbidden.subject),
          property_key: property,
          operator: "excludes",
          value_type: "set",
          value_set: values,
        },
        "Something the code must never use is a set fact with operator excludes; a source proof reads every reference the code makes (imports, calls, environment variables) and checks none is listed.",
        0.84,
      );
  }

  const exactly = groupsOf<"subject" | "values">(
    statement,
    /^(?<subject>.+?)\s(?:must|shall|should)\s+(?:be|contain|list|declare|have|provide)\s+exactly\s+(?:the\s+[\w-]+\s+)?(?<values>.+?)\.?$/i,
  );
  if (exactly) {
    const values = splitValues(exactly.values);
    if (values.length > 0 && values.every((value) => IDENTIFIER.test(value)))
      return suggestion(
        payload,
        `exactly ${exactly.values}`,
        {
          subject_key: normalizeSubjectKey(exactly.subject),
          property_key: "members",
          operator: "eq",
          value_type: "set",
          value_set: values,
        },
        "Members a set must have exactly are a set fact with operator eq; a source proof reads the members from the project (json or yaml keys, glob matches) and compares the whole set.",
        0.84,
      );
  }

  const atLeast = groupsOf<"subject" | "values">(
    statement,
    /^(?<subject>.+?)\s(?:must|shall|should)\s+(?:always\s+)?(?:include|contain|list|declare)\s+at\s+least\s+(?<values>.+?)\.?$/i,
  );
  if (atLeast) {
    const values = splitValues(atLeast.values);
    if (values.length > 0 && values.every((value) => IDENTIFIER.test(value)))
      return suggestion(
        payload,
        `at least ${atLeast.values}`,
        {
          subject_key: normalizeSubjectKey(atLeast.subject),
          property_key: "members",
          operator: "includes",
          value_type: "set",
          value_set: values,
        },
        "Members a set must contain are a set fact with operator includes; a source proof reads the members from the project.",
        0.84,
      );
  }
  return null;
}

// implements REQ-mcp-semantic-advisor-preflight
export function detectStrictSuggestion(
  payload: Payload,
  statement: string,
): SemanticModelingSuggestion | null {
  const expiry = groupsOf<"subject" | "unit" | "value">(
    statement,
    /^(?<subject>.+?)\sexpir(?:e|es)\s+after\s+(?<value>\d+)\s+(?<unit>days?|months?|years?|hours?|minutes?)\.?$/i,
  );
  if (expiry) {
    const unit = expiry.unit.toLowerCase().replace(/s?$/, "s");
    return suggestion(
      payload,
      `expire after ${expiry.value} ${expiry.unit}`,
      {
        subject_key: normalizeSubjectKey(expiry.subject),
        property_key: `expiry_${unit}`,
        operator: "eq",
        value_type: "int",
        value_int: Number(expiry.value),
        unit,
      },
      "Expiry duration is a scalar strict property and should be explicit.",
      0.88,
    );
  }

  const comparative = groupsOf<"operator" | "subject" | "value">(
    statement,
    /^(?<subject>.+?)\s(?:must|shall|should)\s+be\s+(?<operator>less\s+than|greater\s+than|below|above|minimum|maximum|at\s+least|at\s+most)\s+(?<value>\d+)\.?$/i,
  );
  if (comparative) {
    const operatorText = comparative.operator.toLowerCase();
    const operator = /less|below/.test(operatorText)
      ? "lt"
      : /greater|above/.test(operatorText)
        ? "gt"
        : /minimum|least/.test(operatorText)
          ? "gte"
          : "lte";
    return suggestion(
      payload,
      `${comparative.operator} ${comparative.value}`,
      {
        subject_key: normalizeSubjectKey(comparative.subject),
        property_key: "value",
        operator,
        value_type: "int",
        value_int: Number(comparative.value),
      },
      "Comparative numeric prose is a strict property constraint.",
      0.86,
    );
  }

  const precision = groupsOf<"subject">(
    statement,
    /^.+?\s(?:must|shall|should)\s+normalize\s+into\s+canonical\s+integer\s+decisecond\s+(?<subject>[a-z][a-z0-9_-]*)\s+values?\.?$/i,
  );
  if (precision) {
    return suggestion(
      payload,
      statement,
      {
        subject_key: normalizeSubjectKey(precision.subject),
        property_key: "slot_precision",
        operator: "eq",
        value_type: "string",
        value_string: "decisecond",
      },
      "Canonical decisecond slot prose is a strict precision property.",
      0.9,
    );
  }

  const threshold = groupsOf<"subject" | "unit" | "value">(
    statement,
    /^(?<subject>.+?)\s(?:must|shall|should)\s+return\s+within\s+(?<value>\d+)\s+(?<unit>ms|milliseconds?|s|sec|secs|seconds?)\.?$/i,
  );
  if (threshold) {
    const unit = threshold.unit.toLowerCase().startsWith("m")
      ? "ms"
      : "seconds";
    return suggestion(
      payload,
      `within ${threshold.value} ${threshold.unit}`,
      {
        subject_key: normalizeSubjectKey(threshold.subject),
        property_key: unit === "ms" ? "latency_ms" : "latency_seconds",
        operator: "lte",
        value_type: "int",
        value_int: Number(threshold.value),
        unit,
      },
      "Response-time thresholds are bounded numeric properties and should be modeled explicitly.",
      0.88,
    );
  }

  const booleanState = groupsOf<"state" | "subject">(
    statement,
    /^(?<subject>.+?)\s(?:must|shall|should)\s+be\s+(?<state>enabled|disabled)\.?$/i,
  );
  if (booleanState) {
    return suggestion(
      payload,
      `be ${booleanState.state}`,
      {
        subject_key: normalizeSubjectKey(booleanState.subject),
        property_key: "enabled",
        operator: "eq",
        value_type: "bool",
        value_bool: booleanState.state.toLowerCase() === "enabled",
      },
      "Enabled/disabled requirements are boolean properties and can participate in strict checks.",
      0.88,
    );
  }

  const retention = groupsOf<"subject" | "unit" | "value">(
    statement,
    /^(?<subject>.+?)\s(?:must|shall|should)\s+be\s+retained\s+for\s+(?<value>\d+)\s+(?<unit>days?|months?|years?)\.?$/i,
  );
  if (retention) {
    const unit = retention.unit.toLowerCase().replace(/s?$/, "s");
    return suggestion(
      payload,
      `retained for ${retention.value} ${retention.unit}`,
      {
        subject_key: normalizeSubjectKey(retention.subject),
        property_key: `retention_${unit}`,
        operator: "eq",
        value_type: "int",
        value_int: Number(retention.value),
        unit,
      },
      "Retention duration is a scalar strict property and can participate in contradiction checks.",
      0.92,
    );
  }

  // "Every currency in GBP, ILS and ZAR must fail closed": every member of
  // the set must have the property, which names the fact. The operator is
  // includes, not eq: other members may have the property too, so two such
  // claims over different sets agree. A rule certificate over the property's
  // predicate, or an exhaustive one whose per-member check is the property,
  // proves it.
  const everyMember = groupsOf<"predicate" | "subject" | "values">(
    statement,
    /^(?:every|each|all)\s(?<subject>.+?)\sin\s+(?<values>.+?)\s+(?:must|shall|should)\s(?<predicate>.+?)\.?$/i,
  );
  if (everyMember) {
    const values = everyMember.values
      .split(/,|\band\b|\bor\b/i)
      .map((value) => value.trim())
      .filter(Boolean);
    const property = normalizeKey(everyMember.predicate)
      .split("_")
      .slice(0, 6)
      .join("_");
    if (values.length > 1 && property !== "")
      return suggestion(
        payload,
        `in ${everyMember.values}`,
        {
          subject_key: normalizeSubjectKey(everyMember.subject),
          property_key: property,
          operator: "includes",
          value_type: "set",
          value_set: [...new Set(values)].sort(),
        },
        `A claim that every member of a closed set has a property is a set fact named for the property (${property}) with operator includes: every member of its value must have the property, and other members may have it too. An exhaustive proof binds to it when its domain is that set and its per-member check is the property.`,
        0.84,
      );
  }

  // implements REQ-kibi-non-numeric-proof-kinds
  const pattern = groupsOf<"slash" | "subject" | "tick">(
    statement,
    /^(?<subject>.+?)\s(?:must|shall|should)\s+(?:always\s+)?match\s+(?:the\s+(?:pattern|regular\s+expression|regex)\s+)?(?:`(?<tick>[^`]+)`|\/(?<slash>.+)\/)\.?$/i,
  );
  if (pattern) {
    // The pattern reads one of the two quoting forms.
    const patternSource = (pattern.tick ?? pattern.slash) as string;
    return suggestion(
      payload,
      `match ${patternSource}`,
      {
        subject_key: normalizeSubjectKey(pattern.subject),
        property_key: "format",
        operator: "matches",
        value_type: "string",
        value_string: patternSource,
      },
      "A required format is a string fact with operator matches; a regex proof decides whether the code's pattern accepts exactly these strings.",
      0.86,
    );
  }

  const exactString = groupsOf<"subject" | "value">(
    statement,
    /^(?<subject>.+?)\s(?:must|shall|should)\s+(?:always\s+)?be\s+`(?<value>[^`]+)`\.?$/i,
  );
  if (exactString) {
    return suggestion(
      payload,
      `be ${exactString.value}`,
      {
        subject_key: normalizeSubjectKey(exactString.subject),
        property_key: "value",
        operator: "eq",
        value_type: "string",
        value_string: exactString.value,
      },
      "An exact quoted value is a string fact; a regex proof checks the code's constant against it.",
      0.86,
    );
  }

  const sourceShape = detectSourceShape(payload, statement);
  if (sourceShape !== null) return sourceShape;

  // implements REQ-kibi-non-numeric-proof-kinds
  const enumSet = groupsOf<"subject" | "values">(
    statement,
    /^(?<subject>.+?)\s+(?:must|shall|should)\s+be\s+one\s+of\s+(?<values>.+?)\.?$/i,
  );
  if (enumSet) {
    const values = enumSet.values
      .split(/,|\bor\b/i)
      .map((value) => value.trim())
      .filter(Boolean);
    // A machine's transitions ("draft -> sent") or its initial, terminal
    // (final) or reachable states name the projection a state_machine
    // proof checks.
    const machine = groupsOf<"base" | "projection">(
      enumSet.subject,
      /(?<base>.+?)\s(?<projection>transitions|(?:initial|terminal|final|reachable)\s+states)$/i,
    );
    const projection = machine?.projection
      .toLowerCase()
      .replace("final", "terminal")
      .replace(/\s+/, "_");
    if (
      machine &&
      values.length > 0 &&
      (projection !== "transitions" ||
        values.every((value) => /->|\u2192/.test(value)))
    )
      return suggestion(
        payload,
        `one of ${enumSet.values}`,
        {
          subject_key: normalizeSubjectKey(machine.base),
          property_key: projection as string,
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
      );
    if (values.length > 1)
      return suggestion(
        payload,
        `one of ${enumSet.values}`,
        {
          subject_key: normalizeSubjectKey(enumSet.subject),
          property_key: "allowed_values",
          operator: "eq",
          value_type: "set",
          value_set: [...new Set(values)].sort(),
        },
        "Allowed enum sets are explicit set values and should not remain prose-only; an exhaustive or typecheck proof can bind to the set.",
        0.86,
      );
  }

  return detectCountStrictSuggestion(payload, statement);
}
