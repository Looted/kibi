import type { Entity } from "./entities";
import type BaseRelationship from "./relationships";

export interface UpsertOperation {
  operation: "upsert";
  entity: Entity;
  relationships?: BaseRelationship[];
}

export interface DeleteOperation {
  operation: "delete";
  id: string;
}

export type ChangesetOperation = UpsertOperation | DeleteOperation;

export interface Changeset {
  operations: ChangesetOperation[];
  metadata?: {
    timestamp: string;
    author?: string;
    source?: string;
  };
}

export default Changeset;
