% Mutalog configuration for `bun run test:mutation:prolog`
% (scripts/run-prolog-mutation.pl). See docs/mutation-testing.md.
%
% The lane covers the logic IR interpreter, whose plunit file is hermetic.
% Like the Stryker lanes it gates at 100%: every mutant is killed or listed
% below as an equivalent.

mutate(["packages/core/src/logic_ir.pl"]).
tests(["packages/core/tests/logic_ir.plt"]).

% Each of these inserts a cut after the first goal of a non-last clause,
% where that goal is deterministic (maplist/3 over a deterministic
% predicate, format/3, a comparison, a type test, or a recursive call on a
% smaller term) and no later clause matches the same term. The cut can then
% change neither the answers nor their number, so no test can kill it.
% Ids carry line and column: after editing logic_ir.pl, rerun the lane and
% refresh this list from the survivors it reports.
ignore_mutants([
    "packages/core/src/logic_ir.pl:212:45:cut:1",
    "packages/core/src/logic_ir.pl:213:45:cut:1",
    "packages/core/src/logic_ir.pl:214:44:cut:1",
    "packages/core/src/logic_ir.pl:216:52:cut:1",
    "packages/core/src/logic_ir.pl:221:40:cut:1",
    "packages/core/src/logic_ir.pl:222:40:cut:1",
    "packages/core/src/logic_ir.pl:223:39:cut:1",
    "packages/core/src/logic_ir.pl:225:47:cut:1",
    "packages/core/src/logic_ir.pl:276:55:cut:1",
    "packages/core/src/logic_ir.pl:283:82:cut:1",
    "packages/core/src/logic_ir.pl:284:80:cut:1",
    "packages/core/src/logic_ir.pl:286:90:cut:1",
    "packages/core/src/logic_ir.pl:316:45:cut:1",
    "packages/core/src/logic_ir.pl:319:80:cut:1",
    "packages/core/src/logic_ir.pl:320:40:cut:1",
    "packages/core/src/logic_ir.pl:321:40:cut:1",
    "packages/core/src/logic_ir.pl:322:39:cut:1",
    "packages/core/src/logic_ir.pl:323:54:cut:1",
    "packages/core/src/logic_ir.pl:324:52:cut:1",
    "packages/core/src/logic_ir.pl:357:5:cut:1",
    "packages/core/src/logic_ir.pl:358:70:cut:1",
    "packages/core/src/logic_ir.pl:359:70:cut:1",
    "packages/core/src/logic_ir.pl:360:68:cut:1",
    "packages/core/src/logic_ir.pl:362:5:cut:1",
    "packages/core/src/logic_ir.pl:363:94:cut:1",
    "packages/core/src/logic_ir.pl:370:60:cut:1",
    "packages/core/src/logic_ir.pl:378:35:cut:1",
    "packages/core/src/logic_ir.pl:379:36:cut:1",
    "packages/core/src/logic_ir.pl:380:35:cut:1",
    "packages/core/src/logic_ir.pl:381:36:cut:1",
    "packages/core/src/logic_ir.pl:382:35:cut:1",
    "packages/core/src/logic_ir.pl:385:48:cut:1",
    "packages/core/src/logic_ir.pl:386:50:cut:1",
    "packages/core/src/logic_ir.pl:987:5:cut:1",
    "packages/core/src/logic_ir.pl:996:5:cut:1",
    "packages/core/src/logic_ir.pl:1098:5:cut:1",
    "packages/core/src/logic_ir.pl:1105:5:cut:1"
]).

thresholds(high(100), low(90), break(100)).
report_dir("reports/mutation/prolog").
