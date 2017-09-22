# CockroachDB JSONB Spec

This repo defines in more detail the behaviour of JSONB as it will exist in
Cockroach, verified against a running Postgres instance.

## Running the tests

Running
```
$ node run.js *.spec.md
```
should print out
```
# JSON Accessor Operators
  # The `->` and `->>` operators
    ✔  Accessing object fields using `->`
    ✔  Accessing array indices using `->`
    ✔  `->` returns SQL NULL for missing keys
    ...
```
in addition to all the other tests.
