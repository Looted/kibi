# Authoring a Tree-sitter language addition

Use the scaffold to prepare a reviewable draft for a new language. It creates
files under a directory you choose and never edits Kibi's live catalog, parser
assets, package lock, license records, integrity manifest, SBOM, or approvals.
The generated files are **UNQUALIFIED**: they do not enable analysis, establish
a license decision, or claim grammar support.

Run it with Node from the Kibi repository root:

```sh
node scripts/scaffold-tree-sitter-language.mjs sample-lang ./language-drafts \
  --display-name "Sample language" \
  --extension .smp
```

The language ID must be a lowercase ASCII slug. The display name accepts
Unicode. Repeat `--extension` for each operator-selected suffix. IDs and
extensions are validated before the output directory is created. The command
creates `language-drafts/sample-lang/`; if that path already exists, it exits
with an error and leaves the existing files alone. No network or grammar code
is used by the command.

The kit contains a catalog-entry template, a disconnected source-entry stub, a
comment-only Tree-sitter query, a behavior-focused fixture plan, an
unqualified license review worksheet, and a qualification checklist. `null`
catalog fields mean “not established yet.”
Do not copy placeholder values into the live catalog. The current catalog
records upstream package version and commit, source and tarball provenance,
package integrity, scanner presence and license, parser ABI, vendored asset and
query paths, byte counts and SHA-256 digests, aliases, and any supplemental
queries. The package separately records every included file in its integrity
manifest and publishes component data in SPDX format. Review those records
against exact selected artifacts before changing any live files.

First select a real grammar package and inspect its exact source. Check the
grammar, external scanner, query files, generated WASM, package license, source
repository notices, and transitive runtime components. Record the selected
version, source commit, exact registry tarball integrity, parser ABI, and
license evidence from the artifacts themselves. Preserve required license
texts and notices. Do not guess a license from a package name or reuse a hash
from a different artifact. If a source archive, scanner, or license cannot be
accounted for, leave the language out of the shipped catalog.

Define a deliberately small syntactic contract before writing the adapter:
which declarations and containers are recognized, how source locators remain
distinct for nesting and overloads, and which dynamic or generated forms stay
uncovered. Use the fixture plan to author synthetic examples for ordinary and
nested declarations, repeated names, syntax damage with surviving declarations,
Unicode before a capture, CRLF, and dynamic or generated declarations. Assert
results, ranges, statuses, diagnostics, and identity behavior. Compile each
query against the selected grammar and remove duplicate captures. A parser
accepting a query alone does not prove that the query captures the intended
declarations.

Structural language support means that the selected parser and adapter found
the tested syntax forms in supplied source bytes. It does not provide type
resolution, a complete call graph, macro or runtime-generated declarations,
full language semantics, or build behavior. A parse error or an uncovered
dynamic construct must remain visible as partial analysis. File-level
classification means the file remains in the review inventory without
declaration symbols. File-level review cannot substitute for symbol ownership
or executable proof, and a structurally successful parse cannot prove
requirement correctness.

Run behavior-focused tests under Node and Bun with network access disabled, then
exercise the installed package consumer from a relocated directory. Verify
offline grammar loading, malformed and oversized input behavior, Unicode
coordinates, CRLF, duplicate and overloaded locators, worker failures, and
partial results. Review the complete installed dependency closure and ensure
analysis does not run the analyzed source, a compiler, scanner source, or a
download step. The existing qualification evidence covers Linux/WSL2 only;
native Windows and macOS support remain unqualified until tested there.

Before integration, inspect the final npm tarball rather than relying on the
working tree. Confirm that it contains only the intended runtime, parser and
query assets, notices, license texts, catalog, integrity manifest, and SPDX
SBOM. Regenerate the file integrity manifest and SBOM from the final closure,
then verify both against the packed artifact. Audit every shipped license and
source attribution. Have the host owner review and approve the exact artifact
before enabling the language. This scaffold does not alter a policy gate,
proof workflow, hook, language approval, or host platform qualification.

The independent scaffold CLI behavior test is:

```sh
node --test scripts/tests/scaffold-tree-sitter-language.test.mjs
```
