import { toPrologAtom } from "./prolog/codec.js";
import { runOperationJsonQuery } from "./public/operations/prolog-json.js";
import type { PrologPort } from "./public/operations/runtime-types.js";
import { readSubjectDefinition } from "./public/operations/subject-domain.js";
import {
  adrExcerpt,
  byteSize,
  clip,
  proseExcerpt,
} from "./search-answer.js";
import { compareCodeUnits, loadMarkdownBody } from "./search-ranking.js";

export const MAP_DEFAULT_MAX_BYTES = 8_192;
export const MAP_MIN_MAX_BYTES = 1_024;
export const MAP_MAX_MAX_BYTES = 32_768;
export const DOMINANT_ROOT_SHARE = 0.75;
export const DOMINANT_ROOT_MIN_CHILDREN = 5;

const OVERVIEW_EXCERPT_CHARS = 280;
const DEFINITION_EXCERPT_CHARS = 180;
const ADR_EXCERPT_CHARS = 180;

export type MapInput = Readonly<{
  domain?: string;
  depth?: number;
  includeAdrs?: boolean;
  maxBytes?: number;
  kb?: string;
}>;

export type MapOverviewEntry = Readonly<{
  id: string;
  title: string;
  summary: string;
  source: string;
  updatedAt: string | null;
}>;

export type MapFirmRequirementSample = Readonly<{
  id: string;
  title: string;
}>;

export type MapArea = Readonly<{
  key: string;
  subjectKey?: string;
  defined: boolean;
  definition?: string;
  requirementCount: number;
  firmCount: number;
  mustCount: number;
  adrIds: readonly string[];
  codeRoots: readonly string[];
  subdomains: readonly string[];
  sampleFirmRequirements: readonly MapFirmRequirementSample[];
  ask: string;
}>;

export type MapDecision = Readonly<{
  id: string;
  title: string;
  firmness: string;
  tags: readonly string[];
  decisionExcerpt?: string;
  linkedRequirementCount: number;
}>;

export type MapGaps = Readonly<{
  unanchoredCurrentReqs: number;
  unanchoredSampleIds: readonly string[];
  unlinkedAcceptedAdrs: number;
  unlinkedAdrIds: readonly string[];
  linkedSourceFiles: number;
}>;

export type MapStats = Readonly<{
  currentRequirements: number;
  firmRequirements: number;
  acceptedAdrs: number;
  definedSubjects: number;
  scenarios: number;
  tests: number;
  linkedSourceFiles: number;
}>;

export type MapScope = Readonly<{
  branch: string | null;
  snapshotId: string;
  syncedAt: string | null;
}>;

export type MapBranchStoreNotice = Readonly<{
  state: "not_compiled";
  code: string;
  path: string;
  detail: string;
  remediation: Readonly<Record<string, unknown>>;
}>;

export type MapPayload = Readonly<{
  version: "kibi.map.v1";
  overview: Readonly<{
    present: boolean;
    entries: readonly MapOverviewEntry[];
  }>;
  strippedRoot?: string;
  areas: readonly MapArea[];
  decisions: readonly MapDecision[];
  gaps: MapGaps;
  stats: MapStats;
  scope: MapScope;
  truncated: boolean;
  note: string;
  branch?: string | null;
  branchStore?: MapBranchStoreNotice;
}>;

type RawOverviewEntry = Readonly<{
  id?: unknown;
  title?: unknown;
  source?: unknown;
  updatedAt?: unknown;
}>;

type RawAdrRow = Readonly<{
  id?: unknown;
  title?: unknown;
  status?: unknown;
  firmness?: unknown;
  source?: unknown;
  tags?: unknown;
  linkedReqIds?: unknown;
}>;

type RawSubjectRow = Readonly<{
  key?: unknown;
  defined?: unknown;
  title?: unknown;
  source?: unknown;
  requirementIds?: unknown;
  firmReqIds?: unknown;
  firmReqs?: unknown;
  mustReqIds?: unknown;
  adrIds?: unknown;
  codeFiles?: unknown;
}>;

type RawPrologMapPayload = Readonly<{
  overview?: unknown;
  adrs?: unknown;
  subjects?: unknown;
  gaps?: {
    unanchoredCurrentReqs?: unknown;
    unanchoredSampleIds?: unknown;
    unlinkedAcceptedAdrs?: unknown;
    unlinkedAdrIds?: unknown;
    linkedSourceFiles?: unknown;
  };
  stats?: {
    currentRequirements?: unknown;
    firmRequirements?: unknown;
    acceptedAdrs?: unknown;
    definedSubjects?: unknown;
    scenarios?: unknown;
    tests?: unknown;
    linkedSourceFiles?: unknown;
  };
  scope?: {
    snapshotId?: unknown;
    syncedAt?: unknown;
  };
}>;

function asString(value: unknown): string {
  return value == null ? "" : String(value);
}

function asStrings(value: unknown): string[] {
  return Array.isArray(value)
    ? value.map((item) => asString(item)).filter((item) => item.length > 0)
    : [];
}

function asNonNegativeInt(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0
    ? Math.trunc(value)
    : 0;
}

function normalizeBoundInt(
  value: number | undefined,
  fallback: number,
  min: number,
  max: number,
): number {
  if (value === undefined || !Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, Math.trunc(value)));
}

function detectDominantRoot(
  subjects: readonly RawSubjectRow[],
): string | undefined {
  if (subjects.length === 0) return undefined;
  const counts = new Map<string, number>();
  const children = new Map<string, Set<string>>();
  for (const subject of subjects) {
    const key = asString(subject.key).trim();
    if (!key) continue;
    const segments = key.split(".");
    const root = segments[0];
    if (!root) continue;
    counts.set(root, (counts.get(root) ?? 0) + 1);
    if (segments.length >= 2 && segments[1]) {
      let set = children.get(root);
      if (!set) {
        set = new Set();
        children.set(root, set);
      }
      set.add(segments[1]);
    }
  }
  let topRoot: string | undefined;
  let topCount = 0;
  for (const [root, count] of [...counts.entries()].sort((left, right) =>
    compareCodeUnits(left[0], right[0]),
  )) {
    if (count > topCount) {
      topRoot = root;
      topCount = count;
    }
  }
  if (topRoot === undefined) return undefined;
  const share = topCount / subjects.length;
  const distinctChildren = children.get(topRoot)?.size ?? 0;
  return share >= DOMINANT_ROOT_SHARE &&
    distinctChildren >= DOMINANT_ROOT_MIN_CHILDREN
    ? topRoot
    : undefined;
}

function collapseCodeRoot(sourceFile: string): string {
  const cleaned = sourceFile.replace(/\\/g, "/").replace(/^\.\//, "");
  const parts = cleaned.split("/").filter(Boolean);
  if (parts.length <= 2) return cleaned;
  const keep = parts[0] === "packages" && parts.length >= 3 ? 3 : 2;
  return parts.slice(0, keep).join("/");
}

function sortCodeRoots(rootCounts: ReadonlyMap<string, number>): string[] {
  return [...rootCounts.entries()]
    .sort((left, right) => {
      if (right[1] !== left[1]) return right[1] - left[1];
      return compareCodeUnits(left[0], right[0]);
    })
    .map(([root]) => root)
    .slice(0, 5);
}

function keyMatchesPrefix(key: string, prefix: string): boolean {
  return key === prefix || key.startsWith(`${prefix}.`);
}

function stripLeadingSegment(key: string, root: string): string[] {
  if (key === root) return [];
  if (key.startsWith(`${root}.`)) {
    return key.slice(root.length + 1).split(".");
  }
  return key.split(".");
}

function resolveZoomMatch(
  key: string,
  normalizedDomain: string,
  strippedRoot: string | undefined,
): { matchedPrefix: string; relativeSegments: string[] } | null {
  if (keyMatchesPrefix(key, normalizedDomain)) {
    const rest =
      key === normalizedDomain
        ? []
        : key.slice(normalizedDomain.length + 1).split(".");
    return { matchedPrefix: normalizedDomain, relativeSegments: rest };
  }
  if (strippedRoot !== undefined && !normalizedDomain.includes(".")) {
    const qualified = `${strippedRoot}.${normalizedDomain}`;
    if (keyMatchesPrefix(key, qualified)) {
      const rest =
        key === qualified ? [] : key.slice(qualified.length + 1).split(".");
      return { matchedPrefix: qualified, relativeSegments: rest };
    }
  }
  return null;
}

type MutableAreaBucket = {
  key: string;
  exactCanonicalKey: string;
  exactDefinedSubject?: RawSubjectRow;
  reqIds: Set<string>;
  firmReqs: Map<string, string>;
  mustReqIds: Set<string>;
  adrIds: Set<string>;
  codeRootCounts: Map<string, number>;
  subdomains: Set<string>;
};

async function readOverviewEntry(
  raw: RawOverviewEntry,
  workspaceRoot: string,
  bodies: Map<string, Promise<string | null>>,
): Promise<MapOverviewEntry> {
  const id = asString(raw.id);
  const title = asString(raw.title);
  const source = asString(raw.source);
  const updatedAtRaw = raw.updatedAt;
  const updatedAt =
    typeof updatedAtRaw === "string" && updatedAtRaw.length > 0
      ? updatedAtRaw
      : null;
  let summary = title;
  if (source) {
    let bodyPromise = bodies.get(source);
    if (!bodyPromise) {
      bodyPromise = loadMarkdownBody(source, workspaceRoot);
      bodies.set(source, bodyPromise);
    }
    const body = await bodyPromise;
    if (body) {
      const excerpt = proseExcerpt(body.split(/\r?\n/), OVERVIEW_EXCERPT_CHARS);
      if (excerpt) summary = excerpt;
    }
  }
  return {
    id,
    title,
    summary,
    source: source.split("#", 1)[0] ?? source,
    updatedAt,
  };
}

async function readDecisionEntry(
  raw: RawAdrRow,
  workspaceRoot: string,
  bodies: Map<string, Promise<string | null>>,
): Promise<MapDecision> {
  const id = asString(raw.id);
  const title = asString(raw.title);
  const firmness = asString(raw.firmness) || "firm";
  const source = asString(raw.source);
  const tags = asStrings(raw.tags);
  const linkedReqIds = asStrings(raw.linkedReqIds);
  let decisionExcerpt: string | undefined;
  if (source) {
    let bodyPromise = bodies.get(source);
    if (!bodyPromise) {
      bodyPromise = loadMarkdownBody(source, workspaceRoot);
      bodies.set(source, bodyPromise);
    }
    const body = await bodyPromise;
    if (body) {
      decisionExcerpt = adrExcerpt(body, ADR_EXCERPT_CHARS);
    }
  }
  return {
    id,
    title,
    firmness,
    tags,
    ...(decisionExcerpt !== undefined ? { decisionExcerpt } : {}),
    linkedRequirementCount: linkedReqIds.length,
  };
}

function buildAskHint(
  displayKey: string,
  canonicalSubjectKey: string | undefined,
  defined: boolean,
): string {
  if (defined && canonicalSubjectKey) {
    return `kb_query(${JSON.stringify({ factKind: "subject", subjectKey: canonicalSubjectKey })})`;
  }
  const topic = displayKey.split(".").at(-1) || displayKey;
  return `kb_search(${JSON.stringify({ query: topic, semanticFacets: { objects: [topic] } })})`;
}

function trimAreaSamples(
  areas: readonly MapArea[],
  sampleCap: number,
): MapArea[] {
  return areas.map((area) => ({
    ...area,
    sampleFirmRequirements: area.sampleFirmRequirements.slice(0, sampleCap),
  }));
}

function trimAreaCodeRoots(
  areas: readonly MapArea[],
  codeCap: number,
): MapArea[] {
  return areas.map((area) => ({
    ...area,
    codeRoots: area.codeRoots.slice(0, codeCap),
  }));
}

function trimAreaSubdomains(
  areas: readonly MapArea[],
  subdomainCap: number,
): MapArea[] {
  return areas.map((area) => ({
    ...area,
    subdomains: area.subdomains.slice(0, subdomainCap),
  }));
}

export function fitMapPayload(payload: MapPayload, maxBytes: number): MapPayload {
  if (byteSize(payload) <= maxBytes) return payload;
  let fitted: {
    version: "kibi.map.v1";
    overview: { present: boolean; entries: MapOverviewEntry[] };
    strippedRoot?: string;
    areas: MapArea[];
    decisions: MapDecision[];
    gaps: MapGaps;
    stats: MapStats;
    scope: MapScope;
    truncated: boolean;
    note: string;
    branch?: string | null;
    branchStore?: MapBranchStoreNotice;
  } = {
    ...payload,
    overview: {
      present: payload.overview.present,
      entries: [...payload.overview.entries],
    },
    areas: [...payload.areas],
    decisions: [...payload.decisions],
    truncated: true,
  };

  for (const sampleCap of [1, 0]) {
    if (byteSize(fitted) <= maxBytes) return fitted;
    fitted = {
      ...fitted,
      areas: trimAreaSamples(fitted.areas, sampleCap),
    };
  }

  for (const codeCap of [2, 0]) {
    if (byteSize(fitted) <= maxBytes) return fitted;
    fitted = {
      ...fitted,
      areas: trimAreaCodeRoots(fitted.areas, codeCap),
    };
  }

  for (const subdomainCap of [3, 0]) {
    if (byteSize(fitted) <= maxBytes) return fitted;
    fitted = {
      ...fitted,
      areas: trimAreaSubdomains(fitted.areas, subdomainCap),
    };
  }

  for (let index = fitted.decisions.length - 1; index >= 0; index -= 1) {
    if (byteSize(fitted) <= maxBytes) return fitted;
    const entry = fitted.decisions[index];
    if (entry?.decisionExcerpt !== undefined) {
      const { decisionExcerpt: _dropped, ...withoutExcerpt } = entry;
      fitted.decisions[index] = withoutExcerpt;
    }
  }

  while (byteSize(fitted) > maxBytes && fitted.areas.length > 0) {
    fitted.areas.pop();
  }

  while (byteSize(fitted) > maxBytes && fitted.decisions.length > 0) {
    fitted.decisions.pop();
  }

  while (byteSize(fitted) > maxBytes && fitted.overview.entries.length > 0) {
    fitted.overview.entries.pop();
  }

  return fitted;
}

export function formatMapText(payload: MapPayload): string {
  const lines: string[] = [];
  const scopeLabel = payload.branch
    ? `${payload.branch} (${payload.scope.snapshotId})`
    : payload.scope.snapshotId;
  lines.push(
    `Kibi governance map for ${scopeLabel}: ${payload.stats.currentRequirements} current requirements (${payload.stats.firmRequirements} firm), ${payload.stats.acceptedAdrs} accepted ADRs, ${payload.stats.definedSubjects} defined subjects, ${payload.stats.scenarios} scenarios, ${payload.stats.tests} tests, ${payload.stats.linkedSourceFiles} linked source files.`,
  );
  if (payload.overview.present && payload.overview.entries.length > 0) {
    lines.push(
      `Overview: ${payload.overview.entries.map((entry) => `${entry.id} (${entry.summary})`).join("; ")}`,
    );
  }
  if (payload.areas.length > 0) {
    const areaLabel = payload.strippedRoot
      ? `Top subject areas (root '${payload.strippedRoot}' stripped for grouping)`
      : "Top subject areas";
    const summary = payload.areas
      .slice(0, 8)
      .map(
        (area) =>
          `${area.key}: ${area.requirementCount} reqs (${area.firmCount} firm${area.adrIds.length > 0 ? `, ${area.adrIds.length} ADRs` : ""})`,
      )
      .join("; ");
    lines.push(`${areaLabel}: ${summary}.`);
  }
  if (payload.decisions.length > 0) {
    const decisionSummary = payload.decisions
      .slice(0, 8)
      .map((decision) => `${decision.id} (${decision.title})`)
      .join("; ");
    lines.push(`Accepted ADRs: ${decisionSummary}.`);
  }
  lines.push(
    `Gaps: ${payload.gaps.unanchoredCurrentReqs} unanchored current requirements, ${payload.gaps.unlinkedAcceptedAdrs} unlinked accepted ADRs.`,
  );
  if (payload.truncated) {
    lines.push(
      "Note: output trimmed to maxBytes; pass domain or raise maxBytes for full detail.",
    );
  }
  if (payload.branchStore) {
    lines.push(
      `Note: ${payload.branchStore.detail} Run kibi sync before relying on map counts.`,
    );
  }
  lines.push(payload.note);
  return lines.join("\n");
}

export async function buildMapPayload(
  prolog: Pick<PrologPort, "query">,
  workspaceRoot: string,
  input: MapInput = {},
  contextInfo: Readonly<{
    branch?: string | null;
    branchStore?: MapBranchStoreNotice;
  }> = {},
): Promise<MapPayload> {
  const domain = input.domain?.trim() ? input.domain.trim() : undefined;
  const includeAdrs = input.includeAdrs !== false;
  const depth = normalizeBoundInt(input.depth, 1, 1, 4);
  const maxBytes = normalizeBoundInt(
    input.maxBytes,
    MAP_DEFAULT_MAX_BYTES,
    MAP_MIN_MAX_BYTES,
    MAP_MAX_MAX_BYTES,
  );

  // When a dotted domain filter is passed directly, let Prolog narrow before
  // transfer. Otherwise load all subjects once so we can detect strippedRoot
  // and resolve shorthand areas (e.g. domain:"discovery" -> "kibi.discovery").
  const prologDomain =
    domain !== undefined && domain.includes(".")
      ? toPrologAtom(domain)
      : "none";
  const includeAdrsAtom = includeAdrs ? "true" : "false";
  const goal = `discovery:kb_map_json(${prologDomain}, ${includeAdrsAtom}, JsonString)`;
  const raw = await runOperationJsonQuery<RawPrologMapPayload>(
    prolog,
    "discovery.pl",
    goal,
    "KB orientation map",
  );

  const rawOverview = Array.isArray(raw.overview)
    ? (raw.overview as RawOverviewEntry[])
    : [];
  const rawAdrs = Array.isArray(raw.adrs) ? (raw.adrs as RawAdrRow[]) : [];
  const rawSubjects = Array.isArray(raw.subjects)
    ? (raw.subjects as RawSubjectRow[])
    : [];

  const bodies = new Map<string, Promise<string | null>>();
  const overviewEntries = await Promise.all(
    rawOverview.map((entry) => readOverviewEntry(entry, workspaceRoot, bodies)),
  );
  const decisions = await Promise.all(
    rawAdrs.map((entry) => readDecisionEntry(entry, workspaceRoot, bodies)),
  );

  const strippedRoot =
    domain === undefined || !domain.includes(".")
      ? detectDominantRoot(rawSubjects)
      : undefined;

  const buckets = new Map<string, MutableAreaBucket>();
  const matchedAreaReqs = new Set<string>();

  for (const subject of rawSubjects) {
    const key = asString(subject.key).trim();
    if (!key) continue;

    let displaySegments: string[];
    let areaCanonicalPrefix: string;
    if (domain !== undefined) {
      const zoom = resolveZoomMatch(key, domain, strippedRoot);
      if (zoom === null) continue;
      areaCanonicalPrefix = zoom.matchedPrefix;
      displaySegments =
        zoom.relativeSegments.length === 0
          ? [zoom.matchedPrefix]
          : zoom.relativeSegments;
    } else if (strippedRoot !== undefined) {
      const stripped = stripLeadingSegment(key, strippedRoot);
      if (stripped.length === 0) {
        areaCanonicalPrefix = strippedRoot;
        displaySegments = [strippedRoot];
      } else {
        areaCanonicalPrefix = `${strippedRoot}.${stripped.slice(0, depth).join(".")}`;
        displaySegments = stripped;
      }
    } else {
      displaySegments = key.split(".");
      areaCanonicalPrefix = displaySegments.slice(0, depth).join(".");
    }

    const displayKey =
      displaySegments.length === 1 && domain !== undefined && displaySegments[0] === areaCanonicalPrefix
        ? domain
        : displaySegments.slice(0, depth).join(".");
    const exactCanonicalKey =
      domain !== undefined && displayKey === domain
        ? areaCanonicalPrefix
        : domain !== undefined
          ? `${areaCanonicalPrefix}.${displayKey}`
          : strippedRoot !== undefined && displayKey !== strippedRoot
            ? `${strippedRoot}.${displayKey}`
            : displayKey;

    let bucket = buckets.get(displayKey);
    if (!bucket) {
      bucket = {
        key: displayKey,
        exactCanonicalKey,
        reqIds: new Set(),
        firmReqs: new Map(),
        mustReqIds: new Set(),
        adrIds: new Set(),
        codeRootCounts: new Map(),
        subdomains: new Set(),
      };
      buckets.set(displayKey, bucket);
    }

    if (key === exactCanonicalKey && subject.defined === true) {
      bucket.exactDefinedSubject = subject;
    }
    if (displaySegments.length > depth && displaySegments[depth]) {
      bucket.subdomains.add(displaySegments[depth]);
    }

    for (const reqId of asStrings(subject.requirementIds)) {
      bucket.reqIds.add(reqId);
      matchedAreaReqs.add(reqId);
    }
    if (Array.isArray(subject.firmReqs)) {
      for (const req of subject.firmReqs as { id?: unknown; title?: unknown }[]) {
        const reqId = asString(req.id);
        if (reqId) bucket.firmReqs.set(reqId, asString(req.title));
      }
    }
    for (const reqId of asStrings(subject.mustReqIds)) {
      bucket.mustReqIds.add(reqId);
    }
    for (const adrId of asStrings(subject.adrIds)) {
      bucket.adrIds.add(adrId);
    }
    for (const file of asStrings(subject.codeFiles)) {
      const root = collapseCodeRoot(file);
      bucket.codeRootCounts.set(root, (bucket.codeRootCounts.get(root) ?? 0) + 1);
    }
  }

  const areas: MapArea[] = [...buckets.values()]
    .map((bucket) => {
      const defined = bucket.exactDefinedSubject !== undefined;
      const source = defined ? asString(bucket.exactDefinedSubject?.source) : "";
      const rawDef =
        defined && source
          ? readSubjectDefinition(workspaceRoot, source)
          : "";
      const definition = rawDef ? clip(rawDef, DEFINITION_EXCERPT_CHARS) : undefined;
      const sampleFirmRequirements = [...bucket.firmReqs.entries()]
        .sort((left, right) => compareCodeUnits(left[0], right[0]))
        .slice(0, 3)
        .map(([id, title]) => ({ id, title }));
      const subjectKey = defined ? bucket.exactCanonicalKey : undefined;
      return {
        key: bucket.key,
        ...(subjectKey !== undefined ? { subjectKey } : {}),
        defined,
        ...(definition !== undefined ? { definition } : {}),
        requirementCount: bucket.reqIds.size,
        firmCount: bucket.firmReqs.size,
        mustCount: bucket.mustReqIds.size,
        adrIds: [...bucket.adrIds].sort(compareCodeUnits),
        codeRoots: sortCodeRoots(bucket.codeRootCounts),
        subdomains: [...bucket.subdomains].sort(compareCodeUnits).slice(0, 10),
        sampleFirmRequirements,
        ask: buildAskHint(bucket.key, subjectKey, defined),
      };
    })
    .sort((left, right) => {
      if (right.requirementCount !== left.requirementCount) {
        return right.requirementCount - left.requirementCount;
      }
      if (right.firmCount !== left.firmCount) {
        return right.firmCount - left.firmCount;
      }
      return compareCodeUnits(left.key, right.key);
    });

  const areaLinkCounts = new Map<string, number>();
  if (domain !== undefined) {
    for (const rawAdr of rawAdrs) {
      const adrId = asString(rawAdr.id);
      const count = asStrings(rawAdr.linkedReqIds).filter((reqId) =>
        matchedAreaReqs.has(reqId),
      ).length;
      areaLinkCounts.set(adrId, count);
    }
  }

  decisions.sort((left, right) => {
    if (domain !== undefined) {
      const leftLocal = areaLinkCounts.get(left.id) ?? 0;
      const rightLocal = areaLinkCounts.get(right.id) ?? 0;
      if (rightLocal !== leftLocal) return rightLocal - leftLocal;
    }
    if (right.linkedRequirementCount !== left.linkedRequirementCount) {
      return right.linkedRequirementCount - left.linkedRequirementCount;
    }
    const leftFirm = left.firmness === "firm" ? 1 : 0;
    const rightFirm = right.firmness === "firm" ? 1 : 0;
    if (rightFirm !== leftFirm) return rightFirm - leftFirm;
    return compareCodeUnits(left.id, right.id);
  });

  const gaps: MapGaps = {
    unanchoredCurrentReqs: asNonNegativeInt(raw.gaps?.unanchoredCurrentReqs),
    unanchoredSampleIds: asStrings(raw.gaps?.unanchoredSampleIds),
    unlinkedAcceptedAdrs: asNonNegativeInt(raw.gaps?.unlinkedAcceptedAdrs),
    unlinkedAdrIds: asStrings(raw.gaps?.unlinkedAdrIds),
    linkedSourceFiles: asNonNegativeInt(raw.gaps?.linkedSourceFiles),
  };

  const stats: MapStats = {
    currentRequirements: asNonNegativeInt(raw.stats?.currentRequirements),
    firmRequirements: asNonNegativeInt(raw.stats?.firmRequirements),
    acceptedAdrs: asNonNegativeInt(raw.stats?.acceptedAdrs),
    definedSubjects: asNonNegativeInt(raw.stats?.definedSubjects),
    scenarios: asNonNegativeInt(raw.stats?.scenarios),
    tests: asNonNegativeInt(raw.stats?.tests),
    linkedSourceFiles: asNonNegativeInt(raw.stats?.linkedSourceFiles),
  };

  const scope: MapScope = {
    branch: contextInfo.branch ?? null,
    snapshotId: asString(raw.scope?.snapshotId) || "unknown",
    syncedAt:
      typeof raw.scope?.syncedAt === "string" ? raw.scope.syncedAt : null,
  };

  const payload: MapPayload = {
    version: "kibi.map.v1",
    overview: {
      present: overviewEntries.length > 0,
      entries: overviewEntries,
    },
    ...(strippedRoot !== undefined ? { strippedRoot } : {}),
    areas,
    decisions,
    gaps,
    stats,
    scope,
    truncated: false,
    note: "These are the repository's accepted ADRs, firm rules, subject vocabulary, and ungoverned gaps. Ask exact terms with kb_search({query}) or inspect a subject or ADR directly with kb_query({id}) / kb_query({factKind:\"subject\", subjectKey:\"...\"}).",
    ...(contextInfo.branch !== undefined ? { branch: contextInfo.branch } : {}),
    ...(contextInfo.branchStore !== undefined
      ? { branchStore: contextInfo.branchStore }
      : {}),
  };

  return fitMapPayload(payload, maxBytes);
}
