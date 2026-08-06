import { cp, mkdir, readdir, rm } from "node:fs/promises";
import { join } from "node:path";
import {
  assertSecureDirectory,
  durableReplace,
  ensureSecureDirectory,
  fsyncDirectory,
  readDurableText,
  readSecureFile,
} from "./adoption-durable";
import { recoverNoReplaceIntents } from "./adoption-intent";
import {
  type ExactAdoptionDependencies,
  type ExactAdoptionInput,
  type ExactAdoptionReceipt,
  type Journal,
  advancePhase,
  createJournal,
  installReceipt,
  installTerminal,
  isMissing,
  journalPath,
  parseReceipt,
  readJournal,
  receiptPath,
  terminalJson,
  terminalPath,
  verifyInstalledReceipt,
} from "./adoption-journal";

export type {
  ExactAdoptionDependencies,
  ExactAdoptionInput,
  ExactAdoptionReceipt,
} from "./adoption-journal";

function walRoot(repoRoot: string): string {
  return join(repoRoot, ".kibi", "adoption-wals");
}

function walDirectory(repoRoot: string, adoptionId: string): string {
  return join(walRoot(repoRoot), adoptionId);
}

async function synchronizeMirrors(
  repoRoot: string,
  wal: string,
  dependencies: ExactAdoptionDependencies,
): Promise<void> {
  const backups = join(wal, "mirror-backups");
  await ensureSecureDirectory(backups);
  for (const target of ["cursor", "codex"] as const) {
    const source = join(repoRoot, "packages", target, "skills");
    await assertSecureDirectory(source);
    const backup = join(backups, target);
    try {
      await assertSecureDirectory(backup);
    } catch (error) {
      if (
        !(error instanceof Error && "code" in error && error.code === "ENOENT")
      )
        throw error;
      await cp(source, backup, {
        recursive: true,
        dereference: false,
        errorOnExist: true,
      });
      await fsyncDirectory(backups);
    }
  }
  await fsyncDirectory(backups);
  await dependencies.runMirrorSync(repoRoot);
}

async function restorePreimages(
  repoRoot: string,
  wal: string,
  journal: Journal,
  dependencies: ExactAdoptionDependencies,
): Promise<void> {
  const canonical = await readSecureFile(repoRoot, journal.canonicalPath);
  if (canonical.bytes.toString("utf8") !== journal.canonicalBefore) {
    await durableReplace(
      repoRoot,
      journal.canonicalPath,
      journal.canonicalBefore,
      canonical.identity,
      dependencies.durabilityObserver,
    );
  }
  const backups = join(wal, "mirror-backups");
  try {
    await assertSecureDirectory(backups);
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT")
      return;
    throw error;
  }
  for (const target of ["cursor", "codex"] as const) {
    const source = join(repoRoot, "packages", target, "skills");
    const backup = join(backups, target);
    await assertSecureDirectory(backup);
    await rm(source, { recursive: true, force: true });
    await cp(backup, source, { recursive: true, dereference: false });
    await fsyncDirectory(join(repoRoot, "packages", target));
  }
}

async function completeJournal(
  repoRoot: string,
  wal: string,
  initial: Journal,
  dependencies: ExactAdoptionDependencies,
): Promise<ExactAdoptionReceipt> {
  let journal = initial;
  if (journal.phase === "prepared") {
    if (journal.plan.mutationRequired) {
      const current = await readSecureFile(repoRoot, journal.canonicalPath);
      if (current.bytes.toString("utf8") === journal.canonicalBefore) {
        await durableReplace(
          repoRoot,
          journal.canonicalPath,
          journal.candidateMarkdown,
          current.identity,
          dependencies.durabilityObserver,
        );
      } else if (current.bytes.toString("utf8") !== journal.candidateMarkdown) {
        throw new Error("adoption canonical bytes drifted");
      }
    }
    journal = await advancePhase(
      repoRoot,
      wal,
      journal,
      "canonical-installed",
      dependencies,
    );
  }
  if (journal.phase === "canonical-installed") {
    await synchronizeMirrors(repoRoot, wal, dependencies);
    journal = await advancePhase(
      repoRoot,
      wal,
      journal,
      "mirrors-synced",
      dependencies,
    );
  }
  if (journal.phase === "mirrors-synced") {
    await installReceipt(repoRoot, wal, journal, dependencies);
    journal = await advancePhase(
      repoRoot,
      wal,
      journal,
      "receipt-installed",
      dependencies,
    );
  }
  await installTerminal(repoRoot, wal, journal, dependencies);
  return parseReceipt(journal.receiptJson);
}

export async function recoverAdoptionWals(
  repoRoot: string,
  dependencies: ExactAdoptionDependencies,
): Promise<void> {
  const root = walRoot(repoRoot);
  await ensureSecureDirectory(root);
  for (const entry of await readdir(root, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const wal = join(root, entry.name);
    await assertSecureDirectory(wal);
    await recoverNoReplaceIntents(repoRoot, wal);
    const journal = await readJournal(repoRoot, journalPath(wal));
    let terminal: string | undefined;
    try {
      terminal = await readDurableText(repoRoot, terminalPath(wal));
    } catch (error) {
      if (!isMissing(error)) throw error;
    }
    if (terminal === undefined) {
      await restorePreimages(repoRoot, wal, journal, dependencies);
      await advancePhase(repoRoot, wal, journal, "prepared", dependencies);
      continue;
    }
    if (terminal !== terminalJson(journal))
      throw new Error("adoption terminal mismatch");
    await verifyInstalledReceipt(repoRoot, wal, journal);
  }
}

export async function executeExactAdoption(
  input: ExactAdoptionInput,
  dependencies: ExactAdoptionDependencies,
): Promise<ExactAdoptionReceipt> {
  const root = walRoot(input.repoRoot);
  await ensureSecureDirectory(root);
  const wal = walDirectory(input.repoRoot, input.adoptionId);
  try {
    await mkdir(wal, { mode: 0o700 });
    await fsyncDirectory(root);
    await createJournal(input, wal, dependencies);
  } catch (error) {
    if (
      !(error instanceof Error && "code" in error && error.code === "EEXIST")
    ) {
      throw error;
    }
  }
  return completeJournal(
    input.repoRoot,
    wal,
    await readJournal(input.repoRoot, journalPath(wal)),
    dependencies,
  );
}
