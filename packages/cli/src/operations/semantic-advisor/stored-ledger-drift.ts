import {
  escapeAtom,
  parseListOfLists,
  parsePrologValue,
} from "../../prolog/codec.js";
import { loadEntities } from "../../public/operations/discovery-entities.js";
import type { PrologPort } from "../../public/operations/runtime-types.js";
import { SEMANTIC_INVENTORY_VERSION, isRecord, stringValue } from "./shared.js";
import type { SemanticAdvisorReceipt } from "./types.js";

const LOGICAL_RELATIONSHIPS = [
  "requires_property",
  "requires_predicate",
  "requires_rule",
] as const;

type StoredClause = Readonly<{ claimKey: string; claimText: string }>;
type GroundingFact = Readonly<{
  type: string;
  target: string;
  claimKey: string;
}>;

function atom(value: string | undefined): string {
  return stringValue(parsePrologValue(value ?? "")).replace(/^['"]|['"]$/g, "");
}

function quoted(text: string): string {
  return text ? ` ("${text}")` : "";
}

async function groundingFactsOf(
  prolog: Pick<PrologPort, "query">,
  id: string,
): Promise<readonly GroundingFact[]> {
  const result = await prolog.query(
    `findall([Type,To,ClaimKey], (member(Type, [${LOGICAL_RELATIONSHIPS.join(",")}]), kb_relationship(Type, '${escapeAtom(id)}', To), ((kb_entity(To, fact, _DriftProps), memberchk(claim_key=_DriftRaw, _DriftProps), normalize_term_atom(_DriftRaw, ClaimKey)) -> true ; ClaimKey = '')), Rows)`,
  );
  if (!result.success) return [];
  return parseListOfLists(result.bindings.Rows ?? "[]").map(
    ([type, target, claimKey]) => ({
      type: atom(type),
      target: atom(target),
      claimKey: atom(claimKey),
    }),
  );
}

/**
 * Why `kb_model mode: analyze` with the `id` of a stored requirement compares
 * its ledger with the stored one: a claim_key is derived from the clause
 * text, so analyzing reworded prose, or the title instead of the stored
 * `semantic_text`, yields keys that none of the requirement's grounding
 * facts declare. The write that follows such a receipt is refused by the
 * proposition-complete check, long after the agent picked the wording. The
 * receipt therefore warns at analysis time, naming the stored modeled
 * clauses the analysis no longer states, the facts that ground them, and the
 * clauses the analysis adds, so the agent can keep the stored wording or
 * re-ground the facts before writing.
 *
 * Returns null when the requirement is not stored, carries no recorded
 * ledger, or every stored modeled clause is still among the analyzed ones.
 */
// implements REQ-kibi-proposition-complete-ingestion
export async function storedLedgerDriftWarning(
  prolog: Pick<PrologPort, "query">,
  id: string,
  text: string,
  receipt: SemanticAdvisorReceipt,
): Promise<string | null> {
  const [stored] = await loadEntities(prolog, { id, type: "req" });
  if (
    !stored ||
    stored.semantic_inventory_version !== SEMANTIC_INVENTORY_VERSION ||
    !Array.isArray(stored.semantic_inventory)
  )
    return null;
  const storedInventory = stored.semantic_inventory.filter(isRecord);
  const storedKeys = new Set(
    storedInventory.map((entry) => stringValue(entry.claim_key)),
  );
  const analyzedKeys = new Set(
    receipt.propositions.map(({ claim_key }) => claim_key),
  );
  const drifted: StoredClause[] = storedInventory
    .filter(
      (entry) =>
        stringValue(entry.status) === "modeled" &&
        !analyzedKeys.has(stringValue(entry.claim_key)),
    )
    .map((entry) => ({
      claimKey: stringValue(entry.claim_key),
      claimText: stringValue(entry.claim_text),
    }));
  if (drifted.length === 0) return null;

  const facts = await groundingFactsOf(prolog, id);
  const groundedBy = (claimKey: string): string => {
    const matches = facts.filter((fact) => fact.claimKey === claimKey);
    return matches.length > 0
      ? `, grounded by ${matches.map((fact) => `${fact.target} via ${fact.type}`).join(" and ")}`
      : "";
  };
  const missing = drifted
    .map(
      ({ claimKey, claimText }) =>
        `'${claimKey}'${quoted(claimText)}${groundedBy(claimKey)}`,
    )
    .join("; ");
  const added = receipt.propositions
    .filter(({ claim_key }) => !storedKeys.has(claim_key))
    .map(({ claim_key, claim_text }) => `'${claim_key}'${quoted(claim_text)}`)
    .join("; ");
  const storedText = stringValue(stored.semantic_text);
  const cause =
    storedText && storedText !== text
      ? `The analyzed prose differs from the stored semantic_text of ${id}.`
      : "The stored clause keys were derived from different prose.";
  return `Claim-key drift against the stored ledger of ${id}: stored modeled clause(s) not stated by this analysis: ${missing}.${added ? ` Clause(s) this analysis adds without a stored grounding: ${added}.` : ""} ${cause} A kb_upsert of ${id} with this ledger fails the proposition-complete claim_key check unless each affected grounding fact is first re-written with the new claim_key and claim_text (same fact id). Keep the stored semantic_text wording to keep the keys, or supersede the requirement for a change of meaning.`;
}
