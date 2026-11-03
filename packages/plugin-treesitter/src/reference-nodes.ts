import type { Node } from "web-tree-sitter";

/** Syntax-tree helpers shared by the reference readers. */

/** A construct a reader cannot read statically: its line and its text. */
export interface UnresolvedRow {
  readonly line: number;
  readonly text: string;
}

export function at(node: Node): UnresolvedRow {
  return {
    line: node.startPosition.row + 1,
    text: node.text.replace(/\s+/g, " ").slice(0, 80),
  };
}

export function field(node: Node, name: string): Node | null {
  return node.childForFieldName(name);
}

export function named(node: Node): Node[] {
  const children: Node[] = [];
  for (let index = 0; index < node.namedChildCount; index += 1)
    children.push(node.namedChild(index) as Node);
  return children;
}

export function firstError(root: Node): Node | null {
  if (!root.hasError) return null;
  // Breadth first, so the error nearest the root is the one reported.
  const pending = [root];
  for (const node of pending) {
    if (node.type === "ERROR" || node.isMissing) return node;
    for (let index = 0; index < node.childCount; index += 1)
      pending.push(node.child(index) as Node);
  }
  // A tree with an error always holds an ERROR or missing node.
  /* node:coverage disable */
  return root;
}
/* node:coverage enable */
