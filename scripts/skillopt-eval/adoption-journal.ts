import { createHash } from "node:crypto";
import { join } from "node:path";
import { z } from "zod";
import {
  type DurabilityObserver,
  type FileIdentity,
  durableNoReplace,
  durableReplace,
  readDurableText,
  readSecureFile,
} from "./adoption-durable";
import type { AdoptionPlan, RunMirrorSync } from "./adoption-types";
import { CANONICAL_SKILLS } from "./catalog";

export const ADOPTION_PHASES = [
  "prepared",
  "canonical-installed",
  "mirrors-synced",
  "receipt-installed",
] as const;

const PlanSchema = z
  .object({
    skill: z.enum(CANONICAL_SKILLS),
    canonicalPath: z.string().min(1),
    currentBodyHash: z.string().regex(/^[a-f0-9]{64}$/),
    candidateBodyHash: z.string().regex(/^[a-f0-9]{64}$/),
    mutationRequired: z.boolean(),
  })
  .strict();

const ReceiptSchema = PlanSchema.extend({
  status: z.enum(["adopted", "unchanged"]),
  adoptionId: z.string().regex(/^[a-f0-9]{64}$/),
}).strict();

const JournalSchema = z
  .object({
    adoptionId: z.string().regex(/^[a-f0-9]{64}$/),
    phase: z.enum(ADOPTION_PHASES),
    plan: PlanSchema,
    canonicalPath: z.string().min(1),
    canonicalBefore: z.string(),
    candidateMarkdown: z.string(),
    receiptJson: z.string(),
    receiptHash: z.string().regex(/^[a-f0-9]{64}$/),
  })
  .strict();

export type Journal = z.infer<typeof JournalSchema>;
export type ExactAdoptionReceipt = z.infer<typeof ReceiptSchema>;

export type ExactAdoptionDependencies = Readonly<{
  runMirrorSync: RunMirrorSync;
  durabilityObserver?: DurabilityObserver;
  afterPhase?: (phase: (typeof ADOPTION_PHASES)[number]) => Promise<void>;
}>;

export type ExactAdoptionInput = Readonly<{
  repoRoot: string;
  adoptionId: string;
  plan: AdoptionPlan;
  canonicalBefore: string;
  candidateMarkdown: string;
  canonicalIdentity: FileIdentity;
}>;

function sha256(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

export function journalPath(wal: string): string {
  return join(wal, "journal.json");
}

export function receiptPath(wal: string): string {
  return join(wal, "receipt.json");
}

export function terminalPath(wal: string): string {
  return join(wal, "terminal.json");
}

function receiptFor(input: ExactAdoptionInput): ExactAdoptionReceipt {
  return {
    ...input.plan,
    status: input.plan.mutationRequired ? "adopted" : "unchanged",
    adoptionId: input.adoptionId,
  };
}

export function terminalJson(journal: Journal): string {
  return `${JSON.stringify({ adoptionId: journal.adoptionId, receiptHash: journal.receiptHash })}\n`;
}

export async function readJournal(
  repoRoot: string,
  path: string,
): Promise<Journal> {
  const journal = JournalSchema.parse(
    JSON.parse(await readDurableText(repoRoot, path)),
  );
  const canonicalPath = join(
    repoRoot,
    "packages/cli/src/public/skills",
    journal.plan.skill,
    "SKILL.md",
  );
  if (
    journal.canonicalPath !== canonicalPath ||
    journal.plan.canonicalPath !== canonicalPath
  ) {
    throw new Error("adoption journal target mismatch");
  }
  return journal;
}

async function overwriteJournal(
  repoRoot: string,
  wal: string,
  journal: Journal,
  observer: DurabilityObserver | undefined,
): Promise<void> {
  const path = journalPath(wal);
  const existing = await readSecureFile(repoRoot, path);
  await durableReplace(
    repoRoot,
    path,
    `${JSON.stringify(journal)}\n`,
    existing.identity,
    observer,
  );
}

export async function advancePhase(
  repoRoot: string,
  wal: string,
  journal: Journal,
  phase: Journal["phase"],
  dependencies: ExactAdoptionDependencies,
): Promise<Journal> {
  const updated = { ...journal, phase };
  await overwriteJournal(
    repoRoot,
    wal,
    updated,
    dependencies.durabilityObserver,
  );
  await dependencies.afterPhase?.(phase);
  return updated;
}

export async function verifyInstalledReceipt(
  repoRoot: string,
  wal: string,
  journal: Journal,
): Promise<void> {
  const installed = await readDurableText(repoRoot, receiptPath(wal));
  if (
    installed !== journal.receiptJson ||
    sha256(installed) !== journal.receiptHash
  ) {
    throw new Error("adoption receipt mismatch");
  }
}

export async function installReceipt(
  repoRoot: string,
  wal: string,
  journal: Journal,
  dependencies: ExactAdoptionDependencies,
): Promise<void> {
  const installed = await durableNoReplace(
    repoRoot,
    receiptPath(wal),
    journal.receiptJson,
    dependencies.durabilityObserver,
  );
  if (!installed) await verifyInstalledReceipt(repoRoot, wal, journal);
}

export async function installTerminal(
  repoRoot: string,
  wal: string,
  journal: Journal,
  dependencies: ExactAdoptionDependencies,
): Promise<void> {
  const terminal = terminalJson(journal);
  const installed = await durableNoReplace(
    repoRoot,
    terminalPath(wal),
    terminal,
    dependencies.durabilityObserver,
  );
  throwIfTerminalMismatch(
    installed,
    (await readDurableText(repoRoot, terminalPath(wal))) === terminal,
  );
}

export function throwIfTerminalMismatch(
  installed: boolean,
  matches: boolean,
): void {
  if (!installed && !matches) throw new Error("adoption terminal mismatch");
}

export async function createJournal(
  input: ExactAdoptionInput,
  wal: string,
  dependencies: ExactAdoptionDependencies,
): Promise<Journal> {
  const receipt = receiptFor(input);
  const receiptJson = `${JSON.stringify(receipt)}\n`;
  const journal: Journal = {
    adoptionId: input.adoptionId,
    phase: "prepared",
    plan: input.plan,
    canonicalPath: input.plan.canonicalPath,
    canonicalBefore: input.canonicalBefore,
    candidateMarkdown: input.candidateMarkdown,
    receiptJson,
    receiptHash: sha256(receiptJson),
  };
  await durableNoReplace(
    input.repoRoot,
    join(wal, "canonical-before.md"),
    input.canonicalBefore,
    dependencies.durabilityObserver,
  );
  await durableNoReplace(
    input.repoRoot,
    journalPath(wal),
    `${JSON.stringify(journal)}\n`,
    dependencies.durabilityObserver,
  );
  await dependencies.afterPhase?.("prepared");
  return journal;
}

export function parseReceipt(receiptJson: string): ExactAdoptionReceipt {
  return ReceiptSchema.parse(JSON.parse(receiptJson));
}

export function isMissing(error: unknown): boolean {
  return error instanceof Error && "code" in error && error.code === "ENOENT";
}
