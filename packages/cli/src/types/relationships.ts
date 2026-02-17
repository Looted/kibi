export interface BaseRelationship {
  type:
    | "depends_on"
    | "specified_by"
    | "verified_by"
    | "implements"
    | "covered_by"
    | "constrained_by"
    | "guards"
    | "publishes"
    | "consumes"
    | "relates_to";
  from: string; // entity ID
  to: string; // entity ID
  created_at?: string;
  created_by?: string;
  source?: string;
  confidence?: number;
}

export default BaseRelationship;
