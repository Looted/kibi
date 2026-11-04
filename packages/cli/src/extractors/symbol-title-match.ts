/*
 Kibi — repo-local, per-branch, queryable long-term memory for software projects
 Copyright (C) 2026 Piotr Franczyk

 This program is free software: you can redistribute it and/or modify
 it under the terms of the GNU Affero General Public License as published by
 the Free Software Foundation, either version 3 of the License, or
 (at your option) any later version.

 This program is distributed in the hope that it will be useful,
 but WITHOUT ANY WARRANTY; without even the implied warranty of
 MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 GNU Affero General Public License for more details.

 You should have received a copy of the GNU Affero General Public License
 along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

/** The declaration fields a symbol title is matched against. */
export type TitledDeclaration = {
  readonly name: string;
  readonly qualifiedName?: string;
  readonly kind?: string;
  readonly containerName?: string;
  readonly startLine: number;
  readonly startColumn: number;
  readonly endLine: number;
  readonly endColumn: number;
};

export type TitleMatch<T> =
  | { readonly symbol: T }
  | { readonly failure: string };

const TERRAFORM_LOCATOR =
  /^terraform:(resource|data|module|variable|output|local)\[(.*)\]$/;
const HCL_LOCATOR = /^hcl:(\[.*\])$/;

/** The strings of a bracketed JSON list, or null when it is not one. */
function jsonStrings(text: string): string[] | null {
  try {
    // Both locators capture text from `[` to `]`, so it parses to a list.
    const value = JSON.parse(text) as unknown[];
    return value.every((item) => typeof item === "string")
      ? (value as string[])
      : null;
  } catch {
    return null;
  }
}

/**
 * Titles that name a declaration besides its qualified name and name: the
 * Terraform address of a block (`aws_s3_bucket.this`, `data.x.y`,
 * `module.m`, `var.v`, `output.o`, `local.l`) and the dotted labels of a
 * generic HCL block (`source.amazon-ebs.ubuntu`).
 */
// implements REQ-symbol-coordinates-derived-locally
export function declarationTitleAliases(
  symbol: Pick<TitledDeclaration, "qualifiedName">,
): string[] {
  const locator = String(symbol.qualifiedName);
  const terraform = TERRAFORM_LOCATOR.exec(locator);
  if (terraform) {
    const kind = terraform[1];
    const labels = jsonStrings(`[${terraform[2]}]`);
    if (labels === null) return [];
    const dotted = labels.join(".");
    switch (kind) {
      case "resource":
        return labels.length === 2 ? [dotted, `resource.${dotted}`] : [];
      case "data":
        return labels.length === 2 ? [`data.${dotted}`] : [];
      case "variable":
        return labels.length === 1
          ? [`var.${dotted}`, `variable.${dotted}`]
          : [];
      default:
        return labels.length === 1 ? [`${kind}.${dotted}`] : [];
    }
  }
  const hcl = HCL_LOCATOR.exec(locator);
  if (hcl) {
    const parts = jsonStrings(hcl[1] as string);
    return parts !== null && parts.length > 1 ? [parts.join(".")] : [];
  }
  return [];
}

/** A constructor: a method named like the type that holds it. */
function isConstructorOf(
  member: TitledDeclaration,
  type: TitledDeclaration,
): boolean {
  return (
    member.kind === "method" &&
    member.containerName === member.name &&
    type.name === member.name &&
    type.kind !== "method" &&
    type.kind !== "function"
  );
}

function lines(symbol: TitledDeclaration): string {
  return symbol.startLine === symbol.endLine
    ? `line ${symbol.startLine}`
    : `lines ${symbol.startLine}-${symbol.endLine}`;
}

/** The title that places this declaration and no other in the file. */
function uniqueTitle(
  symbol: TitledDeclaration,
  all: readonly TitledDeclaration[],
): string {
  const alias = declarationTitleAliases(symbol)[0];
  if (alias !== undefined) return alias;
  const sameName = all.filter((other) => other.name === symbol.name);
  return sameName.length > 1 && symbol.qualifiedName !== undefined
    ? symbol.qualifiedName
    : symbol.name;
}

const LISTED_DECLARATIONS = 8;

/**
 * Place a symbol title: a qualified name first, then a declaration alias,
 * then a bare name. A bare type name shared with its constructors (a Java
 * class `OS` and `OS()`) names the type.
 * Anything else that is not exactly one declaration fails with the reason.
 */
// implements REQ-symbol-coordinates-derived-locally
export function matchDeclarationTitle<T extends TitledDeclaration>(
  title: string,
  declared: readonly T[],
  sourceFile: string,
  all: readonly TitledDeclaration[] = declared,
): TitleMatch<T> {
  const byQualifiedName = declared.filter(
    (symbol) => (symbol.qualifiedName ?? symbol.name) === title,
  );
  const byAlias = byQualifiedName.length
    ? byQualifiedName
    : declared.filter((symbol) =>
        declarationTitleAliases(symbol).includes(title),
      );
  const byName = byAlias.length
    ? byAlias
    : declared.filter((symbol) => symbol.name === title);
  const candidates = byName.filter(
    (symbol) => !byName.some((other) => isConstructorOf(symbol, other)),
  );
  if (candidates.length > 1) {
    const titles = candidates.map((symbol) => uniqueTitle(symbol, all));
    const placed = candidates
      .map((symbol, index) => `${titles[index]} on ${lines(symbol)}`)
      .join(", ");
    const advice =
      new Set(titles).size === titles.length
        ? "use one of those titles"
        : "no title tells them apart";
    return {
      failure: `'${title}' matches ${candidates.length} declarations in ${sourceFile} (${placed}); ${advice}`,
    };
  }
  const [only] = candidates;
  if (only !== undefined) return { symbol: only };
  if (
    all.some(
      (symbol) =>
        symbol.name === title ||
        symbol.qualifiedName === title ||
        declarationTitleAliases(symbol).includes(title),
    )
  )
    return {
      failure: `'${title}' is declared in a part of ${sourceFile} the source analysis could not read`,
    };
  const titles = [...new Set(all.map((symbol) => uniqueTitle(symbol, all)))];
  const listed =
    titles.length === 0
      ? "the extractor found no declarations there"
      : `declarations there: ${titles.slice(0, LISTED_DECLARATIONS).join(", ")}${titles.length > LISTED_DECLARATIONS ? `, and ${titles.length - LISTED_DECLARATIONS} more` : ""}`;
  return {
    failure: `no declaration titled '${title}' found in ${sourceFile} (${listed})`,
  };
}
