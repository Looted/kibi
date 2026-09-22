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

import {
  type CapabilityId,
  KIBI_PLUGIN_API_VERSION,
  type KibiPluginV1,
  ONTOLOGY_PACK_CAPABILITY_ID,
  type OntologyPackV1,
  type PluginMode,
  type PluginPermissions,
  type PluginProviderStamp,
  type ProjectKibiConfig,
  type ProjectPluginEntry,
  SEMANTIC_CLASSIFIER_CAPABILITY_ID,
  SYMBOL_EXTRACTOR_CAPABILITY_ID,
  type SemanticClassifierV1,
  type SymbolExtractorV1,
  defineKibiPlugin,
  validateKibiPlugin,
} from "kibi-plugin-sdk";

import { type LoadPluginOptions, loadPluginPackage } from "./load-plugin.js";
import { readProjectKibiConfig } from "./project-config.js";
import { PluginResolutionError } from "./resolve-package.js";

// implements REQ-capability-plugin-activation-disclosure-v1
export type BuiltinPluginFactory = () => KibiPluginV1 | Promise<KibiPluginV1>;

// implements REQ-capability-plugin-activation-disclosure-v1
export type CapabilityProviderBinding<T> = Readonly<{
  pluginId: string;
  pluginVersion: string;
  packageName: string | null;
  mode: PluginMode | "builtin";
  permissions: PluginPermissions;
  external: boolean;
  capability: T;
  stamp: PluginProviderStamp;
}>;

// implements REQ-capability-plugin-activation-disclosure-v1
export type CapabilityModeResolution<T> = Readonly<{
  builtin: CapabilityProviderBinding<T>;
  /** At most one replace provider for this capability. */
  replace: CapabilityProviderBinding<T> | null;
  /** Augment providers in package.json activation order. */
  augment: readonly CapabilityProviderBinding<T>[];
  /** Shadow providers never participate in canonical results. */
  shadow: readonly CapabilityProviderBinding<T>[];
}>;

// implements REQ-capability-plugin-activation-disclosure-v1
export type CapabilityRegistryOptions = Readonly<{
  workspaceRoot: string;
  /** Injected builtin plugin; defaults to a local stub. */
  builtinFactory?: BuiltinPluginFactory;
  /** Pre-validated project config; skips package.json when provided. */
  projectConfig?: ProjectKibiConfig;
  /** Injectable project-config reader for tests. */
  readConfig?: (workspaceRoot: string) => ProjectKibiConfig;
  /** Injectable plugin loader for tests. */
  loadPlugin?: (
    workspaceRoot: string,
    packageName: string,
    options?: LoadPluginOptions,
  ) => Promise<Awaited<ReturnType<typeof loadPluginPackage>>>;
  loadPluginOptions?: LoadPluginOptions;
}>;

type CapabilitySlot = "semanticClassifier" | "ontologyPack" | "symbolExtractor";

const CAPABILITY_SLOT: Record<CapabilityId, CapabilitySlot> = {
  [SEMANTIC_CLASSIFIER_CAPABILITY_ID]: "semanticClassifier",
  [ONTOLOGY_PACK_CAPABILITY_ID]: "ontologyPack",
  [SYMBOL_EXTRACTOR_CAPABILITY_ID]: "symbolExtractor",
};

/**
 * Minimal builtin used when no factory is injected and the builtin package is
 * not yet wired. Satisfies kibi.plugin.v1 validation.
 */
// implements REQ-capability-plugin-activation-disclosure-v1
export function createStubBuiltinPlugin(): KibiPluginV1 {
  return validateKibiPlugin(
    defineKibiPlugin({
      apiVersion: KIBI_PLUGIN_API_VERSION,
      id: "kibi-plugin-builtin-stub",
      version: "0.0.0-stub",
      permissions: {
        network: false,
        metered: false,
        secrets: [],
      },
      capabilities: {
        semanticClassifier: {
          id: "kibi-plugin-builtin-stub.classifier",
          classify: () => ({ decisions: [] }),
        },
        ontologyPack: {
          id: "kibi-plugin-builtin-stub.ontology",
          schemas: () => [],
          match: () => [],
        },
        symbolExtractor: {
          id: "kibi-plugin-builtin-stub.symbols",
          supports: () => false,
          analyze: (input) => ({
            sourceFile: input.path,
            language: "unknown",
            module: {
              title: "stub",
              language: "unknown",
              analysisMode: "fallback",
              fallbackReason: "builtin_stub",
            },
            symbols: [],
          }),
        },
      },
    }),
  );
}

/** Default host builtin from the published kibi-plugin-builtin package. */
async function defaultBuiltinFactory(): Promise<KibiPluginV1> {
  const mod = (await import("kibi-plugin-builtin")) as {
    kibiPlugin?: KibiPluginV1;
    default?: KibiPluginV1;
  };
  const plugin = mod.kibiPlugin;
  if (!plugin) {
    throw new Error("kibi-plugin-builtin did not export kibiPlugin");
  }
  const validated = validateKibiPlugin(plugin);
  let packageVersion = validated.version;
  try {
    const { createRequire } = await import("node:module");
    const require = createRequire(import.meta.url);
    const builtinPackageJson = require("kibi-plugin-builtin/package.json") as {
      version?: string;
    };
    if (
      typeof builtinPackageJson.version === "string" &&
      builtinPackageJson.version.trim()
    ) {
      packageVersion = builtinPackageJson.version.trim();
    }
  } catch {
    // Fall back to the export version when package.json is not resolvable.
  }
  if (validated.version !== packageVersion) {
    throw new Error(
      `kibi-plugin-builtin export version '${validated.version}' does not match package.json version '${packageVersion}'`,
    );
  }
  return { ...validated, version: packageVersion };
}

// implements REQ-capability-plugin-activation-disclosure-v1
function stampFor(
  plugin: KibiPluginV1,
  capability: CapabilityId,
  mode: PluginMode | "builtin",
  external: boolean,
  model?: string,
): PluginProviderStamp {
  return {
    pluginId: plugin.id,
    pluginVersion: plugin.version,
    capability,
    mode: mode === "builtin" ? "augment" : mode,
    external,
    network: plugin.permissions.network,
    metered: plugin.permissions.metered,
    ...(model !== undefined ? { model } : {}),
  };
}

// implements REQ-capability-plugin-activation-disclosure-v1
function disclosedModel(capability: unknown): string | undefined {
  if (typeof capability !== "object" || capability === null) return undefined;
  if (!("model" in capability)) return undefined;
  const model = (capability as { model?: unknown }).model;
  return typeof model === "string" && model.trim() !== ""
    ? model.trim()
    : undefined;
}

function bindingFor<T>(
  plugin: KibiPluginV1,
  packageName: string | null,
  mode: PluginMode | "builtin",
  capabilityId: CapabilityId,
  capability: T,
): CapabilityProviderBinding<T> {
  const external = packageName !== null;
  return {
    pluginId: plugin.id,
    pluginVersion: plugin.version,
    packageName,
    mode,
    permissions: plugin.permissions,
    external,
    capability,
    stamp: stampFor(
      plugin,
      capabilityId,
      mode,
      external,
      disclosedModel(capability),
    ),
  };
}

function capabilityFromPlugin(
  plugin: KibiPluginV1,
  capabilityId: CapabilityId,
): SemanticClassifierV1 | OntologyPackV1 | SymbolExtractorV1 | undefined {
  const slot = CAPABILITY_SLOT[capabilityId];
  return plugin.capabilities[slot];
}

/**
 * Per-workspace capability registry. Builtin providers are always present;
 * configured packages load lazily the first time a capability is resolved.
 * Not a process-wide singleton — inject or construct per test/runtime.
 */
// implements REQ-capability-plugin-activation-disclosure-v1, REQ-capability-plugin-observable-behavior-v1
export class CapabilityRegistry {
  readonly workspaceRoot: string;
  private readonly builtinFactory: BuiltinPluginFactory;
  private readonly readConfig: (workspaceRoot: string) => ProjectKibiConfig;
  private readonly loadPlugin: NonNullable<
    CapabilityRegistryOptions["loadPlugin"]
  >;
  private readonly loadPluginOptions: LoadPluginOptions | undefined;
  private readonly injectedConfig: ProjectKibiConfig | undefined;

  private builtinPluginPromise: Promise<KibiPluginV1> | undefined;
  private configPromise: Promise<ProjectKibiConfig> | undefined;
  private readonly loadedPackages = new Map<
    string,
    Promise<Awaited<ReturnType<typeof loadPluginPackage>>>
  >();
  private readonly capabilityCache = new Map<
    CapabilityId,
    Promise<CapabilityModeResolution<unknown>>
  >();

  constructor(options: CapabilityRegistryOptions) {
    this.workspaceRoot = options.workspaceRoot;
    this.builtinFactory = options.builtinFactory ?? defaultBuiltinFactory;
    this.readConfig = options.readConfig ?? readProjectKibiConfig;
    this.loadPlugin = options.loadPlugin ?? loadPluginPackage;
    this.loadPluginOptions = options.loadPluginOptions;
    this.injectedConfig = options.projectConfig;
  }

  async getBuiltinPlugin(): Promise<KibiPluginV1> {
    this.builtinPluginPromise ??= Promise.resolve(this.builtinFactory()).then(
      (plugin) => validateKibiPlugin(plugin),
    );
    return this.builtinPluginPromise;
  }

  async getProjectConfig(): Promise<ProjectKibiConfig> {
    if (this.injectedConfig !== undefined) {
      return this.injectedConfig;
    }
    this.configPromise ??= Promise.resolve(this.readConfig(this.workspaceRoot));
    return this.configPromise;
  }

  async resolveSemanticClassifiers(): Promise<
    CapabilityModeResolution<SemanticClassifierV1>
  > {
    return this.resolveCapability(SEMANTIC_CLASSIFIER_CAPABILITY_ID) as Promise<
      CapabilityModeResolution<SemanticClassifierV1>
    >;
  }

  async resolveOntologyPacks(): Promise<
    CapabilityModeResolution<OntologyPackV1>
  > {
    return this.resolveCapability(ONTOLOGY_PACK_CAPABILITY_ID) as Promise<
      CapabilityModeResolution<OntologyPackV1>
    >;
  }

  async resolveSymbolExtractors(): Promise<
    CapabilityModeResolution<SymbolExtractorV1>
  > {
    return this.resolveCapability(SYMBOL_EXTRACTOR_CAPABILITY_ID) as Promise<
      CapabilityModeResolution<SymbolExtractorV1>
    >;
  }

  async resolveCapability(
    capabilityId: CapabilityId,
  ): Promise<CapabilityModeResolution<unknown>> {
    const cached = this.capabilityCache.get(capabilityId);
    if (cached) return cached;

    const promise = this.buildCapabilityResolution(capabilityId);
    this.capabilityCache.set(capabilityId, promise);
    try {
      return await promise;
    } catch (error) {
      this.capabilityCache.delete(capabilityId);
      throw error;
    }
  }

  /**
   * Canonical providers only (builtin + optional replace + augment).
   * Shadow bindings are excluded.
   */
  canonicalProviders<T>(
    resolution: CapabilityModeResolution<T>,
  ): readonly CapabilityProviderBinding<T>[] {
    if (resolution.replace) {
      return [resolution.replace, ...resolution.augment];
    }
    return [resolution.builtin, ...resolution.augment];
  }

  private async buildCapabilityResolution(
    capabilityId: CapabilityId,
  ): Promise<CapabilityModeResolution<unknown>> {
    const builtinPlugin = await this.getBuiltinPlugin();
    const builtinCapability = capabilityFromPlugin(builtinPlugin, capabilityId);
    if (!builtinCapability) {
      throw new PluginResolutionError(
        "BUILTIN_MISSING_CAPABILITY",
        `Builtin plugin '${builtinPlugin.id}' does not provide ${capabilityId}`,
      );
    }

    const builtin = bindingFor(
      builtinPlugin,
      null,
      "builtin",
      capabilityId,
      builtinCapability,
    );

    const config = await this.getProjectConfig();
    const entries = config.plugins ?? [];
    const relevant = entries.filter(
      (entry) => entry.capabilities[capabilityId] !== undefined,
    );

    let replace: CapabilityProviderBinding<unknown> | null = null;
    const augment: CapabilityProviderBinding<unknown>[] = [];
    const shadow: CapabilityProviderBinding<unknown>[] = [];
    const pluginIds = new Map<string, string>([
      [builtinPlugin.id, "kibi-plugin-builtin"],
    ]);
    const providerIds = new Set<string>([
      capabilityFromPlugin(builtinPlugin, capabilityId)?.id ?? builtinPlugin.id,
    ]);

    for (const entry of relevant) {
      const modeConfig = entry.capabilities[capabilityId];
      if (!modeConfig) continue;
      const loaded = await this.ensurePackageLoaded(entry);
      const owner = pluginIds.get(loaded.plugin.id);
      if (owner !== undefined && owner !== entry.package) {
        throw new PluginResolutionError(
          "DUPLICATE_PLUGIN_ID",
          `Plugin id '${loaded.plugin.id}' is claimed by both '${owner}' and '${entry.package}'`,
        );
      }
      pluginIds.set(loaded.plugin.id, entry.package);
      const capability = capabilityFromPlugin(loaded.plugin, capabilityId);
      if (!capability) {
        throw new PluginResolutionError(
          "PLUGIN_MISSING_CAPABILITY",
          `Plugin package '${entry.package}' is activated for ${capabilityId} but does not export that capability`,
        );
      }
      if ("id" in capability && typeof capability.id === "string") {
        if (providerIds.has(capability.id)) {
          throw new PluginResolutionError(
            "DUPLICATE_PROVIDER_ID",
            `Provider id '${capability.id}' for ${capabilityId} is not unique`,
          );
        }
        providerIds.add(capability.id);
      }
      const binding = bindingFor(
        loaded.plugin,
        entry.package,
        modeConfig.mode,
        capabilityId,
        capability,
      );
      if (modeConfig.mode === "replace") {
        if (replace !== null) {
          throw new PluginResolutionError(
            "MULTIPLE_REPLACE_PROVIDERS",
            `At most one replace provider is allowed for ${capabilityId}; both '${replace.packageName}' and '${entry.package}' requested replace`,
          );
        }
        replace = binding;
      } else if (modeConfig.mode === "augment") {
        augment.push(binding);
      } else {
        shadow.push(binding);
      }
    }

    return { builtin, replace, augment, shadow };
  }

  private async ensurePackageLoaded(
    entry: ProjectPluginEntry,
  ): Promise<Awaited<ReturnType<typeof loadPluginPackage>>> {
    const existing = this.loadedPackages.get(entry.package);
    if (existing) return existing;

    const loadOptions = this.loadPluginOptions;
    const promise = this.loadPlugin(
      this.workspaceRoot,
      entry.package,
      loadOptions,
    );
    this.loadedPackages.set(entry.package, promise);
    try {
      return await promise;
    } catch (error) {
      if (this.loadedPackages.get(entry.package) === promise) {
        this.loadedPackages.delete(entry.package);
      }
      throw error;
    }
  }
}

/**
 * Explicit cache keyed by workspace root. Injectable — not a hidden global.
 */
// implements REQ-capability-plugin-activation-disclosure-v1
export class CapabilityRegistryCache {
  private readonly registries = new Map<string, CapabilityRegistry>();

  get(workspaceRoot: string): CapabilityRegistry | undefined {
    return this.registries.get(workspaceRoot);
  }

  getOrCreate(
    workspaceRoot: string,
    options?: Omit<CapabilityRegistryOptions, "workspaceRoot">,
  ): CapabilityRegistry {
    const existing = this.registries.get(workspaceRoot);
    if (existing) return existing;
    const registry = new CapabilityRegistry({
      workspaceRoot,
      ...options,
    });
    this.registries.set(workspaceRoot, registry);
    return registry;
  }

  set(workspaceRoot: string, registry: CapabilityRegistry): void {
    this.registries.set(workspaceRoot, registry);
  }

  clear(): void {
    this.registries.clear();
  }
}

// implements REQ-capability-plugin-activation-disclosure-v1
export function createCapabilityRegistry(
  options: CapabilityRegistryOptions,
): CapabilityRegistry {
  return new CapabilityRegistry(options);
}

// implements REQ-capability-plugin-activation-disclosure-v1
export function createCapabilityRegistryCache(): CapabilityRegistryCache {
  return new CapabilityRegistryCache();
}

// implements REQ-capability-plugin-activation-disclosure-v1
export type EnsureCapabilityRegistryOptions = CapabilityRegistryOptions & {
  readonly cache?: CapabilityRegistryCache;
};

/**
 * Lazily construct and cache a registry per workspace root.
 * Callers should supply a cache instance — there is no process-global store.
 */
// implements REQ-capability-plugin-activation-disclosure-v1
export function ensureCapabilityRegistry(
  workspaceRootOrOptions: string | EnsureCapabilityRegistryOptions,
  options?: Omit<CapabilityRegistryOptions, "workspaceRoot"> & {
    readonly cache?: CapabilityRegistryCache;
  },
): CapabilityRegistry {
  if (typeof workspaceRootOrOptions === "string") {
    const { cache, ...registryOptions } = options ?? {};
    if (cache) {
      return cache.getOrCreate(workspaceRootOrOptions, registryOptions);
    }
    return new CapabilityRegistry({
      workspaceRoot: workspaceRootOrOptions,
      ...registryOptions,
    });
  }

  const { workspaceRoot, cache, ...registryOptions } = workspaceRootOrOptions;
  if (cache) {
    return cache.getOrCreate(workspaceRoot, registryOptions);
  }
  return new CapabilityRegistry({
    workspaceRoot,
    ...registryOptions,
  });
}
