# E2E differential tests against Lawo libember

This directory contains an optional, Linux-only test suite that validates this
library's Ember+ encoding/decoding against the reference C++ implementation
from [Lawo/ember-plus](https://github.com/Lawo/ember-plus) (`libember` for the
Glow/BER codec, `libs101` for S101 framing).

The value over the unit tests in `src/` is that those are TS-internal
round-trips: a symmetric encode/decode bug is invisible to them. Here, every
tree is encoded by one implementation and decoded by the other (in both
directions, plus a decode/re-encode round-trip through libember), so the two
implementations continuously cross-check each other. This has caught real
bugs — see "Findings" below.

## Requirements

- Linux
- Node.js >= 26.1 (for the experimental [`node:ffi`](https://nodejs.org/api/ffi.html) module)
- CMake >= 3.18 and a C++17 compiler (g++/clang++)

## Running

```sh
yarn e2e:build   # cmake: fetches the pinned ember-plus commit, builds the shim
yarn e2e         # runs jest with NODE_OPTIONS=--experimental-ffi
```

The regular `yarn unit` / `yarn test` never touch this suite, and the suite
does not affect the published package (its `engines` range is unchanged).

## How it works

- `native/shim.cpp` is a small C++ shim compiled against libember, exposing a
  flat `extern "C"` ABI where every function takes and returns strings
  (hex/JSON). `native/CMakeLists.txt` pins the ember-plus commit via
  `FetchContent` (`EMBERPLUS_PIN`).
- `src/shim.ts` loads the shim through `node:ffi` — no node-api/node-gyp.
- Both sides convert trees to the canonical JSON form defined in
  [`CANONICAL.md`](./CANONICAL.md) (implemented independently in `shim.cpp`
  and `src/canonical.ts`), and tests deep-compare those.
- `tests/glow-vectors.e2e.ts` runs ~90 hand-written vectors (in `vectors/`)
  through four directions each; `tests/glow-generative.e2e.ts` runs 250
  seeded pseudo-random trees (reproduce a failure with
  `E2E_SEED=<seed> yarn e2e glow-generative`); `tests/s101.e2e.ts` covers
  S101 framing, escaping, CRC and multi-packet segmentation both ways.

To bump the libember pin, change `EMBERPLUS_PIN` in `native/CMakeLists.txt`,
delete `native/build` and re-run `yarn e2e:build`.

## Findings

Bugs in **this library** found by the suite and since fixed:

- `writeInt` truncated all integers to 32 bits (2^31 encoded as -2^31, 2^32 as
  0). Ember+ integers are Integer64.
- `readInt` lost precision on negative integers wider than 2^53 intermediate
  (-(2^53-1) decoded off by one).
- `writeReal` never encoded the exponent length in the REAL preamble, corrupting
  every value with |unbiased exponent| >= 128 (e.g. 1e300), and dropped the
  sign of -0.
- `readReal` did not understand the X.690 minus-zero special (0x43).
- Matrix `parametersLocation` classified numeric-looking base paths (e.g.
  `"9.8"`) as inline integers.
- BER lengths 128..255 are now encoded as `82 00 xx` instead of the minimal
  `81 xx` — see below.

Bugs found in **libember** (present at the pinned commit; the suite works
around them, they are worth reporting upstream):

- `DomReader` accounts consumed bytes by re-computing each tag/length's
  encoded size from its decoded value, assuming libember's own non-minimal
  length form (`82 00 xx` for 128..255). Decoding the spec-canonical `81 xx`
  form makes it over-count one byte per length; once the accumulated drift in
  a container exceeds a trailing sibling's size, that sibling is _silently
  dropped_. Real devices run libember, so this library now emits the
  libember-compatible `82 00 xx` form (still valid BER).
- `glow::Variant` stores "long" values in an `int` member, so the
  `glow::Value`/`MinMax` accessors truncate integers wider than 32 bits on
  LP64 platforms (the wire codec itself is exact; the shim reads raw
  `ber::Value` leaves to bypass this).
- `DomReader::decodeNode` has no case for the universal NULL type and silently
  drops null value leaves (a parameter's null value disappears on decode).
- `DomReader` reads unchecked from its input stream and segfaults on some
  malformed inputs (e.g. empty input, or a leading zero tag); the shim guards
  the entry points.
- `GlowNodeBase::setIdentifier` (and friends) enforce the Glow identifier
  syntax and reject empty/non-ASCII identifiers; this library does not
  validate identifiers. Affected vectors are skipped with a reason in the
  `libToTs` direction.

Known, intentional test-scope limits: integers stay within JS safe-integer
range (±(2^53-1)); the generative suite only produces trees both
implementations can represent (C-style identifiers, no null parameter values,
command children last with unique numbers — this library's decoder keys
children by number).
