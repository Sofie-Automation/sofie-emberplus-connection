# Canonical JSON representation of a Glow tree

This document is the single source of truth for the JSON form used to compare
Glow trees across implementations. Two independent converters implement it:

- `e2e/native/shim.cpp` — maps libember's DOM (decoded with
  `glow::GlowNodeFactory`) to/from this JSON
- `e2e/src/canonical.ts` — maps this repo's model classes (`src/model`) to/from
  this JSON

A differential test encodes a tree with one implementation, decodes it with the
other, converts to canonical JSON on both sides and deep-compares.

## General rules

- **Absent optional fields are omitted** — never `null`, never a default value.
  If a field was not present on the wire, it must not appear in the JSON.
- **Enums are canonicalised to their Glow wire integers** (the values that appear
  in the BER encoding), not to either implementation's names.
- **Binary data** (octet strings) is a lowercase hex string, e.g. `"00ff10"`.
  Empty octets is `""`.
- **RELATIVE-OID** values (paths, template references, label base paths) are
  dotted decimal strings, e.g. `"1.2.3"`.
- **Children** appear in document (wire) order. An element with no children
  omits the `children` key entirely (never `[]`).
- Object key order is irrelevant; comparison is structural.

## Root

```
CanonicalRoot =
  | { rootType: "elements",  elements: CanonicalRootElement[] }
  | { rootType: "streams",   streams: CanonicalStreamEntry[] }
  | { rootType: "invocationResult", invocationResult: CanonicalInvocationResult }
```

## Elements

```
CanonicalRootElement = CanonicalNumberedElement | CanonicalQualifiedElement

CanonicalNumberedElement  = { number: int, contents: CanonicalContents,
                              children?: CanonicalNumberedElement[] }
CanonicalQualifiedElement = { path: "1.2.3", contents: CanonicalContents,
                              children?: CanonicalNumberedElement[] }
```

Qualified elements only appear at root level (per the Glow schema). Children of
a qualified element are numbered elements.

## Contents

`CanonicalContents` is a tagged union on `kind`:

### `{ kind: "node", ... }`

| key                 | type   | Glow context tag |
| ------------------- | ------ | ---------------- |
| `identifier`        | string | 0                |
| `description`       | string | 1                |
| `isRoot`            | bool   | 2                |
| `isOnline`          | bool   | 3                |
| `schemaIdentifiers` | string | 4                |
| `templateReference` | oid    | 5                |

### `{ kind: "parameter", ... }`

| key                 | type       | Glow context tag |
| ------------------- | ---------- | ---------------- |
| `identifier`        | string     | 0                |
| `description`       | string     | 1                |
| `value`             | TypedValue | 2                |
| `minimum`           | TypedValue | 3                |
| `maximum`           | TypedValue | 4                |
| `access`            | int 0..3   | 5                |
| `format`            | string     | 6                |
| `enumeration`       | string     | 7                |
| `factor`            | int        | 8                |
| `isOnline`          | bool       | 9                |
| `formula`           | string     | 10               |
| `step`              | int        | 11               |
| `default`           | TypedValue | 12               |
| `parameterType`     | int 0..7   | 13               |
| `streamIdentifier`  | int        | 14               |
| `enumMap`           | list       | 15               |
| `streamDescriptor`  | object     | 16               |
| `schemaIdentifiers` | string     | 17               |
| `templateReference` | oid        | 18               |

- `access`: 0 = none, 1 = read, 2 = write, 3 = readWrite
- `parameterType`: 0 = null, 1 = integer, 2 = real, 3 = string, 4 = boolean,
  5 = trigger, 6 = enum, 7 = octets
- `enumMap`: `[{ name: string, value: int }, ...]` in wire order
- `streamDescriptor`: `{ format: int, offset: int }` where `format` is the Glow
  StreamFormat wire integer (0 = UInt8 … 23 = IEEE-754 64-bit little-endian)

### `{ kind: "matrix", ... }`

| key                        | type                                   | Glow context tag |
| -------------------------- | -------------------------------------- | ---------------- |
| `identifier`               | string                                 | 0                |
| `description`              | string                                 | 1                |
| `matrixType`               | int (0 oneToN, 1 oneToOne, 2 nToN)     | 2                |
| `addressingMode`           | int (0 linear, 1 nonlinear)            | 3                |
| `targetCount`              | int                                    | 4                |
| `sourceCount`              | int                                    | 5                |
| `maximumTotalConnects`     | int                                    | 6                |
| `maximumConnectsPerTarget` | int                                    | 7                |
| `parametersLocation`       | `{basePath:"1.2.3"}` or `{inline:int}` | 8                |
| `gainParameterNumber`      | int                                    | 9                |
| `labels`                   | `[{basePath:"1.2.3", description}]`    | 10               |
| `schemaIdentifiers`        | string                                 | 11               |
| `templateReference`        | oid                                    | 12               |
| `targets`                  | int[]                                  | (structure)      |
| `sources`                  | int[]                                  | (structure)      |
| `connections`              | list, see below                        | (structure)      |

- `connections`: `[{ target: int, sources?: int[], operation?: int,
disposition?: int }]` in wire order. `sources` is omitted when the
  connection has no sources on the wire (empty RELATIVE-OID is canonicalised
  to omitted).
- `operation`: 0 = absolute, 1 = connect, 2 = disconnect
- `disposition`: 0 = tally, 1 = modified, 2 = pending, 3 = locked
- `targets`/`sources` (the matrix signal lists) are omitted when not present
  on the wire.

### `{ kind: "function", ... }`

| key                 | type                        | Glow context tag |
| ------------------- | --------------------------- | ---------------- |
| `identifier`        | string                      | 0                |
| `description`       | string                      | 1                |
| `args`              | `[{type: int, name?}, ...]` | 2                |
| `result`            | `[{type: int, name?}, ...]` | 3                |
| `templateReference` | oid                         | 4                |

`type` is the ParameterType wire integer. `name` is omitted when absent on the
wire; an empty-string name is canonicalised to omitted (implementations
disagree on representing "no name").

### `{ kind: "command", ... }`

A command element's `number` (at the element level, next to `contents`) is the
command type: 30 subscribe, 31 unsubscribe, 32 getDirectory, 33 invoke.
Commands never have `children` and are never qualified.

```
{ kind: "command",
  dirFieldMask?: int,                  // -2 sparse, -1 all, 0 default,
                                       // 1 identifier, 2 description, 3 tree,
                                       // 4 value, 5 connections
  invocation?: { id?: int, args?: TypedValue[] } }
```

`dirFieldMask` is only valid for getDirectory; `invocation` only for invoke.
A `dirFieldMask` of 0 (default) that is present on the wire stays present in
the JSON — only wire-absent fields are omitted.
An `args` list that is absent on the wire is omitted; an empty list is `[]`.

### `{ kind: "template", ... }`

```
{ kind: "template", description?: string,
  element?: CanonicalNumberedElement }
```

`element` is the templated subtree (a numbered parameter, node, matrix or
function, possibly with children).

## TypedValue

```
TypedValue =
  | { type: "integer", value: int }        // |value| <= 2^53 - 1
  | { type: "real",    value: number | "Infinity" | "-Infinity" | "NaN" | "-0" }
  | { type: "string",  value: string }
  | { type: "boolean", value: bool }
  | { type: "octets",  value: "<hex>" }
  | { type: "null" }
```

Real values that are finite are JSON numbers (shortest round-trip
serialisation is lossless for IEEE-754 doubles); the three non-finite values
use string sentinels.

## Streams and invocation results

```
CanonicalStreamEntry      = { identifier: int, value: TypedValue }
CanonicalInvocationResult = { id: int, success?: bool, result?: TypedValue[] }
```

## Known normalisations

Rules added when a legitimate representation difference between the two
implementations was found. Each must be listed here:

1. **Connection sources**: an empty sources RELATIVE-OID on the wire and an
   absent sources field both canonicalise to _omitted_ (libember's
   `GlowConnection::sources()` cannot distinguish them).
2. **Function argument names**: empty-string name canonicalises to _omitted_
   (see above).
