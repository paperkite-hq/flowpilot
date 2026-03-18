# Docker

Run FlowPilot workflows in Docker with a single command.

## Quick start

```bash
docker run --rm -v $(pwd):/app -w /app oven/bun:1 bun run flowpilot run ./my-workflow.ts
```

## Dockerfile

For production deployments, use this Dockerfile:

```dockerfile
FROM oven/bun:1-slim

WORKDIR /app

# Copy package files
COPY package.json bun.lock* ./
RUN bun install --frozen-lockfile

# Copy workflow code
COPY . .

# Default command — override with your workflow file
CMD ["bun", "run", "flowpilot", "run", "./workflow.ts"]
```

Build and run:

```bash
docker build -t my-workflows .
docker run --rm my-workflows
```

## With environment variables

Pass API keys for AI integration:

```bash
docker run --rm \
  -e ANTHROPIC_API_KEY=$ANTHROPIC_API_KEY \
  -v $(pwd):/app -w /app \
  oven/bun:1 bun run flowpilot run ./ai-workflow.ts
```

## Persistent database

Mount a volume to persist the SQLite database across runs:

```bash
docker run --rm \
  -v $(pwd):/app -w /app \
  -v flowpilot-data:/app/data \
  oven/bun:1 bun run flowpilot run ./workflow.ts
```

Configure the database path in your workflow:

```typescript
const fp = new FlowPilot({
  dbPath: "./data/flowpilot.db",
});
```

## Docker Compose

```yaml
services:
  flowpilot:
    image: oven/bun:1-slim
    working_dir: /app
    volumes:
      - .:/app
      - flowpilot-data:/app/data
    environment:
      - ANTHROPIC_API_KEY
    command: bun run flowpilot run ./workflow.ts

volumes:
  flowpilot-data:
```
