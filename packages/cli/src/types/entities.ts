export interface BaseEntity {
  id: string;
  title: string;
  status: string;
  created_at: string; // ISO 8601
  updated_at: string; // ISO 8601
  source: string; // URI
  tags?: string[];
  owner?: string;
  priority?: string;
  severity?: string;
  links?: string[];
  text_ref?: string;
}

export type Requirement = BaseEntity & { type: "req" };
export type Scenario = BaseEntity & { type: "scenario" };
export type TestEntity = BaseEntity & { type: "test" };
export type ADR = BaseEntity & { type: "adr" };
export type Flag = BaseEntity & { type: "flag" };
export type Event = BaseEntity & { type: "event" };
export type Symbol = BaseEntity & { type: "symbol" };
export type Fact = BaseEntity & { type: "fact" };

export type Entity =
  | Requirement
  | Scenario
  | TestEntity
  | ADR
  | Flag
  | Event
  | Symbol
  | Fact;
