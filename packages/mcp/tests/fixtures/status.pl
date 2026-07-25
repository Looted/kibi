:- module(status, [kb_status_json/1]).

:- use_module(library(http/json)).

kb_status_json(JsonString) :-
    atom_json_dict(JsonString, json{
        branch:develop,
        snapshotId:'fixture:status',
        syncedAt:'2026-07-25T00:00:00Z',
        dirty:false,
        syncState:fresh,
        kbPath:'/tmp/kibi-status-fixture',
        lastSyncSource:fixture
    }, [as(string)]).
