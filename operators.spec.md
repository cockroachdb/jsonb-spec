# JSONB Operators

Postgres supplies a number of operators for operating on JSON.

## Containment operator `@>`

These tests are lifted from the Postgres docs.

    Simple scalar/primitive values contain only the identical value:
    query B
    SELECT '"foo"'::JSONB @> '"foo"'::JSONB
    ----
    true

    The array on the right side is contained within the one on the left:
    query B
    SELECT '[1, 2, 3]'::JSONB @> '[1, 3]'::JSONB
    ----
    true

    Order of array elements is not significant, so this is also true:
    query B
    SELECT '[1, 2, 3]'::JSONB @> '[3, 1]'::JSONB
    ----
    true

    Duplicate array elements don't matter either:
    query B
    SELECT '[1, 2, 3]'::JSONB @> '[1, 2, 2]'::JSONB
    ----
    true

    The object with a single pair on the right side is contained within the object on the left side:
    query B
    SELECT '{"product": "PostgreSQL", "version": 9.4, "JSONB":true}'::JSONB @> '{"version":9.4}'::JSONB
    ----
    true

    The array on the right side is not considered contained within the array on the left, even though a similar array is nested within it:
    query B
    SELECT '[1, 2, [1, 3]]'::JSONB @> '[1, 3]'::JSONB
    ----
    false

    But with a layer of nesting, it is contained:
    query B
    SELECT '[1, 2, [1, 3]]'::JSONB @> '[[1, 3]]'::JSONB
    ----
    true

    Similarly, containment is not reported here:
    query B
    SELECT '{"foo": {"bar": "baz"}}'::JSONB @> '{"bar": "baz"}'::JSONB
    ----
    false

Also from the Postgres docs:
>The general principle is that the contained object must match the containing
>object as to structure and data contents, possibly after discarding some
>non-matching array elements or object key/value pairs from the containing
>object. But remember that the order of array elements is not significant when
>doing a containment match, and duplicate array elements are effectively
>considered only once.

>As a special exception to the general principle that the structures must match, an array may contain a primitive value:

    This array contains the primitive string value:
    query B
    SELECT '["foo", "bar"]'::jsonb @> '"bar"'::jsonb;
    ----
    true

    This exception is not reciprocal:
    query B
    SELECT '"bar"'::jsonb @> '["bar"]'::JSONB
    ----
    false
    
## Key exists operator `?`

    Operator is true if an object contains a top-level key:
    query B
    SELECT '{"foo": "bar"}'::JSONB ? 'foo'
    ----
    true

    Operator is false if an object does not contain a top-level key:
    query B
    SELECT '{"foo": {"bar": "baz"}}'::JSONB ? 'bar'
    ----
    false

    Operator is false on arrays:
    query B
    SELECT '[1, 2, 3]'::JSONB ? 'bar'
    ----
    false

    Operator is false on numbers:
    query B
    SELECT '2'::JSONB ? 'bar'
    ----
    false

## Any key exists operator `?|`

    Operator is true if an object contains any of a set of keys:
    query B
    SELECT '{"foo": "bar"}'::JSONB ?| ARRAY['foo', 'baz']
    ----
    true

    Operator is false if an object contains none of a set of keys:
    query B
    SELECT '{"foo": "bar"}'::JSONB ?| ARRAY['bup', 'baz']
    ----
    false

## All keys exist operator `?&`

    Operator is true if an object contains all of a set of keys:
    query B
    SELECT '{"foo": "bar", "baz": "bup"}'::JSONB ?| ARRAY['foo', 'baz']
    ----
    true

    Operator is false if an object does not contain all of a set of keys:
    query B
    SELECT '{"foo": "bar"}'::JSONB ?& ARRAY['foo', 'baz']
    ----
    false

## Append operator `||`

    Operator appends two JSONB arrays:
    query T
    SELECT '[1, 2, 3]'::JSONB || '[4, 5, 6]'::JSONB
    ----
    [1, 2, 3, 4, 5, 6]

    Performs insertion on non-array args on the right:
    query T
    SELECT '[1, 2, 3]'::JSONB || '4'::JSONB
    ----
    [1, 2, 3, 4]

    Performs insertion on non-array args on the left:
    query T
    SELECT '1'::JSONB || '[2, 3, 4]'::JSONB
    ----
    [1, 2, 3, 4]

    Creates an array when neither argument is an array:
    query T
    SELECT '1'::JSONB || '2'::JSONB
    ----
    [1, 2]

    Returns SQL NULL when given SQL NULL:
    query T
    SELECT '[1]'::JSONB || NULL::JSONB
    ----
    null

## Key removal operator `-` (text)

    Removes a key from an JSONB object:
    query T
    SELECT '{"foo": "bar", "baz": "bup"}'::JSONB - 'foo'
    ----
    {"baz": "bup"}

    Has no effect if the key is not present:
    query T
    SELECT '{"foo": "bar", "baz": "bup"}'::JSONB - 'asd'
    ----
    {"foo": "bar", "baz": "bup"}

    Has no effect on an array:
    query T
    SELECT '[1, 2, 3]'::JSONB - '1'
    ----
    [1, 2, 3]

    Errors if the object is not an object or array:
    statement error cannot delete from scalar
    SELECT '4'::JSONB - 'asd'

## Key removal operator `-` (integer)

    Errors on an object:
    statement error cannot delete from object using integer index
    SELECT '{"1": "bar", "baz": "bup"}'::JSONB - 1

    Removes an index from an array:
    query T
    SELECT '[1, 2, 3]'::JSONB - 1
    ----
    [1, 3]

    Removes an index from an array:
    query T
    SELECT '[1, 2, 3]'::JSONB - 1
    ----
    [1, 3]

    Counts from the end if given negative numbers
    query T
    SELECT '[1, 2, 3]'::JSONB - (-1)
    ----
    [1, 2]

    Errors if the object is not an object or array:
    statement error cannot delete from scalar
    SELECT '4'::JSONB - 'asd'

## Path removal operator `#-`

    Removes a path from an object:
    query T
    SELECT '["a", {"b":1}]'::JSONB #- ARRAY['1', 'b']
    ----
    ["a", {}]

    Has no effect if the path does not exist:
    query T
    SELECT '["a", {"b":1}]'::JSONB #- ARRAY['1', 'a']
    ----
    ["a", {"b":1}]

    Counts backwards if given negative numbers:
    query T
    SELECT '["a", {"b":1}]'::JSONB #- ARRAY['-1', 'a']
    ----
    ["a", {"b":1}]