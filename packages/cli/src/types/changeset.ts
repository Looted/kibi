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
