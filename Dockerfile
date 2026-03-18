FROM oven/bun:1-slim

WORKDIR /app

# Copy package files first for layer caching
COPY package.json bun.lock* ./
RUN bun install --frozen-lockfile 2>/dev/null || bun install

# Copy source and examples
COPY . .

# Default: run a workflow file passed as argument
ENTRYPOINT ["bun", "run", "cli/index.ts", "run"]
CMD ["examples/hello-world.ts"]
