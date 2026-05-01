# AST Platform

AST Platform is a multi-language code structure explorer.

## What it does

- Parse source code into a normalized AST.
- Visualize class/function structure in a tree view.
- Inspect selected nodes with summary and JSON details.
- Show source, ranges, and language-aware metadata in a single UI.
- Support both single-file mode and directory mode.

## Supported languages

- Python
- JavaScript
- TypeScript
- Go
- Rust
- Java
- C++
- C
- C#
- PHP
- Kotlin
- Swift
- Dart
- Ruby
- R

## Directory mode capabilities

- Open a folder and browse its tree structure.
- Show per-folder summary metadata from `directory.json`.
- Show direct child language chips and basic folder stats.
- Keep file-level descriptions from manifest paths.

## Backend options

- Local parse service (`scripts/parse-server.mjs`) for development.
- Cloudflare Worker backend under `workers/parse-api` for hosted parsing API.
