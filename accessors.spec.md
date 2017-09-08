# JSON Accessor Operators

Postgres's JSONB support provides various operators for accessing fields within JSON documents.

## The `->` and `->>` operators

We can access a specific field in a document using the `->` operator:

    Accessing object fields using `->`:
    query T
    SELECT '{"foo": "bar"}'::JSON->'foo'
    ----
    "bar"

    Accessing array indices using `->`:
    query T
    SELECT '["foo", "bar", "baz"]'::JSON->0
    ----
    "foo"

    `->` returns SQL NULL for missing keys:
    query T
    SELECT '{"bar":"baz"}'::JSON->'foo' IS NULL
    ----
    true

    `->` returns SQL NULL for missing indices:
    query T
    SELECT '["foo", "bar", "baz"]'::JSON->3 IS NULL
    ----
    true

    `->` can be chained:
    query T
    SELECT '{"foo":{"bar":"baz"}}'::JSON->'foo'->'bar'
    ----
    "baz"

    `->` cannot be used with a string to access an array index:
    query T
    SELECT '[1, 2, 3]'::JSON->'0'
    ----
    null

    `->` returns the given field as a JSON value:
    query T
    SELECT pg_typeof('{"foo": "bar"}'::JSON->'foo')
    ----
    "json"

    `->>` returns the given field as a text field, rather than as JSON:
    query T
    SELECT pg_typeof('{"foo": "bar"}'::JSON->>'foo')
    ----
    "text"

## The `#>` and `#>>` operators

Instead of chaining `->`, we can use `#>` with an array to access a path.

    Accessing object fields using `#>`:
    query T
    SELECT '{"foo": {"bar": "baz"}}'::JSON#>ARRAY['foo', 'bar']
    ----
    "baz"

    Accessing object fields using `#>` with a single value:
    query T
    SELECT '{"foo": {"bar": "baz"}}'::JSON#>ARRAY['foo']
    ----
    {"bar": "baz"}

    Accessing object fields using `#>` with an empty array:
    query T
    SELECT '{"foo": {"bar": "baz"}}'::JSON#>ARRAY[]::TEXT[]
    ----
    {"foo": {"bar": "baz"}}

Like `->>` vs. `->`, `#>>` returns the value as `TEXT` rather than `JSON`.

    Accessing object fields using `#>>`:
    query T
    SELECT pg_typeof('{"foo": {"bar": "baz"}}'::JSON#>>ARRAY['foo', 'bar'])
    ----
    "text"