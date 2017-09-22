# JSON Processing Functions

Postgres provides a number of functions for dealing with JSON values in SQL.

## `JSONB_ARRAY_LENGTH`

    Returns the length of a JSONB array:
    query T
    SELECT JSONB_ARRAY_LENGTH('[1, 2, 3]'::JSONB)
    ----
    3 

    Errors on scalars:
    statement error cannot get array length of a scalar
    SELECT JSONB_ARRAY_LENGTH('3'::JSONB)

    Errors on objects:
    statement error cannot get array length of a non-array
    SELECT JSONB_ARRAY_LENGTH('{"a": 1}'::JSONB)
    ----
    0

## `JSONB_EACH`

    Interprets an object as a set of key-value pairs
    query T
    SELECT key FROM JSONB_EACH('{"a": 1, "b": 2}')
    ----
    "a"
    "b"

    Interprets an object as a set of key-value pairs
    query T
    SELECT value FROM JSONB_EACH('{"a": 1, "b": 2}')
    ----
    1
    2

## `JSONB_EACH_TEXT`

    Interprets an object as a set of key-value pairs, returning values as TEXT
    query T
    SELECT value FROM JSONB_EACH('{"a": 1, "b": 2}')
    ----
    "1"
    "2"

## `JSONB_OBJECT_KEYS`

    Returns the set of keys in the JSONB object:
    query T
    SELECT * FROM JSON_OBJECT_KEYS('{"a": 1, "b": 2}')
    ----
    "a"
    "b"

## `JSONB_ARRAY_ELEMENTS`

    Is `unnest` for JSONB arrays:
    query T
    SELECT * FROM JSONB_ARRAY_ELEMENTS('[1, 2, 3]'::JSONB)
    ----
    1
    2
    3

## `JSONB_TYPEOF`

    Returns 'number' for number JSONB values:
    query T
    SELECT JSONB_TYPEOF('1'::JSONB)
    ----
    "number"

    Returns 'string' for string JSONB values:
    query T
    SELECT JSONB_TYPEOF('"hello"'::JSONB)
    ----
    "string"

    Returns 'boolean' for `true`:
    query T
    SELECT JSONB_TYPEOF('true'::JSONB)
    ----
    "boolean"

    Returns 'boolean' for `false`:
    query T
    SELECT JSONB_TYPEOF('false'::JSONB)
    ----
    "boolean"

    Returns 'null' for `null`:
    query T
    SELECT JSONB_TYPEOF('null'::JSONB)
    ----
    "null"

    Returns 'array' for array JSONB values:
    query T
    SELECT JSONB_TYPEOF('[1,2,3]'::JSONB)
    ----
    "array"

    Returns 'object' for object JSONB values:
    query T
    SELECT JSONB_TYPEOF('{"a": 1}'::JSONB)
    ----
    "object"

## `JSONB_STRIP_NULLS`

    Removes fields with null values:
    query T
    SELECT JSONB_STRIP_NULLS('{"a": 1, "b":null}'::JSONB)
    ----
    {"a": 1}

## `JSONB_SET`

    Sets a value in a path:
    query T
    SELECT JSONB_SET('{"a":{"b":1}}'::JSONB, '{a,b}'::TEXT[], '2'::JSONB)
    ----
    {"a":{"b":2}}

    Sets a value in a path, creating the key if it does not exist:
    query T
    SELECT JSONB_SET('{"a":{}}'::JSONB, '{a,b}'::TEXT[], '2'::JSONB)
    ----
    {"a":{"b":2}}

    Does not create deep paths:
    query T
    SELECT JSONB_SET('{}'::JSONB, '{a,b}'::TEXT[], '2'::JSONB)
    ----
    {}

    Does not create keys if `create_missing` is false:
    query T
    SELECT JSONB_SET('{"a":{}}'::JSONB, '{a,b}'::TEXT[], '2'::JSONB, false)
    ----
    {"a":{}}
