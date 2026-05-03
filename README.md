# AST Platform

Web app: parse source to an AST and explore structure in a tree view (single files or folders).

## Languages

Python, JavaScript, TypeScript, Go, Rust, Java, C++, C, C#, PHP, Kotlin, Swift, Dart, Ruby, R.

## Quick start

From the repository root.

**1. UI (install, then dev server)**

```bash
npm run ui:install
npm run ui:dev
```

After `ui:dev`, open the URL Vite prints (often `http://localhost:5173`). Leave this terminal running while you use the app.

**2. Optional (separate terminal for API; build when you are not running `ui:dev`)**

```bash
npm run parse:server
npm run ui:build
```

`parse:server` serves the local parser at `http://localhost:8787`. `ui:build` writes static files to `apps/ui/dist`.

