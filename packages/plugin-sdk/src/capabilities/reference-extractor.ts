/**
 * kibi.reference-extractor.v1 — what a source file references, read from its
 * syntax tree without running it.
 *
 * The `references` source-proof reader asks a provider for one extract of one
 * file: the modules it imports, the calls it makes, the environment variables
 * it reads, the first arguments of calls to a callee, the errors it throws, or
 * the literal values of a property. A provider lists what it can read exactly
 * and reports everything else as `unresolved` with its line, and the host then
 * refuses the read, so a proof never rests on a guess.
 */

// implements REQ-kibi-tree-sitter-references
export const REFERENCE_EXTRACTS = [
  "env",
  "imports",
  "calls",
  "string_args",
  "thrown",
  "property",
] as const;

// implements REQ-kibi-tree-sitter-references
export type ReferenceExtract = (typeof REFERENCE_EXTRACTS)[number];

// implements REQ-kibi-tree-sitter-references
export interface ReferenceExtractorV1SupportsInput {
  /** Workspace-relative POSIX path. */
  readonly path: string;
}

// implements REQ-kibi-tree-sitter-references
export interface ReferenceExtractorV1Input {
  /** Workspace-relative POSIX path. */
  readonly path: string;
  readonly content: string;
  readonly extract: ReferenceExtract;
  /** Callee name for `string_args`. */
  readonly callee?: string;
  /** Property name for `property`. */
  readonly key?: string;
  /** Host budget in milliseconds; a provider may use less. */
  readonly timeoutMs?: number;
}

// implements REQ-kibi-tree-sitter-references
export interface UnresolvedReferenceV1 {
  /** 1-based line of the construct the provider cannot read statically. */
  readonly line: number;
  /** The construct as written, whitespace collapsed, at most 80 characters. */
  readonly text: string;
}

// implements REQ-kibi-tree-sitter-references
export type ReferenceExtractionResultV1 =
  | Readonly<{
      contractVersion: "kibi.reference-extractor.v1";
      status: "ok";
      language: string;
      members: readonly string[];
      unresolved: readonly UnresolvedReferenceV1[];
    }>
  | Readonly<{
      contractVersion: "kibi.reference-extractor.v1";
      /** `unsupported`: the provider has no reader for this file or extract. */
      status: "unsupported" | "failed";
      language?: string;
      code: string;
      message: string;
    }>;

// implements REQ-kibi-tree-sitter-references
export interface ReferenceExtractorV1 {
  readonly id: string;
  /** Whether the provider reads references of this file at all. */
  supports(input: ReferenceExtractorV1SupportsInput): boolean;
  extract(
    input: ReferenceExtractorV1Input,
  ): ReferenceExtractionResultV1 | Promise<ReferenceExtractionResultV1>;
}
