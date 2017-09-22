# JSONB Value Ordering

JSONB values have an ordering which is, for the most part, arbitrary.
It's unclear how closely we want to adhere to Postgres's semantics here.

## Inter-type comparisons

In particular, the orderings across types is especially arbitrary.

    Object > Array:
    query B
    SELECT '{}'::JSONB > '[1, 2, 3]'::JSONB
    ----
    true

    Array > Boolean:
    query B
    SELECT '[1, 2, 3]'::JSONB > 'true'::JSONB
    ----
    true

    Boolean > Number:
    query B
    SELECT 'true'::JSONB > '3'::JSONB
    ----
    true

    Number > String:
    query B
    SELECT '3'::JSONB > '"hello"'::JSONB
    ----
    true

    String > null:
    query B
    SELECT '"hello"'::JSONB > 'null'::JSONB
    ----
    true

    Exception, the empty array is < everything:
    query B
    SELECT '[]'::JSONB < '1'::JSONB
    ----
    true

## Objects

    Objects with fewer entries are < objects with more entries (0 vs. 1):
    query B
    SELECT '{}'::JSONB < '{"a": 1}'::JSONB
    ----
    true

    Objects with fewer entries are < objects with more entries (1 vs. 2):
    query B
    SELECT '{"a": 1}'::JSONB < '{"a": 1, "b": 2}'::JSONB
    ----
    true

    Object keys are compared in their Postgres "storage order" (shorter -> longer):
    query B
    SELECT '{"aa": 1, "c": 1}'::JSONB > '{"b": 1, "d": 1}'::JSONB
    ----
    true 

    Object keys are compared in their Postgres "storage order" (alphabetic):
    query B
    SELECT '{"a": 1, "c": 1}'::JSONB < '{"b": 1, "d": 1}'::JSONB
    ----
    true 

## Arrays

    Arrays with fewer entries are < arrays with more entries (0 vs. 1):
    query B
    SELECT '[]'::JSONB < '[1]'::JSONB
    ----
    true

    Arrays with fewer entries are < arrays with more entries (1 vs. 2):
    query B
    SELECT '[5]'::JSONB < '[0, 2]'::JSONB
    ----
    true

    Arrays sort lexicographically
    query B
    SELECT '[1, 2, 3]'::JSONB < '[1, 2, 4]'::JSONB
    ----
    true

## Booleans

    false < true:
    query B
    SELECT 'false'::JSONB < 'true'::JSONB
    ----
    true

## Numbers

    Numbers follow the expected ordering:
    query B
    SELECT '1'::JSONB < '2'::JSONB
    ----
    true

## Strings

    Strings are compared via the default database collation:
    query B
    SELECT '"abc"'::JSONB < '"x"'::JSONB
    ----
    true
