#!/bin/sh
# Kibi's own KB is kept at zero findings: the full kibi check must report no
# violations and no quality diagnostics, including info-level ones. The gate
# fails closed when either result group is missing from the output. Other projects may accept advisories; this repository does not.
# KIBI_CLI selects another Kibi build.
set -eu

kibi="${KIBI_CLI:-packages/cli/bin/kibi}"
out=$(mktemp)
trap 'rm -f "$out"' EXIT
set +e
bun "$kibi" check --format json >"$out"
code=$?
set -e
node -e '
  const fs = require("fs");
  const raw = fs.readFileSync(process.argv[1], "utf8");
  let r;
  try { r = JSON.parse(raw); } catch {
    process.stderr.write(raw + "\nkibi check did not print JSON.\n");
    process.exit(1);
  }
  const p = r.structuredContent ?? r;
  const required = ["violations", "qualityDiagnostics"];
  const missing = required.filter((g) => !Array.isArray(p[g]));
  if (missing.length > 0) {
    console.error(`kibi check output has no ${missing.join(" or ")} array; the gate cannot tell whether the KB is clean.`);
    process.exit(1);
  }
  const groups = [...required, "diagnostics"];
  let total = 0;
  for (const g of groups) {
    const items = Array.isArray(p[g]) ? p[g] : [];
    total += items.length;
    for (const f of items) {
      const where = f.entityId ?? f.entity ?? f.subject ?? "";
      console.error(`${g}: ${f.rule ?? f.code ?? "?"} ${where} ${f.message ?? ""}`.trim());
    }
  }
  if (total > 0) {
    console.error(`Kibi KB has ${total} finding(s); the repository keeps its own KB at zero.`);
    process.exit(1);
  }
  console.log("Kibi KB: zero findings.");
' "$out"
exit "$code"
