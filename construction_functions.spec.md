# JSON Construction Functions

There are two primary aggregate functions for constructing JSONB values.

## `JSONB_BUILD_ARRAY`

    Returns a JSONB array containing the values in the variadic argument list:
    query T
    SELECT JSONB_BUILD_ARRAY(1, 2, 3)
    ----
    [1, 2, 3]

    Arguments can have differing types:
    query T
    SELECT JSONB_BUILD_ARRAY(1, 'hello', '{1, 2}'::TEXT[])
    ----
    [1, "hello", [1, 2]]

## `JSONB_BUILD_OBJECT`

    Returns a JSONB object consisting of the alternating key-value pairs:
    query T
    SELECT JSONB_BUILD_OBJECT('a', 1, 'b', 2)
    ----
    {"a": 1, "b": 2}

## `JSONB_OBJECT`

    When given a single array, makes a JSONB object out of the alternating key-value pairs:
    query T
    SELECT JSONB_OBJECT('{a, b, c, d}')
    ----
    {"a": "b", "c": "d"}

    When given two arrays, treats the first as keys and the second as values:
    query T
    SELECT JSONB_OBJECT('{a, b}', '{c, d}')
    ----
    {"a": "c", "b": "d"}

## `JSONB_AGG`

    Collects values into a JSONB array:
    query T
    SELECT JSONB_AGG(i) FROM GENERATE_SERIES(1,5) i
    ----
    [1, 2, 3, 4, 5]

## `JSONB_OBJECT_AGG`

    Collects keys and values into a JSONB object:
    query T
    SELECT JSONB_OBJECT_AGG('key' || i::TEXT, i) FROM GENERATE_SERIES(1,5) i
    ----
    {"key1":1, "key2": 2, "key3": 3, "key4": 4, "key5": 5}

    Takes the last key seen
    query T
    SELECT JSONB_OBJECT_AGG('key' || i::TEXT, i) FROM GENERATE_SERIES(1,5) i
    ----
    {"key1":1, "key2": 2, "key3": 3, "key4": 4, "key5": 5}

    
