% Module: units
% Deterministic unit canonicalization for property_value comparison.
%
% Authored values are stored unchanged. Checks canonicalize a numeric value to
% the base unit of its family before computing logical ground signatures and
% before contradiction, redundancy, or implication comparison, so "30 min" and
% "1800 s" share one comparable term. Only exact, fixed-ratio conversions are
% listed: calendar units (month, year) have no fixed length and stay as-is.
% Unknown units are never equated with anything but themselves.
%
% implements REQ-kibi-unit-canonicalization

:- module(units, [
    canonical_quantity/6,   % +ValueType, +Value, +Unit, -CanonType, -CanonValue, -CanonUnit
    unit_base/3             % ?Unit, -BaseUnit, -Factor
]).

% Aliases are grouped by unit family rather than by predicate.
:- discontiguous unit_symbol/3, unit_word/3.

%% unit_base(?Unit, -BaseUnit, -Factor)
% Factor converts one Unit into BaseUnit (Value * Factor). Symbols match
% exactly (case matters: MB is a megabyte, Mb is not listed); spelled-out words
% match case-insensitively. Ambiguous spellings (KB, Mb, bps, month, year) are
% deliberately absent so they are never silently equated.
unit_base(Unit, BaseUnit, Factor) :-
    unit_symbol(Unit, BaseUnit, Factor).
unit_base(Unit, BaseUnit, Factor) :-
    unit_word(Unit, BaseUnit, Factor).

% Duration family, base unit: s (second).
unit_symbol(ns, s, 1.0e-9).
unit_symbol(us, s, 1.0e-6).
unit_symbol(ms, s, 1.0e-3).
unit_symbol(s, s, 1).
unit_symbol(sec, s, 1).
unit_symbol(secs, s, 1).
unit_symbol(min, s, 60).
unit_symbol(mins, s, 60).
unit_symbol(h, s, 3600).
unit_symbol(hr, s, 3600).
unit_symbol(hrs, s, 3600).
unit_symbol(d, s, 86400).
unit_symbol(wk, s, 604800).
unit_word(nanosecond, s, 1.0e-9).
unit_word(nanoseconds, s, 1.0e-9).
unit_word(microsecond, s, 1.0e-6).
unit_word(microseconds, s, 1.0e-6).
unit_word(millisecond, s, 1.0e-3).
unit_word(milliseconds, s, 1.0e-3).
unit_word(second, s, 1).
unit_word(seconds, s, 1).
unit_word(minute, s, 60).
unit_word(minutes, s, 60).
unit_word(hour, s, 3600).
unit_word(hours, s, 3600).
unit_word(day, s, 86400).
unit_word(days, s, 86400).
unit_word(week, s, 604800).
unit_word(weeks, s, 604800).

% Data size family, base unit: byte. SI prefixes are decimal (kB = 1000 B);
% IEC prefixes are binary (KiB = 1024 B).
unit_symbol('B', byte, 1).
unit_symbol(kB, byte, 1000).
unit_symbol('MB', byte, 1000000).
unit_symbol('GB', byte, 1000000000).
unit_symbol('TB', byte, 1000000000000).
unit_symbol('KiB', byte, 1024).
unit_symbol('MiB', byte, 1048576).
unit_symbol('GiB', byte, 1073741824).
unit_symbol('TiB', byte, 1099511627776).
unit_word(byte, byte, 1).
unit_word(bytes, byte, 1).
unit_word(kilobyte, byte, 1000).
unit_word(kilobytes, byte, 1000).
unit_word(megabyte, byte, 1000000).
unit_word(megabytes, byte, 1000000).
unit_word(gigabyte, byte, 1000000000).
unit_word(gigabytes, byte, 1000000000).
unit_word(terabyte, byte, 1000000000000).
unit_word(terabytes, byte, 1000000000000).
unit_word(kibibyte, byte, 1024).
unit_word(kibibytes, byte, 1024).
unit_word(mebibyte, byte, 1048576).
unit_word(mebibytes, byte, 1048576).
unit_word(gibibyte, byte, 1073741824).
unit_word(gibibytes, byte, 1073741824).
unit_word(tebibyte, byte, 1099511627776).
unit_word(tebibytes, byte, 1099511627776).

% Percentage family, base unit: percent.
unit_symbol('%', percent, 1).
unit_word(percent, percent, 1).
unit_word(percentage, percent, 1).
unit_word(pct, percent, 1).
unit_word(basis_point, percent, 0.01).
unit_word(basis_points, percent, 0.01).

%% canonical_quantity(+ValueType, +Value, +Unit, -CanonType, -CanonValue, -CanonUnit)
% Numeric values with a known unit are converted to the family base unit.
% Integral numeric results are represented as int so int/number spellings of
% the same quantity compare equal. Non-numeric values and unknown units pass
% through unchanged.
canonical_quantity(ValueType, Value, Unit, CanonType, CanonValue, CanonUnit) :-
    numeric_value_type(ValueType),
    number(Value),
    !,
    (   known_unit(Unit, BaseUnit, Factor)
    ->  Scaled is Value * Factor,
        CanonUnit = BaseUnit
    ;   Scaled = Value,
        CanonUnit = Unit
    ),
    canonical_number(Scaled, CanonType, CanonValue).
canonical_quantity(ValueType, Value, Unit, ValueType, Value, Unit).

numeric_value_type(int).
numeric_value_type(number).

known_unit(Unit, BaseUnit, Factor) :-
    atom(Unit),
    Unit \== '',
    (   unit_symbol(Unit, BaseUnit, Factor)
    ->  true
    ;   downcase_atom(Unit, Lower),
        unit_word(Lower, BaseUnit, Factor)
    ),
    !.

% Round away binary floating-point noise (0.1 h * 3600 = 360.00000000000006)
% before deciding whether the canonical value is integral.
canonical_number(Value, Type, Canonical) :-
    Rounded is round(Value * 1.0e9) / 1.0e9,
    (   Rounded =:= round(Rounded)
    ->  Type = int,
        Canonical is integer(round(Rounded))
    ;   Type = number,
        Canonical is float(Rounded)
    ).
