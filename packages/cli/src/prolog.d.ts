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

export interface PrologOptions {
  swiplPath?: string;
  timeout?: number;
}
export interface QueryResult {
  success: boolean;
  bindings: Record<string, string>;
  error?: string;
}
export declare class PrologProcess {
  private process;
  private swiplPath;
  private timeout;
  private outputBuffer;
  private errorBuffer;
  private cache;
  private useOneShotMode;
  private attachedKbPath;
  constructor(options?: PrologOptions);
  start(): Promise<void>;
  private waitForReady;
  query(goal: string | string[]): Promise<QueryResult>;
  invalidateCache(): void;
  private isCacheableGoal;
  private queryOneShot;
  private execOneShot;
  private normalizeGoal;
  private extractBindings;
  private translateError;
  isRunning(): boolean;
  getPid(): number;
  terminate(): Promise<void>;
}
