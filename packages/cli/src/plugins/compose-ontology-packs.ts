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
}>;

function candidateKey(candidate: OntologyMatchCandidate): string {
  return [candidate.schemaId, candidate.polarity, ...candidate.arguments].join(
    "\0",
  );
}

/**
 * Collect active ontology schemas with replace / augment / shadow semantics.
 * Schema id collisions across packs are rejected. Shadow packs do not alter
 * the canonical catalog.
 */
// implements REQ-capability-plugin-activation-disclosure-v1
export function composeOntologyCatalog(
  resolution: CapabilityModeResolution<OntologyPackV1>,
): ComposedOntologyCatalog {
  const stamps: PluginProviderStamp[] = [];
  const ownership = new Map<string, Set<string>>();
  const schemasById = new Map<string, PredicateSchemaDefinition>();

  const addPack = (binding: CapabilityProviderBinding<OntologyPackV1>): void => {
    const schemas = binding.capability
      .schemas()
      .map((schema) => validatePredicateSchema(schema));
    const owned = new Set<string>();
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
    } catch {
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
  };
}

/**
 * Match ontology candidates across the active catalog. Shadow packs contribute
 * comparison-only candidates that callers may surface without mutation.
 */
// implements REQ-capability-plugin-activation-disclosure-v1
export function composeOntologyMatches(
  resolution: CapabilityModeResolution<OntologyPackV1>,
  context: OntologyMatchContext,
): Readonly<{
  canonical: readonly StampedOntologyCandidate[];
  shadow: readonly StampedOntologyCandidate[];
  stamps: readonly PluginProviderStamp[];
}> {
  const catalog = composeOntologyCatalog(resolution);
  const seen = new Set<string>();
  const canonical: StampedOntologyCandidate[] = [];
  const shadow: StampedOntologyCandidate[] = [];

  const runPack = (
    binding: CapabilityProviderBinding<OntologyPackV1>,
    target: StampedOntologyCandidate[],
  ): void => {
    let raw: readonly OntologyMatchCandidate[];
    try {
      raw = binding.capability.match(context);
    } catch {
      return;
    }
    for (const entry of raw) {
      try {
        const candidate = validateOntologyMatchCandidate(
          entry,
          catalog.schemas,
        );
        const key = candidateKey(candidate);
        if (seen.has(key)) continue;
        seen.add(key);
        target.push({
          ...candidate,
          packId: binding.capability.id,
          stamp: binding.stamp,
        });
      } catch {
        // Host rejects malformed candidates; continue with the rest.
      }
    }
  };

  if (resolution.replace) {
    const before = canonical.length;
    runPack(resolution.replace, canonical);
    if (canonical.length === before) {
      runPack(resolution.builtin, canonical);
    }
  } else {
    runPack(resolution.builtin, canonical);
    for (const augment of resolution.augment) {
      runPack(augment, canonical);
    }
  }

  for (const shadowBinding of resolution.shadow) {
    runPack(shadowBinding, shadow);
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
  };
}
