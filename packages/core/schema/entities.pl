% Module: kibi_entities
% Entity type and property definitions for Kibi knowledge base
:- module(kibi_entities, [entity_type/1, entity_property/3, required_property/2, optional_property/2]).

% Entity types
% implements REQ-004
entity_type(req).
entity_type(scenario).
entity_type(test).
entity_type(adr).
entity_type(flag).
entity_type(event).
entity_type(symbol).
entity_type(fact).

% entity_property(EntityType, Property, Type).
% Basic typing hints (atom, string, datetime, list, uri)
entity_property(_, id, atom).
entity_property(_, title, string).
entity_property(_, status, atom).
entity_property(_, created_at, datetime).
entity_property(_, updated_at, datetime).
entity_property(_, source, uri).

% Optional properties
entity_property(_, tags, list).
entity_property(_, owner, atom).
entity_property(_, priority, atom).
entity_property(_, severity, atom).
entity_property(_, links, list).
entity_property(_, text_ref, uri).
entity_property(_, sourceFile, uri).
entity_property(req, semantic_text, string).
entity_property(req, logic_claims, list).
entity_property(req, semantic_clauses, list).
entity_property(req, semantic_inventory_version, string).
entity_property(req, semantic_source_field, string).
entity_property(req, semantic_source_hash, string).
entity_property(req, semantic_inventory, list_or_json).

% Typed fact fields - only valid for fact entities
entity_property(fact, fact_kind, atom).
entity_property(fact, subject_key, string).
entity_property(fact, property_key, string).
entity_property(fact, operator, atom).
entity_property(fact, value_type, atom).
entity_property(fact, value_string, string).
entity_property(fact, value_int, integer).
entity_property(fact, value_number, number).
entity_property(fact, value_bool, boolean).
entity_property(fact, unit, string).
entity_property(fact, scope, string).
entity_property(fact, polarity, atom).
entity_property(fact, closed_world, boolean).
entity_property(fact, valid_from, datetime).
entity_property(fact, valid_to, datetime).
entity_property(fact, canonical_key, string).
entity_property(fact, claim_key, string).
entity_property(fact, claim_text, string).
entity_property(fact, predicate_name, string).
entity_property(fact, predicate_namespace, string).
entity_property(fact, predicate_arity, integer).
entity_property(fact, argument_names, list).
entity_property(fact, argument_types, list).
entity_property(fact, argument_descriptions, list).
entity_property(fact, aliases, list).
entity_property(fact, examples, list).
entity_property(fact, predicate_args, list).
entity_property(fact, rule_ir, string).
entity_property(fact, rule_hash, string).
% Rule schema references are JSON strings at the public boundary, but the
% Prolog peer represents entity identifiers as atoms.  Accept both forms so
% decoded rule facts validate without losing the typed reference.
entity_property(fact, rule_schema_id, atom_or_string).
entity_property(fact, rule_name, string).
entity_property(fact, semantic_key, string).
entity_property(fact, claim_span_start, integer).
entity_property(fact, claim_span_end, integer).

% Typed symbol metadata fields - only valid for symbol entities
entity_property(symbol, symbol_role, atom).
entity_property(symbol, granularity_reason, atom).
entity_property(symbol, sourceLine, integer).
entity_property(symbol, sourceColumn, integer).
entity_property(symbol, sourceEndLine, integer).
entity_property(symbol, sourceEndColumn, integer).

% Typed test verification fields - only valid for test entities
entity_property(test, verification_scope, atom).
entity_property(test, verification_perspective, atom).
entity_property(test, proof_contract, list_or_json).
entity_property(test, proof_bindings, string).
entity_property(test, proof_receipts, string).

% Required properties for all entity types
required_property(Type, id) :- entity_type(Type).
required_property(Type, title) :- entity_type(Type).
required_property(Type, status) :- entity_type(Type).
required_property(Type, created_at) :- entity_type(Type).
required_property(Type, updated_at) :- entity_type(Type).
required_property(Type, source) :- entity_type(Type).

% Optional properties for all entity types
optional_property(Type, tags) :- entity_type(Type).
optional_property(Type, owner) :- entity_type(Type).
optional_property(Type, priority) :- entity_type(Type).
optional_property(Type, severity) :- entity_type(Type).
optional_property(Type, links) :- entity_type(Type).
optional_property(Type, text_ref) :- entity_type(Type).
optional_property(req, semantic_text).
optional_property(req, logic_claims).
optional_property(req, semantic_clauses).
optional_property(req, semantic_inventory_version).
optional_property(req, semantic_source_field).
optional_property(req, semantic_source_hash).
optional_property(req, semantic_inventory).
optional_property(test, verification_scope).
optional_property(test, verification_perspective).
optional_property(test, proof_contract).
optional_property(test, proof_bindings).
optional_property(test, proof_receipts).

% Documentation helpers
% list all entity types
all_entity_types(Ts) :- findall(T, entity_type(T), Ts).
