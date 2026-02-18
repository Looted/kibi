% Module: kb
% Core Knowledge Base module with RDF persistence and audit logging
:- module(kb, [
    kb_attach/1,
    kb_detach/0,
    kb_save/0,
    with_kb_mutex/1,
    kb_assert_entity/2,
    kb_retract_entity/1,
    kb_entity/3,
    kb_assert_relationship/4,
    kb_relationship/3,
    changeset/4  % Export for testing
]).

:- use_module(library(semweb/rdf11)).
:- use_module(library(persistency)).
:- use_module(library(thread)).
:- use_module(library(filesex)).
:- use_module('../schema/entities.pl', [entity_type/1, entity_property/3, required_property/2]).
:- use_module('../schema/relationships.pl', [relationship_type/1, valid_relationship/3]).
:- use_module('../schema/validation.pl', [validate_entity/2, validate_relationship/3]).

% RDF namespace for KB entities and relationships
:- rdf_register_prefix(kb, 'http://kibi.dev/kb/').
:- rdf_meta
    kb_entity(?, ?, ?),
    kb_relationship(?, ?, ?).

% Persistent audit log declaration
:- persistent
    changeset(timestamp:atom, operation:atom, entity_id:atom, data:any).

% Dynamic facts to track KB state
:- dynamic kb_attached/1.
:- dynamic kb_audit_db/1.
:- dynamic kb_graph/1.

%% kb_attach(+Directory)
% Attach to a KB directory with RDF persistence and file locking.
% Creates directory if it doesn't exist.
kb_attach(Directory) :-
    % Ensure directory exists
    (   exists_directory(Directory)
    ->  true
    ;   make_directory_path(Directory)
    ),
    % Create RDF graph name from directory
    atom_concat('file://', Directory, GraphURI),
    % Load existing RDF data if present
    atom_concat(Directory, '/kb.rdf', DataFile),
    (   exists_file(DataFile)
    ->  rdf_load(DataFile, [graph(GraphURI), silent(true)])
    ;   true
    ),
    % Set up audit log - only attach if not already attached
    atom_concat(Directory, '/audit.log', AuditLog),
    (   db_attached(AuditLog)
    ->  true  % Already attached
    ;   db_attach(AuditLog, [])
    ),
    % Track attachment state
    assert(kb_attached(Directory)),
    assert(kb_audit_db(AuditLog)),
    assert(kb_graph(GraphURI)).

%% kb_detach
% Safely detach from KB, flushing journals and closing audit log.
kb_detach :-
    (   kb_attached(Directory)
    ->  (
            kb_save,
            % Clear state
            retractall(kb_attached(_)),
            retractall(kb_audit_db(_)),
            retractall(kb_graph(_))
        )
    ;   true
    ).

%% kb_save
% Save RDF graph and sync audit log to disk
kb_save :-
    (   kb_attached(Directory)
    ->  (
            % Save RDF graph to file with namespace declarations
            (   kb_graph(GraphURI)
            ->  (
                    atom_concat(Directory, '/kb.rdf', DataFile),
                    rdf_save(DataFile, [graph(GraphURI), namespaces([kb, xsd])])
                )
            ;   true
            ),
            % Sync audit log
            (   kb_audit_db(_)
            ->  db_sync(_)
            ;   true
            )
        )
    ;   true
    ).

%% with_kb_mutex(+Goal)
% Execute Goal with KB mutex protection for thread safety.
with_kb_mutex(Goal) :-
    with_mutex(kb_lock, Goal).

%% kb_assert_entity(+Type, +Properties)
% Assert an entity into the KB with validation and audit logging.
% Properties is a list of Key=Value pairs.
kb_assert_entity(Type, Props) :-
    % Validate entity
    validate_entity(Type, Props),
    % Extract ID
    memberchk(id=Id, Props),
    % Get current graph
    kb_graph(Graph),
    % Execute with mutex protection
    with_kb_mutex((
        % Create entity URI
        atom_concat('kb:entity/', Id, EntityURI),
        % Store type as string literal to prevent URI interpretation
        atom_string(Type, TypeStr),
        rdf_assert(EntityURI, kb:type, TypeStr^^'http://www.w3.org/2001/XMLSchema#string', Graph),
        % Store all properties
        forall(
            member(Key=Value, Props),
            store_property(EntityURI, Key, Value, Graph)
        ),
        % Log to audit
        get_time(Timestamp),
        format_time(atom(TS), '%FT%T%:z', Timestamp),
        assert_changeset(TS, upsert, Id, Type-Props)
    )).

%% kb_retract_entity(+Id)
% Remove an entity from the KB with audit logging.
kb_retract_entity(Id) :-
    kb_graph(Graph),
    with_kb_mutex((
        % Create entity URI
        atom_concat('kb:entity/', Id, EntityURI),
        % Remove all triples for this entity
        rdf_retractall(EntityURI, _, _, Graph),
        % Log to audit
        get_time(Timestamp),
        format_time(atom(TS), '%FT%T%:z', Timestamp),
        assert_changeset(TS, delete, Id, null)
    )).

%% kb_entity(?Id, ?Type, ?Properties)
% Query entities from the KB.
% Properties is unified with a list of Key=Value pairs.
kb_entity(Id, Type, Props) :-
    kb_graph(Graph),
    % Find entity by pattern - use unquoted namespace term kb:type
    (   var(Id)
    ->  rdf(EntityURI, kb:type, TypeLiteral, Graph),
        atom_concat('kb:entity/', Id, EntityURI)
    ;   atom_concat('kb:entity/', Id, EntityURI),
        rdf(EntityURI, kb:type, TypeLiteral, Graph)
    ),
    % Extract type - convert string literal to atom
    literal_to_atom(TypeLiteral, Type),
    % Collect all properties (exclude kb:type which expands to full URI)
    findall(Key=Value, (
        rdf(EntityURI, PropURI, ValueLiteral, Graph),
        PropURI \= 'http://kibi.dev/kb/type',
        uri_to_key(PropURI, Key),
        literal_to_value(ValueLiteral, Value)
    ), Props).

%% kb_assert_relationship(+Type, +From, +To, +Metadata)
% Assert a relationship between two entities with validation.
kb_assert_relationship(RelType, FromId, ToId, _Metadata) :-
    kb_graph(Graph),
    % Validate entities exist and relationship is valid
    kb_entity(FromId, FromType, _),
    kb_entity(ToId, ToType, _),
    validate_relationship(RelType, FromType, ToType),
    % Execute with mutex protection
    with_kb_mutex((
        % Create entity URIs
        atom_concat('kb:entity/', FromId, FromURI),
        atom_concat('kb:entity/', ToId, ToURI),
        % Create relationship property URI (full URI to match saved/loaded RDF)
        atom_concat('http://kibi.dev/kb/', RelType, RelURI),
        % Assert relationship triple
        rdf_assert(FromURI, RelURI, ToURI, Graph),
        % Log to audit
        get_time(Timestamp),
        format_time(atom(TS), '%FT%T%:z', Timestamp),
        format(atom(RelId), '~w->~w', [FromId, ToId]),
        assert_changeset(TS, upsert_rel, RelId, RelType-[from=FromId, to=ToId])
    )).

%% kb_relationship(?Type, ?From, ?To)
% Query relationships from the KB.
kb_relationship(RelType, FromId, ToId) :-
    kb_graph(Graph),
    % Create relationship property URI (full URI to match loaded RDF)
    atom_concat('http://kibi.dev/kb/', RelType, RelURI),
    % Find matching relationships
    rdf(FromURI, RelURI, ToURI, Graph),
    % Extract IDs from URIs
    atom_concat('kb:entity/', FromId, FromURI),
    atom_concat('kb:entity/', ToId, ToURI).

% Helper predicates

%% store_property(+EntityURI, +Key, +Value, +Graph)
% Store a property as an RDF triple with appropriate datatype.
store_property(EntityURI, Key, Value, Graph) :-
    % Build full property URI
    atom_concat('http://kibi.dev/kb/', Key, PropURI),
    (   atom(Value)
    ->  % Atoms stored as URIs/resources (for status, id, etc.)
        rdf_assert(EntityURI, PropURI, Value, Graph)
    ;   % Other types as literals
        value_to_literal(Value, Literal),
        rdf_assert(EntityURI, PropURI, Literal, Graph)
    ).

%% value_to_literal(+Value, -Literal)
% Convert Prolog value to RDF literal with appropriate datatype.
value_to_literal(Value, Literal) :-
    (   string(Value)
    ->  Literal = Value^^'http://www.w3.org/2001/XMLSchema#string'
    ;   is_list(Value)
    ->  format(atom(ListStr), '~w', [Value]),
        Literal = ListStr^^'http://www.w3.org/2001/XMLSchema#string'
    ;   format(atom(Str), '~w', [Value]),
        Literal = Str^^'http://www.w3.org/2001/XMLSchema#string'
    ).

%% literal_to_value(+Literal, -Value)
% Extract value from RDF literal, parse list syntax back to Prolog lists.
literal_to_value(Literal, Value) :-
    (   % Handle ^^/2 functor (RDF typed literal shorthand)
        Literal = ^^(StrVal, 'http://www.w3.org/2001/XMLSchema#string')
    ->  (   % Try to parse as Prolog list term (handles both atoms and strings)
            (atom(StrVal) ; string(StrVal)),
            (atom_concat('[', _, StrVal) ; string_concat("[", _, StrVal)),
            catch(atom_to_term(StrVal, ParsedValue, []), _, fail),
            is_list(ParsedValue)
        ->  Value = ParsedValue
        ;   Value = StrVal
        )
    ;   Literal = ^^(Val, _)
    ->  Value = Val  % Other typed literals - extract value
    ;   Literal = literal(type('http://www.w3.org/2001/XMLSchema#string', StrVal))
    ->  (   % Try to parse as Prolog list term (handles both atoms and strings)
            (atom(StrVal) ; string(StrVal)),
            (atom_concat('[', _, StrVal) ; string_concat("[", _, StrVal)),
            catch(atom_to_term(StrVal, ParsedValue, []), _, fail),
            is_list(ParsedValue)
        ->  Value = ParsedValue
        ;   Value = StrVal
        )
    ;   Literal = literal(type(_, _))
    ->  Value = Literal  % Keep other typed literals as-is
    ;   Literal = literal(lang(_, Val))
    ->  Value = Val
    ;   Literal = literal(Value)
    ->  true
    ;   Value = Literal
    ).

%% literal_to_atom(+Literal, -Atom)
% Convert RDF literal to atom (for type field).
literal_to_atom(Literal, Atom) :-
    (   Literal = ^^(StringVal, _Type)
    ->  atom_string(Atom, StringVal)
    ;   Literal = literal(type(_, StringVal))
    ->  atom_string(Atom, StringVal)
    ;   Literal = literal(Value)
    ->  (atom(Value) -> Atom = Value ; atom_string(Atom, Value))
    ;   atom(Literal)
    ->  Atom = Literal
    ;   atom_string(Atom, Literal)
    ).

%% uri_to_key(+URI, -Key)
% Convert URI to property key (strip kb: namespace prefix).
uri_to_key(URI, Key) :-
    (   atom_concat('http://kibi.dev/kb/', Key, URI)
    ->  true
    ;   atom_concat('kb:', Key, URI)
    ->  true
    ;   URI = Key
    ).
