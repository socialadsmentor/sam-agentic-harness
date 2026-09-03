---
name: vite-patterns
description: Vite build tool patterns including config, plugins, HMR, env variables, proxy setup, SSR, library mode, dependency pre-bundling, and build optimization. Activate when working with vite.config.ts, Vite plugins, or Vite-based projects.
origin: ECC
---

# Vite Patterns

Build tool and dev server patterns for Vite 8+ projects. Covers configuration, environment variables, proxy setup, library mode, dependency pre-bundling, and common production pitfalls.

## When to Use

- Configuring `vite.config.ts` or `vite.config.js`
- Setting up environment variables or `.env` files
- Configuring dev server proxy for API backends
- Optimizing build output (chunks, minification, assets)
- Publishing libraries with `build.lib`
- Troubleshooting dependency pre-bundling or CJS/ESM interop
- Debugging HMR, dev server, or build errors
- Choosing or ordering Vite plugins

## How It Works

- **Dev mode** serves source files as native ESM - no bundling. Transforms happen on-demand per module request, which is why cold starts are fast and HMR is precise.
- **Build mode** uses Rolldown (v7+) or Rollup (v5 - v6) to bundle the app for production with tree-shaking, code-splitting, and Oxc-based minification.
- **Dependency pre-bundling** converts CJS/UMD deps to ESM once via esbuild and caches the result under `node_modules/.vite`, so subsequent starts skip the work.
- **Plugins** share a unified interface across dev and build - the same plugin object works for both the dev server's on-demand transforms and the production pipeline.
- **Environment variables** are statically inlined at build time. `VITE_`-prefixed vars become public constants in the bundle; everything unprefixed is invisible to client code.

## Quick Reference

| Pattern | When to Use |
|---------|-------------|
| `defineConfig` | Always - provides type inference |
| `loadEnv(mode, root, ['VITE_'])` | Access env vars in config (explicit prefix) |
| `vite-plugin-checker` | Any TypeScript app (fills the type-check gap) |
| `vite-tsconfig-paths` | Instead of hand-rolled `resolve.alias` |
| `optimizeDeps.include` | CJS deps causing interop issues |
| `server.proxy` | Route API requests to backend in dev |
| `server.host: true` | Docker, containers, remote access |
| `server.warmup.clientFiles` | Pre-transform hot-path routes |
| `build.lib` + `external` | Publishing npm packages |
| `manualChunks` (object) | Vendor bundle splitting |
| `vite --profile` | Debug slow dev server |
| `vite build && vite preview` | Smoke-test prod bundle locally (NOT a prod server) |

## Related Skills

- `frontend-patterns` - React component patterns
- `docker-patterns` - containerized dev with Vite
- `nextjs-turbopack` - alternative bundler for Next.js
