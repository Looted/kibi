export declare const MANIFEST_FILE: "build-manifest.json";
export declare const MANIFEST_SCHEMA: "kibi.swipl-build.v1";
export declare const BUNDLED_BINARY_PATH: "bin/swipl";

export type PlatformKey =
  | "linux-x64-gnu"
  | "linux-arm64-gnu"
  | "darwin-arm64"
  | "darwin-x64"
  | "win32-x64";

export type PlatformPackage = {
  readonly package: string;
  readonly os: "linux" | "darwin" | "win32";
  readonly cpu: "x64" | "arm64";
  readonly libc?: "glibc";
  readonly binary: string;
};

export declare const PLATFORM_PACKAGES: Readonly<
  Record<PlatformKey, PlatformPackage>
>;

export declare function bundledBinaryPath(key: PlatformKey): string;
export declare function bundledBinaryPath(key: string): string | undefined;

export declare function platformKey(host: {
  platform: string;
  arch: string;
  /** True only for glibc Linux; musl and unknown libc have no bundle. */
  glibc?: boolean | undefined;
}): PlatformKey | undefined;

export declare function locatePlatformPackage(
  packageName: string,
  requireFrom?: { resolve(request: string): string },
): string | undefined;

export type BuildManifestValidation =
  | {
      ok: true;
      swiplVersion: string;
      binaryPath: string;
      binarySha256: string;
      home: string;
    }
  | { ok: false; reason: string };

export declare function validateBuildManifest(
  manifest: unknown,
  expected: { target: string; swiplVersion?: string | undefined },
): BuildManifestValidation;

export declare function sha256File(filePath: string): string;
