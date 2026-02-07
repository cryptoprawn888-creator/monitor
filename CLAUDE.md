# Project: {PROJECT NAME}

> This file is read by Claude Code at the start of every session.
> All agents reference this for project-specific context.
> Update this file whenever you establish new conventions or encounter recurring issues.

---

# Basics
- Keep changes small and reversible.
- Prefer editing existing files over creating new ones.
- Never add secrets/keys to code or commits.
- After editing code, run the project's tests or at least the relevant command.
- If unsure, ask before running destructive commands (rm, reset, force push).


## Project Overview

**Description:** {One sentence describing what this project does}

**Status:** {Planning / In Development / MVP / Production}

**Repository:** {URL if applicable}

---

## Tech Stack

| Layer | Technology | Version | Notes |
|-------|------------|---------|-------|
| Language | {e.g., TypeScript} | {e.g., 5.3+} | {e.g., Strict mode enabled} |
| Framework | {e.g., Next.js} | {e.g., 14.x} | {e.g., Using App Router} |
| Database | {e.g., PostgreSQL} | {e.g., 15+} | {e.g., Via Supabase} |
| ORM | {e.g., Prisma} | {e.g., 5.x} | |
| Styling | {e.g., Tailwind CSS} | {e.g., 3.x} | |
| Testing | {e.g., Vitest} | | |
| Package Manager | {e.g., pnpm} | | |

---

## Project Structure

```
{project-root}/
├── .claude/
│   └── agents/           # AI agent definitions
├── docs/
│   ├── project-brief.md  # Product Owner output
│   ├── requirements/     # Planner outputs
│   ├── architecture/     # Architect outputs
│   ├── tasks/            # Task breakdowns
│   ├── qa/               # QA reports
│   └── reviews/          # Code review reports
├── src/
│   ├── {folder}/         # {Description}
│   ├── {folder}/         # {Description}
│   └── {folder}/         # {Description}
├── tests/                # Test files
├── README.md             # Project documentation
└── CLAUDE.md             # This file
```

---

## Naming Conventions

| Element | Convention | Example |
|---------|------------|---------|
| Files (components) | {e.g., kebab-case} | `user-profile.tsx` |
| Files (utilities) | {e.g., kebab-case} | `format-date.ts` |
| Components | {e.g., PascalCase} | `UserProfile` |
| Functions | {e.g., camelCase} | `getUserById` |
| Variables | {e.g., camelCase} | `isLoading` |
| Constants | {e.g., UPPER_SNAKE_CASE} | `MAX_RETRY_COUNT` |
| Types/Interfaces | {e.g., PascalCase} | `UserProfile` |
| Database tables | {e.g., snake_case} | `user_profiles` |
| API endpoints | {e.g., kebab-case} | `/api/user-profiles` |

---

## Code Patterns

### Pattern 1: {e.g., API Routes}

**Location:** `{e.g., src/app/api/}`

**Reference file:** `{e.g., src/app/api/users/route.ts}`

**Key points:**
- {e.g., Always validate input with Zod}
- {e.g., Use try/catch with consistent error responses}
- {e.g., Return { data, error } shape}

```typescript
// Example pattern (optional - include if helpful)
```

---

### Pattern 2: {e.g., Services}

**Location:** `{e.g., src/services/}`

**Reference file:** `{e.g., src/services/user-service.ts}`

**Key points:**
- {e.g., One service per domain}
- {e.g., Methods are async and return typed results}
- {e.g., Throw errors, don't return them}

---

### Pattern 3: {e.g., Components}

**Location:** `{e.g., src/components/}`

**Reference file:** `{e.g., src/components/Button/Button.tsx}`

**Key points:**
- {e.g., Use named exports}
- {e.g., Props interface named {Component}Props}
- {e.g., Co-locate tests in same folder}

---

## Code Style Rules

### Do ✅

- {e.g., Use named exports over default exports}
- {e.g., Use `const` over `let` when possible}
- {e.g., Add return types to functions}
- {e.g., Use early returns to reduce nesting}
- {e.g., Write self-documenting code, comment the "why" not the "what"}

### Don't ❌

- {e.g., Don't use `any` type — use `unknown` if truly unknown}
- {e.g., Don't use `var`}
- {e.g., Don't put business logic in API routes}
- {e.g., Don't use magic numbers — create named constants}
- {e.g., Don't leave commented-out code}

---

## Error Handling

**Approach:** {e.g., Throw errors in services, catch in API routes}

**Error format:**
```typescript
// Example error structure (customize for your project)
{
  error: {
    code: "ERROR_CODE",
    message: "Human readable message"
  }
}
```

**Logging:** {e.g., Use console.error for errors, structured logging in production}

---

## Testing Standards

**Framework:** {e.g., Vitest + React Testing Library}

**Location:** {e.g., Co-located with source files as `*.test.ts`}

**Naming:** {e.g., `describe('ComponentName')` → `it('should do something')`}

**Coverage target:** {e.g., 80% for services, 60% for components}

**What to test:**
- {e.g., All service methods}
- {e.g., Component rendering and interactions}
- {e.g., API route handlers}

---

## Git & Version Control

**Branch naming:**
- `feature/{description}` — New features
- `fix/{description}` — Bug fixes
- `docs/{description}` — Documentation
- `refactor/{description}` — Code improvements

**Commit message format:**
```
{type}: {short description}

{optional body}
```

Types: `feat`, `fix`, `docs`, `refactor`, `test`, `chore`

---

## Commands Reference

| Command | Purpose |
|---------|---------|
| `{e.g., pnpm dev}` | Start development server |
| `{e.g., pnpm build}` | Build for production |
| `{e.g., pnpm test}` | Run tests |
| `{e.g., pnpm lint}` | Check code style |
| `{e.g., pnpm db:migrate}` | Run database migrations |
| `{e.g., pnpm db:studio}` | Open database GUI |

---

## Environment Variables

| Variable | Purpose | Where to Set |
|----------|---------|--------------|
| `{e.g., DATABASE_URL}` | {Database connection} | `.env.local` |
| `{e.g., NEXTAUTH_SECRET}` | {Auth encryption} | `.env.local` |
| `{e.g., API_KEY}` | {External API access} | `.env.local` |

**Note:** Never commit `.env` files. Use `.env.example` as a template.

---

## External Services & APIs

| Service | Purpose | Documentation |
|---------|---------|---------------|
| {e.g., Stripe} | {Payments} | {URL} |
| {e.g., SendGrid} | {Email} | {URL} |
| {e.g., S3} | {File storage} | {URL} |

---

## Known Issues & Gotchas

### Issue 1: {Title}
**Problem:** {What goes wrong}
**Workaround:** {How to handle it}

### Issue 2: {Title}
**Problem:** {What goes wrong}
**Workaround:** {How to handle it}

---

## Agent-Specific Notes

### For Architect
- {e.g., We prefer composition over inheritance}
- {e.g., Keep services stateless}
- {e.g., Use repository pattern for data access}

### For Developer
- {e.g., Check existing code for patterns before creating new ones}
- {e.g., Run `pnpm lint` before considering work done}
- {e.g., Always add types, never use `any`}

### For QA Engineer
- {e.g., Focus on happy path + main error cases}
- {e.g., Mock external services in tests}
- {e.g., Test file naming: `*.test.ts`}

### For Code Reviewer
- {e.g., Enforce no `any` types strictly}
- {e.g., Check for proper error handling}
- {e.g., Verify tests exist for new code}

### For Technical Writer
- {e.g., Keep README focused on getting started}
- {e.g., API docs go in docs/api/}
- {e.g., Use JSDoc for function documentation}

---

## Decision Log

Track important decisions so agents understand context.

| Date | Decision | Reason |
|------|----------|--------|
| {date} | {e.g., Use Prisma over Drizzle} | {e.g., Better type safety, team familiarity} |
| {date} | {e.g., Session auth over JWT} | {e.g., Simpler, more secure for our use case} |
| {date} | {e.g., pnpm over npm} | {e.g., Faster, better monorepo support} |

---

## Learned Corrections

When agents make mistakes, add corrections here so they don't repeat them.

### Correction 1
**Wrong:** {What the agent did wrong}
**Right:** {What should be done instead}
**Added:** {Date}

### Correction 2
**Wrong:** {What the agent did wrong}
**Right:** {What should be done instead}
**Added:** {Date}

---

## Quick Reference

### Key Files to Understand This Project
- `{path}` — {Why it's important}
- `{path}` — {Why it's important}
- `{path}` — {Why it's important}

### Most Common Tasks
- **Add new API endpoint:** See pattern in `{path}`
- **Add new component:** See pattern in `{path}`
- **Add new service:** See pattern in `{path}`

---

## Maintenance Notes

**Last updated:** {DATE}

**Update this file when:**
- You establish a new convention
- An agent makes a mistake that should be prevented
- You add a new technology or tool
- You make an architectural decision
- You discover a gotcha others should know about

---

*This file is the single source of truth for project conventions. When in doubt, check here first.*
