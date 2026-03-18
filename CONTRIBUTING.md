# Contributing to FlowPilot

Thanks for your interest in contributing to FlowPilot! This guide will help you get started.

## Prerequisites

- [Bun](https://bun.sh) v1.0 or later
- Git

## Setup

```bash
git clone https://github.com/paperkite-hq/flowpilot.git
cd flowpilot
bun install
```

## Development

### Running tests

```bash
bun test
```

### Linting

FlowPilot uses [Biome](https://biomejs.dev/) for formatting and linting:

```bash
# Check for issues
bun run check

# Auto-fix issues
bun run check:fix
```

### Running examples

```bash
bun run examples/hello-world.ts
bun run examples/data-pipeline.ts
bun run examples/webhook-handler.ts
```

### Documentation site

```bash
bun run docs:dev    # Start dev server
bun run docs:build  # Build for production
```

## Making changes

1. Fork the repository
2. Create a feature branch: `git checkout -b feat/my-feature`
3. Make your changes
4. Run tests: `bun test`
5. Run lint: `bun run check`
6. Commit using [conventional commits](https://www.conventionalcommits.org/): `git commit -m "feat: add new feature"`
7. Push and open a pull request

## Commit conventions

We use conventional commits:

- `feat:` — new feature
- `fix:` — bug fix
- `docs:` — documentation changes
- `chore:` — maintenance tasks
- `test:` — test additions or changes
- `refactor:` — code refactoring

## Project structure

```
flowpilot/
├── src/           # Core engine source
│   ├── engine.ts  # FlowPilot class
│   ├── types.ts   # TypeScript type definitions
│   ├── ai.ts      # LLM client factory
│   ├── retry.ts   # Retry logic
│   ├── store.ts   # SQLite persistence
│   ├── logger.ts  # Structured logging
│   └── index.ts   # Public exports
├── cli/           # CLI entry point
├── examples/      # Example workflows
├── docs/          # VitePress documentation
└── package.json
```

## Adding a new feature

1. Add types to `src/types.ts`
2. Implement in the appropriate source file
3. Export from `src/index.ts` if it's public API
4. Add tests in `src/*.test.ts`
5. Update documentation in `docs/`
6. Add an example if appropriate

## License

By contributing, you agree that your contributions will be licensed under the AGPL-3.0-or-later license.
