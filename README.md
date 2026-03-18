# Intake Triage Tool

A Next.js application that accepts project intake submissions and uses Claude AI to automatically triage them — generating summaries, tags, risk checklists, and value propositions.

## Prerequisites

You will need a **Claude API key** from [Anthropic](https://console.anthropic.com/). The app reads it from a `.env` file in the project root.

Create a `.env` file:

```
ANTHROPIC_API_KEY=sk-ant-...your-key-here...
DATABASE_URL="file:./dev.db"
```

## Running without Docker

### System dependencies

- **Node.js >= 22** (the project uses Node 22 features; verified with v24)
- **npm** (ships with Node)

### Steps

```bash
# Install dependencies
npm install

# Generate the Prisma client
npx prisma generate

# Create the SQLite database and run migrations
npx prisma migrate deploy

# Start the dev server (runs on port 3001)
npm run dev
```

The app will be available at **http://localhost:3001**.

### Running tests

```bash
npm test
```

## Running with Docker

### System dependencies

- **Docker** (with BuildKit support)
- **Docker Compose** v2+

### Steps

```bash
# Build and start the container (runs on port 3001)
docker compose up --build
```

The app will be available at **http://localhost:3001**.

Docker Compose reads the `.env` file automatically for the `ANTHROPIC_API_KEY`. The SQLite database is persisted in a named volume (`app-data`), so data survives container restarts.

To stop the container:

```bash
docker compose down
```

To stop **and** delete the database volume:

```bash
docker compose down -v
```
