# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```sh
npm test          # lint (xo) + unit tests with coverage (c8 ava) + TypeScript definition tests (tsd)
npx ava           # run tests only (without lint or tsd)
npx ava test/chalk.js  # run a single test file
npm run bench     # run performance benchmarks
```

## Architecture

Chalk is a zero-dependency Node.js terminal string styling library (ESM). The entire implementation lives in `source/`.

**Core flow** (`source/index.js`):
- `chalkFactory(options)` creates a chalk function with a chainable API via JavaScript `Proxy` and prototype tricks.
- `createBuilder(self, _styler, _isEmpty)` returns a function/object that accumulates styles as properties are accessed (e.g. `chalk.red.bold`).
- `createStyler(open, close, parent)` builds a linked list of ANSI open/close code pairs.
- `applyStyle(self, string)` walks the styler linked list and wraps the string with the accumulated ANSI escape codes, handling newlines and nested resets correctly.
- `getModelAnsi(model, level, type, ...args)` converts RGB/hex/ansi256 color arguments to the appropriate ANSI codes based on color level.

**Private state on builder objects** is tracked via three symbols (`GENERATOR`, `STYLER`, `IS_EMPTY`), keeping the public API clean.

**Vendored dependencies** (in `source/vendor/`):
- `ansi-styles/` — ANSI escape code definitions (colors, modifiers)
- `supports-color/` — detects terminal color capability (levels 0–3); includes a browser stub

**`source/utilities.js`** provides two string helpers used internally: `stringReplaceAll` and `stringEncaseCRLFWithFirstIndex` for correct newline handling when styles span line breaks.

**TypeScript**: `source/index.d.ts` contains the public type definitions; `source/index.test-d.ts` contains TSD type tests run as part of `npm test`.

**Color levels**: 0 = disabled, 1 = basic 16 colors, 2 = 256 colors, 3 = 16M truecolor. Chalk auto-detects via `supports-color` but can be overridden via `new Chalk({ level })`.
