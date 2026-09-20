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
  type OntologyMatchCandidate,
  type OntologyMatchContext,
  type OntologyPackV1,
  type PluginProviderStamp,
  type PredicateSchemaDefinition,
  validateOntologyMatchCandidate,
  validatePredicateSchema,
} from "kibi-plugin-sdk";

import { PluginResolutionError } from "./resolve-package.js";
import type {
  CapabilityModeResolution,
  CapabilityProviderBinding,
} from "./registry.js";

// implements REQ-capability-plugin-activation-disclosure-v1
export type StampedOntologyCandidate = OntologyMatchCandidate &
  Readonly<{
    packId: string;
    stamp: PluginProviderStamp;
  }>;

// implements REQ-capability-plugin-activation-disclosure-v1
export type ComposedOntologyCatalog = Readonly<{
  schemas: readonly PredicateSchemaDefinition[];
  stamps: readonly PluginProviderStamp[];
  /** Pack id → schema ids owned by that pack. */
  ownership: ReadonlyMap<string, ReadonlySet<string>>;
  /**
   * True when a replace pack successfully supplied the canonical catalog.
   * False when builtin was used because replace was absent or failed.
   */
  replaced: boolean;
  /** Host diagnostics (abstention vs failure, shadow notes). */
  diagnostics: readonly string[];
}>;

function candidateKey(candidate: OntologyMatchCandidate): string {
  return [candidate.schemaId, candidate.polarity, ...candidate.arguments].join(
    "\0",
  );
}

function packOwnedSchemas(
  binding: CapabilityProviderBinding<OntologyPackV1>,
): {
  schemas: PredicateSchemaDefinition[];
  owned: Set<string>;
} {
  const schemas = binding.capability
    .schemas()
    .map((schema) => validatePredicateSchema(schema));
  const owned = new Set(schemas.map((schema) => schema.schemaId));
  return { schemas, owned };
}

/**
 * Collect active ontology schemas with replace / augment / shadow semantics.
 * Schema id collisions across packs are rejected. Shadow packs do not alter
 * the canonical catalog.
 *
 * Replace semantics:
 * - A successful replace pack *replaces* the builtin provider catalog.
 * - Provider exception / invalid catalog construction falls back to builtin.
 * - Shadow packs are never merged into the canonical catalog.
 */
// implements REQ-capability-plugin-activation-disclosure-v1
export function composeOntologyCatalog(
  resolution: CapabilityModeResolution<OntologyPackV1>,
): ComposedOntologyCatalog {
  const stamps: PluginProviderStamp[] = [];
  const ownership = new Map<string, Set<string>>();
  const schemasById = new Map<string, PredicateSchemaDefinition>();
  const diagnostics: string[] = [];
  let replaced = false;

  const addPack = (
    binding: CapabilityProviderBinding<OntologyPackV1>,
  ): void => {
    const { schemas, owned } = packOwnedSchemas(binding);
    for (const schema of schemas) {
      const existing = schemasById.get(schema.schemaId);
      if (existing && existing.predicateName !== schema.predicateName) {
        throw new PluginResolutionError(
          "ONTOLOGY_SCHEMA_COLLISION",
          `Ontology schema id '${schema.schemaId}' collides across packs`,
        );
      }
      if (!existing) {
        schemasById.set(schema.schemaId, schema);
      }
      owned.add(schema.schemaId);
    }
    ownership.set(binding.capability.id, owned);
    stamps.push(binding.stamp);
  };

  if (resolution.replace) {
    try {
      addPack(resolution.replace);
      replaced = true;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      diagnostics.push(
        `replace ontology pack '${resolution.replace.pluginId}' failed catalog construction (${message}); falling back to builtin`,
      );
      addPack(resolution.builtin);
    }
  } else {
    addPack(resolution.builtin);
    for (const augment of resolution.augment) {
      addPack(augment);
    }
  }

  for (const shadow of resolution.shadow) {
    stamps.push(shadow.stamp);
  }

  return {
    schemas: [...schemasById.values()],
    stamps,
    ownership,
    replaced,
    diagnostics,
  };
}

function runPackMatches(
  binding: CapabilityProviderBinding<OntologyPackV1>,
  context: OntologyMatchContext,
  ownedSchemaIds: ReadonlySet<string>,
  packSchemas: readonly PredicateSchemaDefinition[],
  target: StampedOntologyCandidate[],
  seen: Set<string>,
  diagnostics: string[],
): "ok" | "abstained" | "failed" {
  let raw: readonly OntologyMatchCandidate[];
  try {
    raw = binding.capability.match(context);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    diagnostics.push(
      `ontology pack '${binding.capability.id}' match() threw: ${message}`,
    );
    return "failed";
  }

  if (!Array.isArray(raw)) {
    diagnostics.push(
      `ontology pack '${binding.capability.id}' match() returned a non-array; treating as provider failure`,
    );
    return "failed";
  }

  let accepted = 0;
  for (const entry of raw) {
    try {
      if (
        entry &&
        typeof entry === "object" &&
        "schemaId" in entry &&
        typeof (entry as { schemaId: unknown }).schemaId === "string" &&
        !ownedSchemaIds.has((entry as { schemaId: string }).schemaId)
      ) {
        diagnostics.push(
          `ontology pack '${binding.capability.id}' returned schema '${(entry as { schemaId: string }).schemaId}' it does not own; rejected`,
        );
        continue;
      }
      const candidate = validateOntologyMatchCandidate(entry, packSchemas);
      if (!ownedSchemaIds.has(candidate.schemaId)) {
        diagnostics.push(
          `ontology pack '${binding.capability.id}' returned schema '${candidate.schemaId}' it does not own; rejected`,
        );
        continue;
      }
      const key = candidateKey(candidate);
      if (seen.has(key)) continue;
      seen.add(key);
      target.push({
        ...candidate,
        packId: binding.capability.id,
        stamp: binding.stamp,
      });
      accepted += 1;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      diagnostics.push(
        `ontology pack '${binding.capability.id}' produced an invalid candidate: ${message}`,
      );
    }
  }

  if (raw.length === 0) {
    diagnostics.push(
      `ontology pack '${binding.capability.id}' abstained (valid empty match)`,
    );
    return "abstained";
  }

  if (accepted === 0 && raw.length > 0) {
    // Every candidate was invalid → treat as provider failure for replace fallback.
    diagnostics.push(
      `ontology pack '${binding.capability.id}' returned only invalid candidates`,
    );
    return "failed";
  }

  return "ok";
}

/**
 * Match ontology candidates across the active catalog.
 *
 * Replace abstention (`[]`) is *not* failure: it means the replacement pack
 * found no match and builtin must not run. Builtin fallback happens only on
 * provider exception / malformed output / invalid catalog construction.
 *
 * Shadow packs validate against their own schemas and use a separate dedupe
 * set so a canonical candidate never suppresses the corresponding shadow
 * comparison.
 */
// implements REQ-capability-plugin-activation-disclosure-v1
export function composeOntologyMatches(
  resolution: CapabilityModeResolution<OntologyPackV1>,
  context: OntologyMatchContext,
): Readonly<{
  canonical: readonly StampedOntologyCandidate[];
  shadow: readonly StampedOntologyCandidate[];
  stamps: readonly PluginProviderStamp[];
  replaced: boolean;
  diagnostics: readonly string[];
}> {
  const catalog = composeOntologyCatalog(resolution);
  const diagnostics = [...catalog.diagnostics];
  const canonical: StampedOntologyCandidate[] = [];
  const shadow: StampedOntologyCandidate[] = [];
  const canonicalSeen = new Set<string>();
  const shadowSeen = new Set<string>();

  const ownedFor = (
    binding: CapabilityProviderBinding<OntologyPackV1>,
  ): {
    owned: ReadonlySet<string>;
    schemas: readonly PredicateSchemaDefinition[];
  } => {
    const fromCatalog = catalog.ownership.get(binding.capability.id);
    if (fromCatalog) {
      const schemas = binding.capability
        .schemas()
        .map((schema) => validatePredicateSchema(schema));
      return { owned: fromCatalog, schemas };
    }
    // Shadow (or failed replace) packs are not in the canonical catalog.
    const { schemas, owned } = packOwnedSchemas(binding);
    return { owned, schemas };
  };

  if (resolution.replace) {
    const { owned, schemas } = ownedFor(resolution.replace);
    const outcome = runPackMatches(
      resolution.replace,
      context,
      owned,
      schemas,
      canonical,
      canonicalSeen,
      diagnostics,
    );
    if (outcome === "failed") {
      diagnostics.push(
        `replace ontology pack '${resolution.replace.pluginId}' match failed; falling back to builtin`,
      );
      const builtin = ownedFor(resolution.builtin);
      runPackMatches(
        resolution.builtin,
        context,
        builtin.owned,
        builtin.schemas,
        canonical,
        canonicalSeen,
        diagnostics,
      );
    } else if (outcome === "abstained") {
      diagnostics.push(
        `replace ontology pack '${resolution.replace.pluginId}' abstained; builtin match not consulted`,
      );
    }
  } else {
    const builtin = ownedFor(resolution.builtin);
    runPackMatches(
      resolution.builtin,
      context,
      builtin.owned,
      builtin.schemas,
      canonical,
      canonicalSeen,
      diagnostics,
    );
    for (const augment of resolution.augment) {
      const pack = ownedFor(augment);
      runPackMatches(
        augment,
        context,
        pack.owned,
        pack.schemas,
        canonical,
        canonicalSeen,
        diagnostics,
      );
    }
  }

  for (const shadowBinding of resolution.shadow) {
    const pack = ownedFor(shadowBinding);
    runPackMatches(
      shadowBinding,
      context,
      pack.owned,
      pack.schemas,
      shadow,
      shadowSeen,
      diagnostics,
    );
  }

  canonical.sort((a, b) => {
    const pack = a.packId.localeCompare(b.packId);
    if (pack !== 0) return pack;
    const schema = a.schemaId.localeCompare(b.schemaId);
    if (schema !== 0) return schema;
    const polarity = a.polarity.localeCompare(b.polarity);
    if (polarity !== 0) return polarity;
    return a.arguments.join("\0").localeCompare(b.arguments.join("\0"));
  });

  return {
    canonical,
    shadow,
    stamps: catalog.stamps,
    replaced: catalog.replaced,
    diagnostics,
  };
}
