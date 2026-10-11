import { type Document, isCollection, isSeq, visit } from "yaml";

/**
 * Render the `symbols` sequence of a parsed manifest, and every collection
 * inside it, as block YAML. `kibi init` writes `symbols: []`, a flow
 * sequence, and kibi-cli before 2.18.0 appended to it, so older manifests
 * keep every symbol on that one line. Returns true when the layout changed.
 */
// implements REQ-kibi-hooks-flow-manifest, REQ-core-persistence
export function blockifySymbolManifest(doc: Document): boolean {
  const symbols = doc.get("symbols", true);
  if (!isSeq(symbols) || symbols.flow !== true) return false;
  visit(symbols, (_key, node) => {
    if (isCollection(node)) node.flow = false;
  });
  return true;
}
