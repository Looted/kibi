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

/**
 * Project sources Kibi reads by itself for the `source` proof kind, and for
 * source-backed rule domains, rule predicates and count value sources: a
 * JSON or YAML file, the files a glob matches, an OpenAPI document, the
 * references the code makes (environment variables, imports, calls, string
 * arguments, thrown error codes, property values), a data schema (drizzle,
 * Prisma or SQL migrations), a web app's route table (Hono, Express) and a
 * validator object (zod and anything with safeParse).
 *
 * Every reader is exact or refuses: a member Kibi cannot read statically (a
 * computed environment variable name, a dynamic import, an ALTER TABLE form
 * it does not know, a router mounted on a pattern) fails the read with its
 * location, so a set claim is never decided over a set Kibi only partly saw.
 */

import { createHash } from "node:crypto";
import { existsSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import fg from "fast-glob";
import { parse as parseYaml } from "yaml";

// implements REQ-kibi-source-proof-kinds
export const SOURCE_READERS = [
  "json",
  "yaml",
  "glob",
  "openapi",
  "references",
  "schema",
  "routes",
  "validator",
] as const;

export type SourceReader = (typeof SOURCE_READERS)[number];

/** A source spec as a proof contract states it; see sourceSpecErrors. */
// implements REQ-kibi-source-proof-kinds
export type SourceSpec = Readonly<Record<string, unknown>> &
  Readonly<{ reader: SourceReader }>;

/** A column of a table, or a field of a validator object. */
export type SourceColumn = {
  name: string;
  nullable: boolean;
  optional: boolean;
};

/** A table (schema reader) or object (validator reader). */
export type SourceEntity = {
  name: string;
  columns: SourceColumn[];
  foreign_keys: string[];
};

/** One endpoint of a route table and the middleware that runs before it. */
export type SourceRoute = {
  method: string;
  path: string;
  middleware: string[];
};

/**
 * What Kibi read: the selected members (sorted, unique), and for schema,
 * validator and routes readers the structure the field and middleware
 * obligations are decided on.
 */
// implements REQ-kibi-source-proof-kinds
export type SourceModel = {
  members: string[];
  entities?: SourceEntity[];
  routes?: SourceRoute[];
};

export type SourceRead =
  | { ok: true; model: SourceModel }
  | { ok: false; reason: string };

/** A place in a file Kibi could not read statically. */
export type UnresolvedReference = Readonly<{
  file: string;
  line: number;
  text: string;
}>;

const SELECTS: Readonly<Partial<Record<SourceReader, readonly string[]>>> = {
  json: ["keys", "values", "items"],
  yaml: ["keys", "values", "items"],
  openapi: [
    "operations",
    "unsecured_operations",
    "security_schemes",
    "responses",
  ],
  schema: [
    "tables",
    "columns",
    "required_columns",
    "nullable_columns",
    "foreign_keys",
  ],
  routes: ["routes", "middleware"],
  validator: ["fields", "required_fields", "optional_fields"],
};

export const REFERENCE_EXTRACTS = [
  "env",
  "imports",
  "calls",
  "string_args",
  "thrown",
  "property",
] as const;

const KEYS: Readonly<Record<SourceReader, readonly string[]>> = {
  json: ["reader", "file", "path", "select"],
  yaml: ["reader", "file", "path", "select"],
  glob: ["reader", "pattern", "capture", "ignore"],
  openapi: ["reader", "file", "select"],
  references: ["reader", "files", "extract", "callee", "key", "ignore"],
  schema: ["reader", "format", "file", "files", "exports", "table", "select"],
  routes: [
    "reader",
    "file",
    "export",
    "framework",
    "path_prefix",
    "names_from",
    "select",
  ],
  validator: ["reader", "file", "export", "select"],
};

function record(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function nonEmpty(value: unknown): value is string {
  return typeof value === "string" && value.trim() !== "";
}

function stringList(value: unknown): value is string[] {
  return Array.isArray(value) && value.length > 0 && value.every(nonEmpty);
}

function relativeSafe(value: string): boolean {
  return !path.isAbsolute(value) && !value.split(/[\\/]/).includes("..");
}

/**
 * Why a source spec is not one Kibi can read, or [] when it is. `label`
 * names the field in the messages (proof_contract.source, ...).
 */
// implements REQ-kibi-source-proof-kinds
export function sourceSpecErrors(value: unknown, label: string): string[] {
  const row = record(value);
  if (!row || !(SOURCE_READERS as readonly unknown[]).includes(row.reader))
    return [
      `${label} must be an object whose reader is one of: ${SOURCE_READERS.join(", ")}`,
    ];
  const reader = row.reader as SourceReader;
  const errors: string[] = [];
  const unknown = Object.keys(row).filter((key) => !KEYS[reader].includes(key));
  if (unknown.length > 0)
    errors.push(
      `${label} (reader ${reader}) does not take ${unknown.join(", ")}; it takes ${KEYS[reader].join(", ")}`,
    );
  const file = (key: string, required: boolean) => {
    const raw = row[key];
    if (raw === undefined) {
      if (required)
        errors.push(`${label}.${key} is required for reader ${reader}`);
      return;
    }
    if (!nonEmpty(raw) || !relativeSafe(raw))
      errors.push(
        `${label}.${key} must be a repository-relative path inside the workspace`,
      );
  };
  const globs = (key: string, required: boolean) => {
    const raw = row[key];
    if (raw === undefined) {
      if (required)
        errors.push(`${label}.${key} is required for reader ${reader}`);
      return;
    }
    const list = typeof raw === "string" ? [raw] : raw;
    if (!stringList(list) || !list.every(relativeSafe))
      errors.push(
        `${label}.${key} must be a repository-relative glob or a list of them`,
      );
  };
  const select = SELECTS[reader];
  if (
    row.select !== undefined &&
    (select === undefined || !select.includes(String(row.select)))
  )
    errors.push(
      select === undefined
        ? `${label}.select does not apply to reader ${reader}`
        : `${label}.select must be one of: ${select.join(", ")}`,
    );
  switch (reader) {
    case "json":
    case "yaml":
      file("file", true);
      if (row.path !== undefined && typeof row.path !== "string")
        errors.push(`${label}.path must be a dotted path or a JSON pointer`);
      break;
    case "glob":
      globs("pattern", true);
      globs("ignore", false);
      if (row.capture !== undefined && typeof row.capture !== "boolean")
        errors.push(`${label}.capture must be true or false`);
      break;
    case "openapi":
      file("file", true);
      break;
    case "references":
      globs("files", true);
      globs("ignore", false);
      if (!(REFERENCE_EXTRACTS as readonly unknown[]).includes(row.extract))
        errors.push(
          `${label}.extract must be one of: ${REFERENCE_EXTRACTS.join(", ")}`,
        );
      if (row.extract === "string_args" && !nonEmpty(row.callee))
        errors.push(
          `${label}.callee is required for extract string_args: name the function whose first argument is read`,
        );
      if (row.callee !== undefined && !nonEmpty(row.callee))
        errors.push(`${label}.callee must be a function name`);
      if (row.extract === "property" && !nonEmpty(row.key))
        errors.push(
          `${label}.key is required for extract property: name the property whose string values are read`,
        );
      if (row.key !== undefined && row.extract !== "property")
        errors.push(`${label}.key applies only to extract property`);
      break;
    case "schema":
      if (!["drizzle", "prisma", "sql"].includes(String(row.format)))
        errors.push(`${label}.format must be drizzle, prisma or sql`);
      if (row.format === "sql") {
        globs("files", true);
        if (row.file !== undefined)
          errors.push(`${label}.file does not apply to format sql; use files`);
      } else {
        file("file", true);
        if (row.files !== undefined)
          errors.push(`${label}.files applies only to format sql`);
      }
      if (
        row.exports !== undefined &&
        (!stringList(row.exports) || row.format !== "drizzle")
      )
        errors.push(
          `${label}.exports must be a list of export names, for format drizzle only`,
        );
      if (row.table !== undefined && !nonEmpty(row.table))
        errors.push(
          `${label}.table must be a table name or a glob of table names`,
        );
      break;
    case "routes":
      file("file", true);
      if (!nonEmpty(row.export))
        errors.push(
          `${label}.export is required for reader routes: name the app (or a function returning it)`,
        );
      if (
        row.framework !== undefined &&
        !["hono", "express"].includes(String(row.framework))
      )
        errors.push(`${label}.framework must be hono or express`);
      if (
        row.path_prefix !== undefined &&
        (!nonEmpty(row.path_prefix) || !String(row.path_prefix).startsWith("/"))
      )
        errors.push(`${label}.path_prefix must be a path starting with /`);
      if (
        row.names_from !== undefined &&
        (!stringList(row.names_from) || !row.names_from.every(relativeSafe))
      )
        errors.push(
          `${label}.names_from must list repository-relative module files whose exports name middleware`,
        );
      break;
    case "validator":
      file("file", true);
      if (!nonEmpty(row.export))
        errors.push(
          `${label}.export is required for reader validator: name the object schema`,
        );
      break;
  }
  return errors;
}

/** The spec with only the keys its reader takes, for contract hashing. */
// implements REQ-kibi-source-proof-kinds
export function normalizeSourceSpec(value: unknown): SourceSpec | undefined {
  const row = record(value);
  if (!row || !(SOURCE_READERS as readonly unknown[]).includes(row.reader))
    return undefined;
  const reader = row.reader as SourceReader;
  const out: Record<string, unknown> = {};
  for (const key of KEYS[reader])
    if (row[key] !== undefined) out[key] = row[key];
  return out as SourceSpec;
}

function globList(value: unknown): string[] {
  if (typeof value === "string") return [value];
  return Array.isArray(value) ? value.filter(nonEmpty) : [];
}

const DEFAULT_IGNORE = ["**/node_modules/**", "**/.git/**", "**/.kb/**"];

/** Workspace-relative files a glob list matches, sorted. */
// implements REQ-kibi-source-proof-kinds
export function matchWorkspaceFiles(
  workspaceRoot: string,
  patterns: readonly string[],
  ignore: readonly string[] = [],
): string[] {
  return fg
    .sync([...patterns], {
      cwd: workspaceRoot,
      ignore: [...DEFAULT_IGNORE, ...ignore],
      dot: true,
      onlyFiles: true,
      followSymbolicLinks: false,
    })
    .map((file) => file.split(path.sep).join("/"))
    .sort();
}

function readText(workspaceRoot: string, relative: string): string | null {
  const absolute = path.resolve(workspaceRoot, relative);
  const root = path.resolve(workspaceRoot);
  if (absolute !== root && !absolute.startsWith(root + path.sep)) return null;
  if (!existsSync(absolute) || !statSync(absolute).isFile()) return null;
  return readFileSync(absolute, "utf8");
}

function sha256(text: string): string {
  return createHash("sha256").update(text).digest("hex");
}

const MISSING_FILE_HASH = "missing";

export type SourceDependency = Readonly<{ id: string; hash: string }>;

/**
 * What a read of `spec` depends on, so a receipt goes stale when any of it
 * changes: each file the reader parses (its contents), the set of files a
 * glob matches (their paths), and for the readers that evaluate a module
 * (drizzle schemas, route tables, validators) every workspace module that
 * module imports through relative or tsconfig path imports.
 */
// implements REQ-kibi-source-proof-kinds
export function sourceDependencies(
  workspaceRoot: string,
  spec: SourceSpec,
): SourceDependency[] {
  const files = new Set<string>();
  const out: SourceDependency[] = [];
  const addFile = (relative: string) =>
    files.add(relative.split(path.sep).join("/"));
  switch (spec.reader) {
    case "json":
    case "yaml":
    case "openapi":
    case "validator":
      addFile(String(spec.file));
      break;
    case "glob": {
      const matched = matchWorkspaceFiles(
        workspaceRoot,
        globList(spec.pattern),
        globList(spec.ignore),
      );
      out.push({
        id: `source-glob:${globList(spec.pattern).join(",")}`,
        hash: sha256(matched.join("\n")),
      });
      break;
    }
    case "references":
      for (const file of matchWorkspaceFiles(
        workspaceRoot,
        globList(spec.files),
        globList(spec.ignore),
      ))
        addFile(file);
      out.push({
        id: `source-glob:${globList(spec.files).join(",")}`,
        hash: sha256(
          matchWorkspaceFiles(
            workspaceRoot,
            globList(spec.files),
            globList(spec.ignore),
          ).join("\n"),
        ),
      });
      break;
    case "schema":
      if (spec.format === "sql") {
        const matched = matchWorkspaceFiles(
          workspaceRoot,
          globList(spec.files),
        );
        for (const file of matched) addFile(file);
        out.push({
          id: `source-glob:${globList(spec.files).join(",")}`,
          hash: sha256(matched.join("\n")),
        });
      } else addFile(String(spec.file));
      break;
    case "routes":
      addFile(String(spec.file));
      for (const file of globList(spec.names_from)) addFile(file);
      break;
  }
  if (
    spec.reader === "routes" ||
    spec.reader === "validator" ||
    (spec.reader === "schema" && spec.format === "drizzle")
  )
    for (const file of [...files])
      for (const imported of importClosure(workspaceRoot, file))
        addFile(imported);
  for (const file of [...files].sort()) {
    const text = readText(workspaceRoot, file);
    out.push({
      id: `source-file:${file}`,
      hash: text === null ? MISSING_FILE_HASH : sha256(text),
    });
  }
  return out.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
}

const IMPORT_SPECIFIER =
  /(?:\bfrom\s*|\bimport\s*\(\s*|\bimport\s+|\brequire\s*\(\s*|\bexport\s+\*\s+from\s*)["']([^"']+)["']/g;

const MODULE_SUFFIXES = [
  "",
  ".ts",
  ".tsx",
  ".mts",
  ".cts",
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
  "/index.ts",
  "/index.tsx",
  "/index.js",
  "/index.mjs",
];

type PathAliases = { base: string; paths: [string, string[]][] } | null;

function tsconfigAliases(workspaceRoot: string, fromFile: string): PathAliases {
  const root = path.resolve(workspaceRoot);
  let dir = path.dirname(path.resolve(root, fromFile));
  for (;;) {
    const config = path.join(dir, "tsconfig.json");
    if (existsSync(config)) {
      try {
        const text = readFileSync(config, "utf8")
          .replace(/\/\*[\s\S]*?\*\//g, "")
          .replace(/(^|[^:"])\/\/.*$/gm, "$1")
          .replace(/,(\s*[}\]])/g, "$1");
        const options = record(record(JSON.parse(text))?.compilerOptions);
        const paths = record(options?.paths);
        if (paths)
          return {
            base: path.resolve(
              dir,
              typeof options?.baseUrl === "string" ? options.baseUrl : ".",
            ),
            paths: Object.entries(paths).map(([key, targets]) => [
              key,
              Array.isArray(targets) ? targets.map(String) : [],
            ]),
          };
      } catch {
        // An unreadable tsconfig maps no aliases.
      }
      return null;
    }
    if (dir === root || path.dirname(dir) === dir) return null;
    dir = path.dirname(dir);
  }
}

function resolveModule(
  workspaceRoot: string,
  fromFile: string,
  specifier: string,
  aliases: PathAliases,
): string | null {
  const root = path.resolve(workspaceRoot);
  const bases: string[] = [];
  if (specifier.startsWith("."))
    bases.push(path.resolve(root, path.dirname(fromFile), specifier));
  else if (aliases !== null)
    for (const [key, targets] of aliases.paths) {
      const star = key.indexOf("*");
      const prefix = star === -1 ? key : key.slice(0, star);
      const suffix = star === -1 ? "" : key.slice(star + 1);
      if (
        star === -1
          ? specifier !== key
          : !specifier.startsWith(prefix) || !specifier.endsWith(suffix)
      )
        continue;
      const middle =
        star === -1
          ? ""
          : specifier.slice(prefix.length, specifier.length - suffix.length);
      for (const target of targets)
        bases.push(path.resolve(aliases.base, target.replace("*", middle)));
    }
  for (const base of bases) {
    const stripped = base.replace(/\.[cm]?js$/, "");
    for (const candidate of [
      base,
      ...MODULE_SUFFIXES.map((suffix) => stripped + suffix),
    ]) {
      if (!existsSync(candidate) || !statSync(candidate).isFile()) continue;
      const relative = path.relative(root, candidate);
      if (relative.startsWith("..") || path.isAbsolute(relative)) return null;
      if (relative.split(path.sep).includes("node_modules")) return null;
      return relative.split(path.sep).join("/");
    }
  }
  return null;
}

/**
 * The workspace modules `file` imports, directly or not, through relative
 * imports and the nearest tsconfig's `paths` aliases (packages in
 * node_modules are left out: a lockfile change stales nothing here).
 */
// implements REQ-kibi-source-proof-kinds
export function importClosure(workspaceRoot: string, file: string): string[] {
  const seen = new Set<string>();
  const queue = [file.split(path.sep).join("/")];
  while (queue.length > 0 && seen.size < 5000) {
    const current = queue.pop() as string;
    if (seen.has(current)) continue;
    seen.add(current);
    const text = readText(workspaceRoot, current);
    if (text === null) continue;
    const aliases = tsconfigAliases(workspaceRoot, current);
    for (const match of text.matchAll(IMPORT_SPECIFIER)) {
      const resolved = resolveModule(
        workspaceRoot,
        current,
        match[1] ?? "",
        aliases,
      );
      if (resolved !== null && !seen.has(resolved)) queue.push(resolved);
    }
  }
  seen.delete(file.split(path.sep).join("/"));
  return [...seen].sort();
}

function sortedUnique(values: Iterable<string>): string[] {
  return [...new Set(values)].sort();
}

function scalarText(value: unknown): string | null {
  if (typeof value === "string") return value;
  if (
    typeof value === "number" ||
    typeof value === "boolean" ||
    typeof value === "bigint"
  )
    return String(value);
  return null;
}

function navigate(
  document: unknown,
  rawPath: string,
): { ok: true; value: unknown } | { ok: false; reason: string } {
  const trimmed = rawPath.trim();
  if (trimmed === "" || trimmed === "/") return { ok: true, value: document };
  const parts = trimmed.startsWith("/")
    ? trimmed
        .slice(1)
        .split("/")
        .map((part) => part.replace(/~1/g, "/").replace(/~0/g, "~"))
    : trimmed.split(".");
  let value: unknown = document;
  for (const part of parts) {
    if (Array.isArray(value) && /^\d+$/.test(part)) value = value[Number(part)];
    else if (
      record(value) !== null &&
      part in (value as Record<string, unknown>)
    )
      value = (value as Record<string, unknown>)[part];
    else
      return {
        ok: false,
        reason: `the document has nothing at ${rawPath} (no ${part})`,
      };
  }
  return { ok: true, value };
}

function parseDocument(
  workspaceRoot: string,
  file: string,
  yaml: boolean,
): { ok: true; value: unknown } | { ok: false; reason: string } {
  const text = readText(workspaceRoot, file);
  if (text === null)
    return { ok: false, reason: `${file} does not exist in the workspace` };
  try {
    return {
      ok: true,
      value:
        yaml || /\.ya?ml$/i.test(file) ? parseYaml(text) : JSON.parse(text),
    };
  } catch (error) {
    return {
      ok: false,
      reason: `Kibi could not parse ${file}: ${error instanceof Error ? error.message.split("\n")[0] : String(error)}`,
    };
  }
}

function readDocumentMembers(
  workspaceRoot: string,
  spec: SourceSpec,
): SourceRead {
  const parsed = parseDocument(
    workspaceRoot,
    String(spec.file),
    spec.reader === "yaml",
  );
  if (!parsed.ok) return parsed;
  const at = navigate(
    parsed.value,
    typeof spec.path === "string" ? spec.path : "",
  );
  if (!at.ok) return at;
  const value = at.value;
  const select = typeof spec.select === "string" ? spec.select : undefined;
  let raw: unknown[];
  if (Array.isArray(value)) {
    if (select === "keys")
      return {
        ok: false,
        reason: `${spec.path ?? "the document"} is a list, which has no keys (use select items)`,
      };
    raw = value;
  } else if (record(value) !== null) {
    const object = value as Record<string, unknown>;
    if (select === "items")
      return {
        ok: false,
        reason: `${spec.path ?? "the document"} is an object, not a list (use select keys or values)`,
      };
    raw = select === "values" ? Object.values(object) : Object.keys(object);
  } else if (scalarText(value) !== null) raw = [value];
  else return { ok: false, reason: `${spec.path ?? "the document"} is empty` };
  const members: string[] = [];
  for (const item of raw) {
    const text = scalarText(item);
    if (text === null)
      return {
        ok: false,
        reason: `${spec.path ?? "the document"} holds a value that is not a string, number or boolean, so it cannot be a member (select keys, or point path at the list)`,
      };
    members.push(text);
  }
  return { ok: true, model: { members: sortedUnique(members) } };
}

function globCaptureRegex(pattern: string): RegExp {
  let out = "";
  for (let index = 0; index < pattern.length; index++) {
    const char = pattern[index] as string;
    if (char === "*" && pattern[index + 1] === "*") {
      out += "(.*)";
      index++;
      if (pattern[index + 1] === "/") index++;
    } else if (char === "*") out += "([^/]*)";
    else if (char === "?") out += "([^/])";
    else out += char.replace(/[.+^${}()|[\]\\]/g, "\\$&");
  }
  return new RegExp(`^${out}$`);
}

function readGlob(workspaceRoot: string, spec: SourceSpec): SourceRead {
  const patterns = globList(spec.pattern);
  const matched = matchWorkspaceFiles(
    workspaceRoot,
    patterns,
    globList(spec.ignore),
  );
  if (spec.capture !== true) return { ok: true, model: { members: matched } };
  const members: string[] = [];
  for (const file of matched) {
    const match = patterns
      .map((pattern) => file.match(globCaptureRegex(pattern)))
      .find((result) => result !== null);
    if (!match)
      return {
        ok: false,
        reason: `capture reads only *, ** and ? in the pattern; ${file} matched a pattern Kibi cannot capture from (braces or classes)`,
      };
    members.push(match.slice(1).join("/"));
  }
  return { ok: true, model: { members: sortedUnique(members) } };
}

const HTTP_METHODS = [
  "get",
  "put",
  "post",
  "delete",
  "options",
  "head",
  "patch",
  "trace",
];

function readOpenApi(workspaceRoot: string, spec: SourceSpec): SourceRead {
  const parsed = parseDocument(workspaceRoot, String(spec.file), false);
  if (!parsed.ok) return parsed;
  const document = record(parsed.value);
  if (
    !document ||
    (document.openapi === undefined && document.swagger === undefined)
  )
    return {
      ok: false,
      reason: `${spec.file} is not an OpenAPI or Swagger document`,
    };
  const select = typeof spec.select === "string" ? spec.select : "operations";
  if (select === "security_schemes") {
    const schemes =
      record(record(document.components)?.securitySchemes) ??
      record(document.securityDefinitions) ??
      {};
    return { ok: true, model: { members: sortedUnique(Object.keys(schemes)) } };
  }
  const rootSecurity = document.security;
  const members: string[] = [];
  for (const [route, rawItem] of Object.entries(record(document.paths) ?? {})) {
    const item = record(rawItem) ?? {};
    for (const method of HTTP_METHODS) {
      const operation = record(item[method]);
      if (!operation) continue;
      const name = `${method.toUpperCase()} ${route}`;
      if (select === "operations") members.push(name);
      else if (select === "responses")
        for (const code of Object.keys(record(operation.responses) ?? {}))
          members.push(`${name} ${code}`);
      else {
        const security = operation.security ?? rootSecurity;
        const unsecured =
          !Array.isArray(security) ||
          security.length === 0 ||
          security.some(
            (row) =>
              record(row) !== null && Object.keys(row as object).length === 0,
          );
        if (unsecured) members.push(name);
      }
    }
  }
  return { ok: true, model: { members: sortedUnique(members) } };
}

// ---------------------------------------------------------------- schemas

type Table = {
  name: string;
  columns: Map<string, SourceColumn>;
  foreignKeys: string[];
};

function identifierName(raw: string): string {
  const cleaned = raw.trim();
  const parts = cleaned.match(
    /("[^"]+"|`[^`]+`|\[[^\]]+\]|[A-Za-z_][\w$]*)/g,
  ) ?? [cleaned];
  return (parts[parts.length - 1] ?? cleaned).replace(/^["`[]|["`\]]$/g, "");
}

function splitTopLevel(body: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let current = "";
  let quote: string | null = null;
  for (const char of body) {
    if (quote !== null) {
      current += char;
      if (char === quote) quote = null;
      continue;
    }
    if (char === "'" || char === '"' || char === "`") quote = char;
    if (char === "(") depth++;
    if (char === ")") depth--;
    if (char === "," && depth === 0) {
      parts.push(current.trim());
      current = "";
    } else current += char;
  }
  if (current.trim() !== "") parts.push(current.trim());
  return parts;
}

function stripSqlComments(text: string): string {
  return text.replace(/--[^\n]*/g, "").replace(/\/\*[\s\S]*?\*\//g, "");
}

function sqlStatements(text: string): string[] {
  const statements: string[] = [];
  let current = "";
  let quote: string | null = null;
  for (const char of stripSqlComments(text)) {
    if (quote !== null) {
      current += char;
      if (char === quote) quote = null;
      continue;
    }
    if (char === "'" || char === '"' || char === "`") quote = char;
    if (char === ";") {
      if (current.trim() !== "") statements.push(current.trim());
      current = "";
    } else current += char;
  }
  if (current.trim() !== "") statements.push(current.trim());
  return statements;
}

const COLUMN_CONSTRAINT_START =
  /^(?:constraint|primary\s+key|foreign\s+key|unique|check|key|index)\b/i;

function foreignKeyText(
  table: string,
  columns: string,
  target: string,
  targetColumns: string,
  rest: string,
): string {
  const onDelete = rest.match(
    /\bon\s+delete\s+(cascade|restrict|set\s+null|set\s+default|no\s+action)/i,
  );
  const from = splitTopLevel(columns).map(identifierName).join(",");
  const to = splitTopLevel(targetColumns).map(identifierName).join(",");
  return `${table}.${from}->${identifierName(target)}.${to}${
    onDelete?.[1]
      ? ` on delete ${onDelete[1].toLowerCase().replace(/\s+/g, " ")}`
      : ""
  }`;
}

function sqlColumn(table: Table, definition: string): void {
  const name = identifierName(
    definition.match(/^("[^"]+"|`[^`]+`|\[[^\]]+\]|\S+)/)?.[1] ?? "",
  );
  const rest = definition.slice(
    definition.match(/^("[^"]+"|`[^`]+`|\[[^\]]+\]|\S+)/)?.[0].length ?? 0,
  );
  const notNull =
    /\bnot\s+null\b/i.test(rest) || /\bprimary\s+key\b/i.test(rest);
  table.columns.set(name, { name, nullable: !notNull, optional: false });
  const reference = rest.match(
    /\breferences\s+("[^"]+"|`[^`]+`|\[[^\]]+\]|[\w.]+)\s*\(([^)]*)\)(.*)$/is,
  );
  if (reference)
    table.foreignKeys.push(
      foreignKeyText(
        table.name,
        name,
        reference[1] ?? "",
        reference[2] ?? "",
        reference[3] ?? "",
      ),
    );
}

function applySqlStatement(
  tables: Map<string, Table>,
  statement: string,
  where: string,
): string | null {
  const normalized = statement.replace(/\s+/g, " ").trim();
  const create = normalized.match(
    /^create\s+(?:temp(?:orary)?\s+)?table\s+(?:if\s+not\s+exists\s+)?("[^"]+"|`[^`]+`|\[[^\]]+\]|[\w.]+)\s*\((.*)\)[^)]*$/is,
  );
  if (create) {
    const name = identifierName(create[1] ?? "");
    const table: Table = { name, columns: new Map(), foreignKeys: [] };
    for (const part of splitTopLevel(create[2] ?? "")) {
      if (COLUMN_CONSTRAINT_START.test(part)) {
        const fk = part.match(
          /foreign\s+key\s*\(([^)]*)\)\s*references\s+("[^"]+"|`[^`]+`|\[[^\]]+\]|[\w.]+)\s*\(([^)]*)\)(.*)$/is,
        );
        if (fk)
          table.foreignKeys.push(
            foreignKeyText(
              name,
              fk[1] ?? "",
              fk[2] ?? "",
              fk[3] ?? "",
              fk[4] ?? "",
            ),
          );
        const primary = part.match(/primary\s+key\s*\(([^)]*)\)/i);
        if (primary)
          for (const column of splitTopLevel(primary[1] ?? "").map(
            identifierName,
          )) {
            const existing = table.columns.get(column);
            if (existing) existing.nullable = false;
          }
        continue;
      }
      sqlColumn(table, part);
    }
    tables.set(name, table);
    return null;
  }
  if (/^create\s+(?:temp(?:orary)?\s+)?table\b/i.test(normalized))
    return `${where}: Kibi cannot read this CREATE TABLE form (${normalized.slice(0, 80)})`;
  const drop = normalized.match(
    /^drop\s+table\s+(?:if\s+exists\s+)?("[^"]+"|`[^`]+`|\[[^\]]+\]|[\w.]+)/i,
  );
  if (drop) {
    tables.delete(identifierName(drop[1] ?? ""));
    return null;
  }
  const alter = normalized.match(
    /^alter\s+table\s+(?:only\s+)?(?:if\s+exists\s+)?("[^"]+"|`[^`]+`|\[[^\]]+\]|[\w.]+)\s+(.*)$/i,
  );
  if (!alter) return null;
  const tableName = identifierName(alter[1] ?? "");
  const table = tables.get(tableName);
  if (!table)
    return `${where}: ALTER TABLE ${tableName} before Kibi read its CREATE TABLE`;
  const action = alter[2] ?? "";
  const rename = action.match(
    /^rename\s+to\s+("[^"]+"|`[^`]+`|\[[^\]]+\]|[\w.]+)$/i,
  );
  if (rename) {
    tables.delete(tableName);
    table.name = identifierName(rename[1] ?? "");
    table.foreignKeys = table.foreignKeys.map((fk) =>
      fk.replace(new RegExp(`^${tableName}\\.`), `${table.name}.`),
    );
    tables.set(table.name, table);
    return null;
  }
  const add = action.match(
    /^add\s+(?:column\s+)?(?:if\s+not\s+exists\s+)?(.*)$/i,
  );
  if (add && !COLUMN_CONSTRAINT_START.test(add[1] ?? "")) {
    sqlColumn(table, add[1] ?? "");
    return null;
  }
  const dropColumn = action.match(
    /^drop\s+(?:column\s+)?(?:if\s+exists\s+)?("[^"]+"|`[^`]+`|\[[^\]]+\]|\w+)(?:\s+(?:cascade|restrict))?$/i,
  );
  if (dropColumn) {
    const column = identifierName(dropColumn[1] ?? "");
    table.columns.delete(column);
    table.foreignKeys = table.foreignKeys.filter(
      (fk) => !fk.startsWith(`${table.name}.${column}->`),
    );
    return null;
  }
  const renameColumn = action.match(
    /^rename\s+(?:column\s+)?("[^"]+"|`[^`]+`|\[[^\]]+\]|\w+)\s+to\s+("[^"]+"|`[^`]+`|\[[^\]]+\]|\w+)$/i,
  );
  if (renameColumn) {
    const from = identifierName(renameColumn[1] ?? "");
    const to = identifierName(renameColumn[2] ?? "");
    const column = table.columns.get(from);
    if (column) {
      table.columns.delete(from);
      column.name = to;
      table.columns.set(to, column);
    }
    table.foreignKeys = table.foreignKeys.map((fk) =>
      fk.replace(`${table.name}.${from}->`, `${table.name}.${to}->`),
    );
    return null;
  }
  const nullability = action.match(
    /^alter\s+(?:column\s+)?("[^"]+"|`[^`]+`|\[[^\]]+\]|\w+)\s+(set|drop)\s+not\s+null$/i,
  );
  if (nullability) {
    const column = table.columns.get(identifierName(nullability[1] ?? ""));
    if (column)
      column.nullable = (nullability[2] ?? "").toLowerCase() === "drop";
    return null;
  }
  const addFk = action.match(
    /^add\s+(?:constraint\s+\S+\s+)?foreign\s+key\s*\(([^)]*)\)\s*references\s+("[^"]+"|`[^`]+`|\[[^\]]+\]|[\w.]+)\s*\(([^)]*)\)(.*)$/i,
  );
  if (addFk) {
    table.foreignKeys.push(
      foreignKeyText(
        table.name,
        addFk[1] ?? "",
        addFk[2] ?? "",
        addFk[3] ?? "",
        addFk[4] ?? "",
      ),
    );
    return null;
  }
  if (
    /^(?:add\s+constraint\s+\S+\s+(?:unique|check|primary)|add\s+(?:unique|check))/i.test(
      action,
    )
  )
    return null;
  return `${where}: Kibi cannot read this ALTER TABLE form (${normalized.slice(0, 80)}), so the schema after it is unknown`;
}

function readSqlSchema(
  workspaceRoot: string,
  spec: SourceSpec,
): Table[] | string {
  const files = matchWorkspaceFiles(workspaceRoot, globList(spec.files));
  if (files.length === 0)
    return `${globList(spec.files).join(", ")} matches no file`;
  const tables = new Map<string, Table>();
  for (const file of files) {
    const text = readText(workspaceRoot, file) ?? "";
    const statements = sqlStatements(
      text.replace(/-->\s*statement-breakpoint/g, ";"),
    );
    for (const statement of statements) {
      const problem = applySqlStatement(tables, statement, file);
      if (problem !== null) return problem;
    }
  }
  return [...tables.values()];
}

const PRISMA_SCALARS = new Set([
  "String",
  "Boolean",
  "Int",
  "BigInt",
  "Float",
  "Decimal",
  "DateTime",
  "Json",
  "Bytes",
]);

function readPrismaSchema(
  workspaceRoot: string,
  spec: SourceSpec,
): Table[] | string {
  const text = readText(workspaceRoot, String(spec.file));
  if (text === null) return `${spec.file} does not exist in the workspace`;
  const source = text.replace(/\/\/[^\n]*/g, "");
  const enums = new Set(
    [...source.matchAll(/\benum\s+(\w+)\s*\{/g)].map((m) => m[1] as string),
  );
  const types = new Set(
    [...source.matchAll(/\b(?:type)\s+(\w+)\s*\{/g)].map((m) => m[1] as string),
  );
  const tables: Table[] = [];
  for (const model of source.matchAll(/\bmodel\s+(\w+)\s*\{([^}]*)\}/g)) {
    const body = model[2] ?? "";
    const mapped = body.match(/@@map\(\s*"([^"]+)"\s*\)/)?.[1];
    const name = mapped ?? (model[1] as string);
    const table: Table = { name, columns: new Map(), foreignKeys: [] };
    const fieldNames = new Map<string, string>();
    for (const line of body.split("\n")) {
      const field = line.trim().match(/^(\w+)\s+(\w+)(\[\])?(\?)?(.*)$/);
      if (!field) continue;
      const [, fieldName = "", type = "", list, optional, attributes = ""] =
        field;
      const columnName =
        attributes.match(/@map\(\s*"([^"]+)"\s*\)/)?.[1] ?? fieldName;
      fieldNames.set(fieldName, columnName);
      if (
        PRISMA_SCALARS.has(type) ||
        enums.has(type) ||
        types.has(type) ||
        list === "[]"
      ) {
        if (list === "[]" && !PRISMA_SCALARS.has(type) && !enums.has(type))
          continue;
        table.columns.set(columnName, {
          name: columnName,
          nullable: optional === "?",
          optional: false,
        });
      }
    }
    for (const line of body.split("\n")) {
      const relation = line.match(
        /^\s*\w+\s+(\w+)\??\s+.*@relation\(([^)]*)\)/,
      );
      if (!relation) continue;
      const fields = relation[2]?.match(/fields:\s*\[([^\]]*)\]/)?.[1];
      const references = relation[2]?.match(/references:\s*\[([^\]]*)\]/)?.[1];
      if (!fields || !references) continue;
      const target = relation[1] as string;
      const targetModel = source.match(
        new RegExp(`\\bmodel\\s+${target}\\s*\\{([^}]*)\\}`),
      );
      const targetName =
        targetModel?.[1]?.match(/@@map\(\s*"([^"]+)"\s*\)/)?.[1] ?? target;
      const onDelete = relation[2]?.match(/onDelete:\s*(\w+)/)?.[1];
      const columns = fields
        .split(",")
        .map((f) => fieldNames.get(f.trim()) ?? f.trim())
        .join(",");
      const targetColumns = references
        .split(",")
        .map((f) => f.trim())
        .join(",");
      table.foreignKeys.push(
        `${name}.${columns}->${targetName}.${targetColumns}${
          onDelete
            ? ` on delete ${onDelete.replace(/([a-z])([A-Z])/g, "$1 $2").toLowerCase()}`
            : ""
        }`,
      );
    }
    tables.push(table);
  }
  if (tables.length === 0) return `${spec.file} declares no model`;
  return tables;
}

function globMatcher(pattern: string | undefined): (name: string) => boolean {
  if (pattern === undefined || pattern === "*") return () => true;
  const regex = new RegExp(
    `^${pattern
      .replace(/[.+^${}()|[\]\\]/g, "\\$&")
      .replace(/\*/g, ".*")
      .replace(/\?/g, ".")}$`,
  );
  return (name) => regex.test(name);
}

/** The entities (tables or validator objects) a spec's table filter selects. */
export function selectedEntities(
  spec: SourceSpec,
  model: SourceModel,
): SourceEntity[] {
  const matches = globMatcher(
    typeof spec.table === "string" ? spec.table : undefined,
  );
  return (model.entities ?? []).filter((entity) => matches(entity.name));
}

function entityMembers(spec: SourceSpec, entities: SourceEntity[]): string[] {
  const select =
    typeof spec.select === "string"
      ? spec.select
      : spec.reader === "validator"
        ? "fields"
        : "tables";
  const prefix = (entity: SourceEntity, column: SourceColumn) =>
    spec.reader === "validator" ? column.name : `${entity.name}.${column.name}`;
  const members: string[] = [];
  for (const entity of entities) {
    if (select === "tables") members.push(entity.name);
    else if (select === "foreign_keys") members.push(...entity.foreign_keys);
    else
      for (const column of entity.columns) {
        const required = !column.nullable && !column.optional;
        if (
          select === "columns" ||
          select === "fields" ||
          ((select === "required_columns" || select === "required_fields") &&
            required) ||
          (select === "nullable_columns" && column.nullable) ||
          (select === "optional_fields" && !required)
        )
          members.push(prefix(entity, column));
      }
  }
  return sortedUnique(members);
}

function finishEntities(
  spec: SourceSpec,
  tables: Table[] | SourceEntity[],
): SourceRead {
  const entities: SourceEntity[] = tables
    .map((table) =>
      "columns" in table && table.columns instanceof Map
        ? {
            name: table.name,
            columns: [...table.columns.values()]
              .map((column) => ({ ...column }))
              .sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0)),
            foreign_keys: sortedUnique((table as Table).foreignKeys),
          }
        : (table as SourceEntity),
    )
    .sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
  const model: SourceModel = { members: [], entities };
  const selected = selectedEntities(spec, model);
  if (typeof spec.table === "string" && selected.length === 0)
    return {
      ok: false,
      reason: `no ${spec.reader === "validator" ? "object" : "table"} matches ${spec.table} (${
        entities
          .map((e) => e.name)
          .slice(0, 10)
          .join(", ") || "none read"
      })`,
    };
  return {
    ok: true,
    model: { members: entityMembers(spec, selected), entities: selected },
  };
}

/** The routes a spec's path_prefix selects. */
export function selectedRoutes(
  spec: SourceSpec,
  routes: SourceRoute[],
): SourceRoute[] {
  const prefix =
    typeof spec.path_prefix === "string"
      ? spec.path_prefix.replace(/\/+$/, "")
      : "";
  return routes.filter(
    (route) =>
      prefix === "" ||
      route.path === prefix ||
      route.path.startsWith(`${prefix}/`),
  );
}

/**
 * Read `spec` from the workspace. Readers that evaluate code (drizzle
 * schemas, route tables, validators) and the references reader go through
 * `evaluate`, which the CLI supplies; a read without it refuses those.
 */
// implements REQ-kibi-source-proof-kinds
export async function readSource(
  workspaceRoot: string,
  spec: SourceSpec,
  evaluate?: SourceCodeEvaluator,
): Promise<SourceRead> {
  const errors = sourceSpecErrors(spec, "source");
  if (errors.length > 0) return { ok: false, reason: errors.join("; ") };
  switch (spec.reader) {
    case "json":
    case "yaml":
      return readDocumentMembers(workspaceRoot, spec);
    case "glob":
      return readGlob(workspaceRoot, spec);
    case "openapi":
      return readOpenApi(workspaceRoot, spec);
    case "schema": {
      if (spec.format === "sql") {
        const tables = readSqlSchema(workspaceRoot, spec);
        return typeof tables === "string"
          ? { ok: false, reason: tables }
          : finishEntities(spec, tables);
      }
      if (spec.format === "prisma") {
        const tables = readPrismaSchema(workspaceRoot, spec);
        return typeof tables === "string"
          ? { ok: false, reason: tables }
          : finishEntities(spec, tables);
      }
      break;
    }
    default:
      break;
  }
  if (evaluate === undefined)
    return {
      ok: false,
      reason: `reader ${spec.reader} needs Kibi's code evaluator`,
    };
  const evaluated = await evaluate(workspaceRoot, spec);
  if (!evaluated.ok) return evaluated;
  if (spec.reader === "references")
    return {
      ok: true,
      model: { members: sortedUnique(evaluated.members ?? []) },
    };
  if (spec.reader === "routes") {
    const routes = selectedRoutes(spec, evaluated.routes ?? []).sort((a, b) =>
      `${a.path} ${a.method}` < `${b.path} ${b.method}` ? -1 : 1,
    );
    if (typeof spec.path_prefix === "string" && routes.length === 0)
      return {
        ok: false,
        reason: `no route of ${spec.export} is under ${spec.path_prefix}`,
      };
    const members =
      spec.select === "middleware"
        ? routes.flatMap((route) =>
            route.middleware.map(
              (name) => `${route.method} ${route.path} ${name}`,
            ),
          )
        : routes.map((route) => `${route.method} ${route.path}`);
    return { ok: true, model: { members: sortedUnique(members), routes } };
  }
  return finishEntities(spec, evaluated.entities ?? []);
}

/** What the CLI's code evaluator returns for a reader that runs code. */
export type SourceCodeEvaluation =
  | {
      ok: true;
      members?: string[];
      entities?: SourceEntity[];
      routes?: SourceRoute[];
    }
  | { ok: false; reason: string };

export type SourceCodeEvaluator = (
  workspaceRoot: string,
  spec: SourceSpec,
) => Promise<SourceCodeEvaluation>;

/** A short description of a spec, for messages. */
export function describeSource(spec: SourceSpec): string {
  switch (spec.reader) {
    case "json":
    case "yaml":
    case "openapi":
      return `${spec.reader} ${spec.file}${spec.path ? ` at ${spec.path}` : ""}`;
    case "glob":
      return `files matching ${globList(spec.pattern).join(", ")}`;
    case "references":
      return `${spec.extract} references in ${globList(spec.files).join(", ")}`;
    case "schema":
      return `${spec.format} schema ${spec.file ?? globList(spec.files).join(", ")}${spec.table ? ` (tables ${spec.table})` : ""}`;
    case "routes":
      return `routes of ${spec.export} in ${spec.file}${spec.path_prefix ? ` under ${spec.path_prefix}` : ""}`;
    case "validator":
      return `validator ${spec.export} in ${spec.file}`;
  }
}

/** Unresolved references, as one rejection reason naming the first few. */
export function unresolvedReason(
  what: string,
  unresolved: readonly UnresolvedReference[],
): string {
  const shown = unresolved
    .slice(0, 5)
    .map((row) => `${row.file}:${row.line} ${row.text}`)
    .join("; ");
  return `Kibi cannot read ${unresolved.length} ${what} statically, so the set is not known exactly: ${shown}${unresolved.length > 5 ? "; ..." : ""}`;
}
