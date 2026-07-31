import { constants, type Stats } from "node:fs";
import {
  appendFile,
  lstat,
  mkdir,
  open,
  readFile,
  readdir,
  realpath,
} from "node:fs/promises";
import {
  basename,
  dirname,
  isAbsolute,
  join,
  relative,
  resolve,
} from "node:path";
import { ArtifactPathError } from "./artifact-path-error";
import {
  assertSuccess,
  removeAt,
  writeAtomicTextFile,
} from "./artifact-path-write";

export { ArtifactPathError } from "./artifact-path-error";

export type ArtifactRootMetadata = Readonly<{
  uid: number;
  mode: number;
  isDirectory: boolean;
  isSymbolicLink: boolean;
}>;

export type PrepareArtifactPathOptions = Readonly<{
  artifactRoot: string;
  sourceRoot: string;
  canonicalRoots?: readonly string[];
}>;

function isWithin(parent: string, candidate: string): boolean {
  const pathFromParent = relative(parent, candidate);
  return (
    pathFromParent === "" ||
    (!pathFromParent.startsWith("../") && !isAbsolute(pathFromParent))
  );
}

function currentEuid(): number {
  const euid = process.geteuid?.();
  if (euid === undefined)
    throw new ArtifactPathError("current euid unavailable");
  return euid;
}

export function validateArtifactRootMetadata(
  metadata: ArtifactRootMetadata,
  euid: number,
): void {
  if (metadata.isSymbolicLink)
    throw new ArtifactPathError("artifact root symlink");
  if (!metadata.isDirectory)
    throw new ArtifactPathError("artifact root is not a directory");
  if (metadata.uid !== euid)
    throw new ArtifactPathError("artifact root is not owned by current euid");
  if ((metadata.mode & 0o077) !== 0 || (metadata.mode & 0o700) !== 0o700)
    throw new ArtifactPathError("artifact root is not private");
}

function metadataFor(stats: Stats): ArtifactRootMetadata {
  return {
    uid: stats.uid,
    mode: stats.mode,
    isDirectory: stats.isDirectory(),
    isSymbolicLink: stats.isSymbolicLink(),
  };
}

async function lstatOrAbsent(path: string): Promise<Stats | undefined> {
  try {
    return await lstat(path);
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT")
      return undefined;
    throw error;
  }
}

export class ArtifactRootRequiredError extends ArtifactPathError {}

function assertDisjoint(
  artifactRoot: string,
  protectedRoots: readonly string[],
): void {
  if (
    protectedRoots.some(
      (protectedRoot) =>
        isWithin(artifactRoot, protectedRoot) ||
        isWithin(protectedRoot, artifactRoot),
    )
  ) {
    throw new ArtifactPathError("artifact root overlaps a protected root");
  }
}

async function physicalProtectedRoots(
  options: PrepareArtifactPathOptions,
): Promise<readonly string[]> {
  const roots = [await realpath(options.sourceRoot)];
  for (const canonicalRoot of options.canonicalRoots ?? []) {
    try {
      roots.push(await realpath(canonicalRoot));
    } catch (error) {
      if (error instanceof Error && "code" in error && error.code === "ENOENT")
        continue;
      throw error;
    }
  }
  return roots;
}

async function ensureArtifactDirectory(
  artifactRoot: string,
  protectedRoots: readonly string[],
): Promise<Readonly<{ path: string; metadata: Stats }>> {
  if ((await lstatOrAbsent(artifactRoot)) === undefined) {
    const parent = dirname(artifactRoot);
    const physicalParent = await realpath(parent);
    assertDisjoint(
      join(physicalParent, basename(artifactRoot)),
      protectedRoots,
    );
    validateArtifactRootMetadata(
      metadataFor(await lstat(parent)),
      currentEuid(),
    );
    await mkdir(artifactRoot, { mode: 0o700 });
  }

  const physicalRoot = await realpath(artifactRoot);
  assertDisjoint(physicalRoot, protectedRoots);
  const metadata = await lstat(artifactRoot);
  validateArtifactRootMetadata(metadataFor(metadata), currentEuid());
  for (const entry of await readdir(artifactRoot, { withFileTypes: true })) {
    if (entry.isSymbolicLink())
      throw new ArtifactPathError("artifact root contains a symlink");
  }
  return {
    path: physicalRoot,
    metadata,
  };
}

function assertDirectFileName(name: string): void {
  if (!/^[a-zA-Z0-9][a-zA-Z0-9._-]*$/.test(name)) {
    throw new ArtifactPathError("invalid artifact file name");
  }
}

export class ArtifactPath {
  #closed = false;

  private constructor(
    readonly path: string,
    private readonly directory: Awaited<ReturnType<typeof open>>,
  ) {}

  static async create(
    options: PrepareArtifactPathOptions,
  ): Promise<ArtifactPath> {
    const artifactRoot = resolve(options.artifactRoot);
    const protectedRoots = await physicalProtectedRoots(options);
    assertDisjoint(
      artifactRoot,
      protectedRoots.map((root) => resolve(root)),
    );
    const prepared = await ensureArtifactDirectory(
      artifactRoot,
      protectedRoots,
    );
    const directory = await open(
      prepared.path,
      constants.O_DIRECTORY | constants.O_NOFOLLOW | constants.O_RDONLY,
    );
    try {
      const opened = await directory.stat();
      if (
        opened.dev !== prepared.metadata.dev ||
        opened.ino !== prepared.metadata.ino
      ) {
        throw new ArtifactPathError("artifact root inode drift");
      }
      validateArtifactRootMetadata(metadataFor(opened), currentEuid());
      return new ArtifactPath(prepared.path, directory);
    } catch (error) {
      await directory.close();
      throw error;
    }
  }

  async readText(name: string): Promise<string> {
    if (this.#closed) throw new ArtifactPathError("artifact root is closed");
    assertDirectFileName(name);
    return await readFile(join(this.path, name), { encoding: "utf8" });
  }

  async appendText(name: string, text: string): Promise<void> {
    if (this.#closed) throw new ArtifactPathError("artifact root is closed");
    assertDirectFileName(name);
    const existing = await lstatOrAbsent(join(this.path, name));
    if (existing?.isSymbolicLink())
      throw new ArtifactPathError("artifact file symlink");
    await appendFile(join(this.path, name), text, { encoding: "utf8" });
  }

  async remove(name: string): Promise<void> {
    if (this.#closed) throw new ArtifactPathError("artifact root is closed");
    assertDirectFileName(name);
    assertSuccess(removeAt(this.directory.fd, name), "remove");
  }

  async writeText(name: string, text: string): Promise<void> {
    if (this.#closed) throw new ArtifactPathError("artifact root is closed");
    assertDirectFileName(name);
    const existing = await lstatOrAbsent(join(this.path, name));
    if (existing?.isSymbolicLink())
      throw new ArtifactPathError("artifact file symlink");
    if (existing !== undefined && !existing.isFile())
      throw new ArtifactPathError("artifact destination is not a file");

    await writeAtomicTextFile(this.directory, name, text);
  }

  async close(): Promise<void> {
    if (this.#closed) return;
    this.#closed = true;
    await this.directory.close();
  }
}

// implements REQ-skillopt-codex-optimization
export function prepareArtifactPath(
  options: PrepareArtifactPathOptions,
): Promise<ArtifactPath> {
  return ArtifactPath.create(options);
}
