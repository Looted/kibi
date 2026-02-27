% Module: kibi_entities
% Entity type and property definitions for Kibi knowledge base
:- module(kibi_entities, [entity_type/1, entity_property/3, required_property/2, optional_property/2]).

% Entity types
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

% Documentation helpers
% list all entity types
all_entity_types(Ts) :- findall(T, entity_type(T), Ts).
