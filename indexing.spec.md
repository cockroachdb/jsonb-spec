# Indexing JSON Documents

This document summarizes the types of indexing provided by Postgres's JSONB column and MongoDB.

## Postgres

There are two primary types of indexes one could want to use with a JSONB
column.

    Creating a table with a JSONB column:
    statement ok
    CREATE TABLE t (
      id INT PRIMARY KEY,
      data JSONB
    )

    Inserting JSONB documents:
    statement ok
    INSERT INTO t VALUES
      (0, '{"foo": 1,  "bar": 2}'),
      (1, '{"foo": 2,  "bar": "x", "baz": "hello"}'),
      (2, '{"foo": -1, "goo": "hi"}'),
      (3, '{"foo": -2, "bup": [1,2,3]}')

### Computed index on a specified field

This is not specfic to JSONB columns, but is an special case of Postgres's
existing support for computed indexes:

    Adding a computed index to a JSONB field:
    statement ok
    CREATE INDEX foo_idx ON t ((data->>'foo'))

We can now efficiently query `foo` fields on JSONB documents stored in the
`data` column (as if `foo` were just a column in the table that we put an index
on).

This is the easiest form of index to support today in Cockroach, however, it is
also one of the least useful in terms of bringing new functionality to the
table with JSON documents.
Consider Heroic's use case.
They effectively have a single column containing JSON documents of various
different shapes, which they do not have much control over (their users can
store whatever they want as JSON documents).
This means that in a given table, half of their documents might represent one
type of value, and half of them might represent another type of value. This
means that an index on a specific field would result in a lot of wasted
indexing, and they would rather simply be able to query on arbitrary fields,
due to the unknown nature of the documents they're storing.
This brings us to Postgres's second main form of indexing on JSON.

### GIN Indexes

GIN indexes are Generalized Inverted Indexes.
They were originally developed to support full-text search in Postgres, but
they are generalized in the sense that they can be used with other data types
as well (in particular ARRAYs and JSONB documents).

The idea with GIN indexes (and inverted indexes in general) is that some datums
can be split up into some number of sub-items which can then be queried upon.
In the case of full-text search, this refers to the individual words in a
string, in an ARRAY, it refers to the elements, in the case of a JSON document,
it refers to the subobjects within that document.

    Adding a GIN index to a JSONB field:
    statement ok
    CREATE INDEX gin_idx ON t USING GIN (data)

This optimizes queries on four JSON operations:

`?` - key exists,

    Querying with the `?` operator:
    query T
    SELECT id FROM t WHERE data ? 'goo'
    ----
    2

`?&` - all keys exist,

    Querying with the `?&` operator:
    query T
    SELECT id FROM t WHERE data ?& ARRAY['bar', 'baz']
    ----
    1

`?|` - some key exists,

    Querying with the `?|` operator:
    query T
    SELECT id FROM t WHERE data ?| ARRAY['bar', 'goo']
    ----
    0
    1
    2

and `@>` - path-value.

    Querying with the `@>` operator:
    query T
    SELECT id FROM t WHERE data @> '{"bar": "x"}'
    ----
    1

There is also a more restricted GIN indexing strategy that only supports the
`@>` operator (for efficiency, if you don't need the other ones).

## MongoDB

Compared to Postgres, Mongo is much more based around JSON (more accurately,
BSON) from the ground up.
Despite this, their indexing seems a good bit more basic than Postgres's GIN.
There's a very good summary of their indexing [here](https://docs.mongodb.com/manual/indexes/).

Based on [Rethink's
docs](https://www.rethinkdb.com/api/javascript/index_create/) their indexing is
more or less identical to Mongo's.

### Single Field / Compound Field

This is the same as the Postgres "computed index on a specified field" section
above.
Simply allows indexing on a particular JSON field.
Compound fields are the same as SQL indexes with multiple columns.

### Multikey Indexes

This is the Mongo inverted index.
It allows you to query contents of an array field efficiently.
Interestingly, the API for creating a multikey index is exactly the same as for
creating a single field index - Mongo determines if the index should include a
multikey component if *any* of the "rows" have an array value for the specified field.

### Others

They support a handful of other types of indexing, but the above two are the
ones that are relevant to us.
