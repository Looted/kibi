#!/usr/bin/env node

import { mkdir, rmdir, unlink, writeFile } from "node:fs/promises";
import { dirname, isAbsolute, relative, resolve, sep } from "node:path";

const USAGE =
  "Usage: node scripts/scaffold-tree-sitter-language.mjs <id> <output-directory> --display-name <name> --extension <.ext> [--extension <.ext> ...]";

const RESERVED_WINDOWS_NAMES = new Set([
  "aux",
  "con",
  "nul",
  "prn",
  ...Array.from({ length: 9 }, (_, index) => `com${index + 1}`),
  ...Array.from({ length: 9 }, (_, index) => `lpt${index + 1}`),
]);

function parseArguments(args) {
  if (args.length === 1 && (args[0] === "--help" || args[0] === "-h")) {
    return { help: true };
  }

  const [id, outputDirectory, ...options] = args;
  if (!id || !outputDirectory) throw new Error(USAGE);

  let displayName;
  const extensions = [];
  for (let index = 0; index < options.length; index += 1) {
    const option = options[index];
    const value = options[index + 1];
    if (!value || value.startsWith("--")) {
      throw new Error(`Missing value for ${option}.\n${USAGE}`);
    }
    if (option === "--display-name") {
      if (displayName !== undefined) {
        throw new Error("Use --display-name only once.");
      }
      displayName = value;
    } else if (option === "--extension") {
      extensions.push(value);
    } else {
      throw new Error(`Unknown option: ${option}.\n${USAGE}`);
    }
    index += 1;
  }

  validateIdentifier(id);
  if (displayName === undefined) {
    throw new Error(`--display-name is required.\n${USAGE}`);
  }
  const normalizedDisplayName = displayName.trim();
  if (
    normalizedDisplayName.length === 0 ||
    normalizedDisplayName.length > 80 ||
    /\p{Cc}/u.test(normalizedDisplayName)
  ) {
    throw new Error(
      "Display name must be 1 to 80 printable characters; Unicode is supported.",
    );
  }
  if (extensions.length === 0) {
    throw new Error(`At least one --extension is required.\n${USAGE}`);
  }
  for (const extension of extensions) validateExtension(extension);
  if (
    new Set(extensions.map((extension) => extension.toLowerCase())).size !==
    extensions.length
  ) {
    throw new Error("Extensions must be unique, ignoring letter case.");
  }
  if (outputDirectory.includes("\0")) {
    throw new Error("Output directory cannot contain a NUL character.");
  }

  return {
    help: false,
    id,
    outputDirectory,
    displayName: normalizedDisplayName,
    extensions,
  };
}

function validateIdentifier(id) {
  if (
    id.length > 48 ||
    !/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/u.test(id) ||
    RESERVED_WINDOWS_NAMES.has(id)
  ) {
    throw new Error(
      "Language id must be a lowercase ASCII slug (for example, 'sample-lang'); Unicode belongs in --display-name.",
    );
  }
}

function validateExtension(extension) {
  if (!/^\.[A-Za-z0-9][A-Za-z0-9_-]{0,15}$/u.test(extension)) {
    throw new Error(
      `Invalid extension ${JSON.stringify(extension)}; use a dot followed by 1 to 16 ASCII letters, digits, underscores, or hyphens.`,
    );
  }
}

function generatedFiles({ id, displayName, extensions }) {
  const json = (value) => JSON.stringify(value, null, 2);
  const entry = {
    [id]: {
      extensions,
      aliases: null,
    },
  };
  const catalogEntry = {
    id,
    extensions,
    package: null,
    version: null,
    gitCommit: null,
    sourceUrl: null,
    npmTarball: null,
    npmIntegrity: null,
    license: null,
    scanner: null,
    parserAbi: null,
    asset: null,
    assetBytes: null,
    assetSha256: null,
    query: null,
    querySource: null,
    queryBytes: null,
    querySha256: null,
    supplementalQueries: null,
    aliases: null,
  };
  const operatorInputs = {
    status: "DRAFT",
    id,
    displayName,
    extensions,
  };
  const readme = `# Draft language author kit: ${id}

This folder is an authoring aid only. It does not add a parser, query, language route, package dependency, runtime support, or approval to Kibi. Treat every artifact and claim here as **UNQUALIFIED** until the checks in \`qualification-checklist.md\` are complete and a reviewed change integrates them.

The catalog template follows the current Tree-sitter language entry field names. Its null values are unresolved work, not evidence that a dependency, scanner, license, ABI, asset, or query is absent. The license review template records what must be inspected without making a license decision. Do not replace a null with a guessed value. No network access or grammar execution is performed by the scaffold command.

Start with the fixture guide, then inspect source package provenance and licenses. Add a small adapter only after confirming the real grammar node shapes and query behavior. Keep unsupported and partial analysis explicit.
`;
  const entrySource = `/**
 * UNQUALIFIED authoring stub. It is not imported by Kibi.
 * Review extension ambiguity and aliases before integrating this entry.
 */
export const DRAFT_LANGUAGE_ENTRY = ${json(entry)} as const;
`;
  const query = `; UNQUALIFIED template for ${id}. This intentionally captures nothing.
; Inspect the exact pinned grammar and query API before adding captures.
`;
  const fixtureGuide = `# Fixture plan for ${id}

This guide names cases to author. It contains no grammar examples and makes no claim that a parser can recognize them. Keep fixtures synthetic and small; use the language's documented syntax and test the installed consumer path after integration.

| Case | Suggested fixture | Behavior to assert |
| --- | --- | --- |
| Ordinary declarations | \`declarations.source\` | Qualified declarations and containers are captured once with stable source ranges. |
| Nested and repeated names | \`nested.source\` | Locators remain distinct, and inserting another declaration does not transfer identity. |
| Incomplete syntax | \`partial.source\` | Return partial analysis, retain independently valid declarations, and report uncovered syntax. |
| Unicode before a capture | \`unicode.source\` | Line and column ranges follow the host contract, including UTF-16 columns. |
| CRLF input | \`crlf.source\` | Report source rows against the supplied bytes without newline rewriting. |
| Dynamic or generated declarations | \`dynamic.source\` | State what static parsing cannot see; do not invent declarations. |

Assert observable analysis results and diagnostics. A passing structural fixture establishes only the tested syntax subset, not type resolution, runtime behavior, complete semantic coverage, or executable proof.
`;
  const qualificationChecklist = `# Qualification checklist for ${id}

Status: **UNQUALIFIED**. This file is a checklist, not an approval. Record evidence in the change that eventually integrates the language.

## Source and license

- [ ] Select an exact upstream grammar release and source commit; record the source URL and exact package tarball integrity from reviewed bytes.
- [ ] Inspect the grammar, external scanner, upstream queries, supplemental queries, generated assets, and their license notices. Make a license decision only after that review.
- [ ] Preserve applicable full license texts and notices in the installed package.
- [ ] Confirm the parser ABI against the actual pinned runtime and load the exact artifact without network access.

## Adapter and behavior

- [ ] Define the supported syntactic declarations, containers, identity rules, and explicit uncovered cases from the representative fixtures.
- [ ] Compile and exercise every query against the selected grammar; deduplicate captures where query patterns overlap.
- [ ] Keep syntax damage, dynamic declarations, timeouts, worker errors, and output limits visible as partial or failed analysis.
- [ ] Run behavior-focused tests under Node and Bun, including offline loading, Unicode coordinates, CRLF, malformed input, and duplicate or overloaded declarations.
- [ ] Run the installed package consumer tests and inspect the final npm tarball contents.

## Package records and limits

- [ ] Add exact artifact and query paths, byte counts, hashes, provenance, scanner data, and aliases to the live catalog only after measurement and review.
- [ ] Regenerate and verify the package file-integrity manifest and SPDX SBOM against the final package contents; audit the final tarball and licenses.
- [ ] Review the complete runtime dependency closure and confirm source files, compilers, or analyzed programs are not executed.
- [ ] Record tested host platforms. Existing qualification evidence is limited to Linux/WSL2; native Windows and macOS remain unqualified until separately tested.

## Claims

Structural support means the selected parser and query recognize the tested syntactic forms. File-level classification keeps a file in review scope but yields no declaration symbols. Neither establishes full language semantics, types, runtime declarations, build behavior, requirement ownership, or executable proof. Report those limits explicitly.
`;
  const licenseReview = `# License review record for ${id}

Status: **UNQUALIFIED**. No license decision has been made. Keep this record incomplete until the exact artifacts and notices have been inspected.

| Component to assess | Applicability | Exact name, version, and source | Declared license | License text and notice location | Review decision and evidence |
| --- | --- | --- | --- | --- | --- |
| Grammar source package | TODO | TODO | TODO | TODO | TODO |
| External scanner, if present | TODO | TODO | TODO | TODO | TODO |
| Upstream query source | TODO | TODO | TODO | TODO | TODO |
| Supplemental query source, if present | TODO | TODO | TODO | TODO | TODO |
| Generated parser asset | TODO | TODO | TODO | TODO | TODO |
| Runtime package and installed dependency closure | TODO | TODO | TODO | TODO | TODO |

Do not infer a license from a package name, repository, or another version. Record “not applicable” only after inspecting the selected source. Transfer reviewed component facts into the final SPDX SBOM and shipped notices; this worksheet is not an SPDX record and does not authorize distribution.
`;

  return new Map([
    ["README.md", readme],
    ["catalog-entry.template.json", `${json(catalogEntry)}\n`],
    ["operator-inputs.json", `${json(operatorInputs)}\n`],
    ["src/language-entry.template.ts", entrySource],
    ["queries/tags.scm", query],
    ["tests/fixtures/README.md", fixtureGuide],
    ["license-review.template.md", licenseReview],
    ["qualification-checklist.md", qualificationChecklist],
  ]);
}

async function createScaffold(options) {
  const outputRoot = resolve(options.outputDirectory);
  const target = resolve(outputRoot, options.id);
  const relativeTarget = relative(outputRoot, target);
  if (
    relativeTarget === "" ||
    relativeTarget === ".." ||
    relativeTarget.startsWith(`..${sep}`) ||
    isAbsolute(relativeTarget)
  ) {
    throw new Error(
      "Generated output path must stay inside the supplied directory.",
    );
  }

  await mkdir(outputRoot, { recursive: true });
  await mkdir(target);

  const createdFiles = [];
  const createdDirectories = [target];
  try {
    for (const [relativePath, contents] of generatedFiles(options)) {
      const destination = resolve(target, relativePath);
      const relativeDestination = relative(target, destination);
      if (
        relativeDestination === ".." ||
        relativeDestination.startsWith(`..${sep}`) ||
        isAbsolute(relativeDestination)
      ) {
        throw new Error("Generated file path escaped its language directory.");
      }
      const directory = dirname(destination);
      if (directory !== target && !createdDirectories.includes(directory)) {
        await mkdir(directory, { recursive: true });
        createdDirectories.push(directory);
      }
      await writeFile(destination, contents, { encoding: "utf8", flag: "wx" });
      createdFiles.push(destination);
    }
  } catch (error) {
    for (const file of createdFiles.reverse()) {
      await unlink(file).catch(() => {});
    }
    for (const directory of createdDirectories.reverse()) {
      await rmdir(directory).catch(() => {});
    }
    throw error;
  }

  return target;
}

async function main() {
  const options = parseArguments(process.argv.slice(2));
  if (options.help) {
    process.stdout.write(`${USAGE}\n`);
    return;
  }
  const target = await createScaffold(options);
  process.stdout.write(
    `Created unqualified language author kit at ${target}\n`,
  );
}

main().catch((error) => {
  process.stderr.write(
    `Error: ${error instanceof Error ? error.message : String(error)}\n`,
  );
  process.exitCode = 1;
});
