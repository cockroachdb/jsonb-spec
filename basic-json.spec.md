# JSON Overview

This document describes the specification of JSONB types in CockroachDB.
JSONB types are a new column and result type that are supported by Postgres.

    Empty JSON value:
    query T
    SELECT '{}'::JSONB
    ----
    {}    

## Types of JSON values

There are, fundamentally, seven types a JSON value can take on.

`true`,

    Bare 'true' values:
    query T
    SELECT 'true'::JSONB
    ----
    true

`false`,

    Bare 'false' values:
    query T
    SELECT 'false'::JSONB
    ----
    false

`null`,

    Bare 'null' values:
    query T
    SELECT 'null'::JSONB
    ----
    null

`string`,

    String values:
    query T
    SELECT '"hello"'::JSONB
    ----
    "hello"

`number`,

    Number values:
    query T
    SELECT '3'::JSONB
    ----
    3

`array`,

    Array values:
    query T
    SELECT '[1,2,3]'::JSONB
    ----
    [1,2,3]

and finally `object`.

    Object values:
    query T
    SELECT '{"a":1,"b":2}'::JSONB
    ----
    {"a":1,"b":2}
