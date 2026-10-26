#!/bin/sh
# The proof gate: knowledge-base integrity rules plus evidence-floor, which
# checks every current requirement's evidence level against its floor.
# Extra arguments pass through to kibi check: CI adds --fresh-evidence right
# after `kibi prove --all`. KIBI_CLI selects another Kibi build.
# implements REQ-kibi-local-proof-parity, REQ-ci-kb-merge-resolution
set -eu

run_proof_gate() {
  kibi="${KIBI_CLI:-packages/cli/bin/kibi}"
  status=$(bun "$kibi" status --format json)
  if ! printf '%s' "$status" | node -e '
    const s = JSON.parse(require("fs").readFileSync(0, "utf8"));
    const p = s.structuredContent ?? s.data ?? s;
    process.exit(p.syncState === "fresh" && p.dirty === false ? 0 : 1);
  '; then
    echo "The proof gate needs a fresh Kibi store (kibi status: syncState fresh, dirty false); run kibi sync." >&2
    exit 1
  fi
  exec bun "$kibi" check --format json --rules no-dangling-refs,source-relationship-parity,no-cycles,required-fields,deprecated-adr-no-successor,domain-contradictions,kb-consistency,query-plan-safety,logic-coverage,strict-fact-shape,strict-req-fact-pairing,predicate-verifiability,rule-safety,rule-verifiability,semantic-completeness,symbol-traceability,evidence-floor "$@"
}

run_proof_gate "$@"
