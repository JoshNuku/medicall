# Agent Rules — MediCall Backend

These rules apply to every change made in this codebase, not just the initial build.

## Scope of changes

- Only edit what I've explicitly instructed you to. Don't refactor, rename, or "clean up" unrelated code while completing a task, even if you notice something that could be improved.
- If a fix genuinely requires touching a file outside the current task's scope, stop and tell me why before making the change, don't just do it silently.
- Never delete or overwrite existing data-handling logic (database writes, webhook responses) without explicit confirmation, these are the pieces most likely to break the demo if changed carelessly.
- If a request is ambiguous, ask one clarifying question rather than guessing and generating code that might not match what I actually meant.

## File size and structure

- Keep each file under 100 lines. If a file is growing past that, split it by responsibility rather than letting it grow, for example, database queries in one file, route handlers in another, business logic in a third.
- One responsibility per file. A route file should only wire up HTTP handling and call out to logic elsewhere, it shouldn't contain database queries or decision logic directly.
- Prefer many small, clearly-named files over few large ones. It should be obvious from the filename what's inside it.

## Modularity and extensibility

- Write functions that take explicit parameters and return values, avoid relying on shared mutable state or global variables.
- Keep the database layer separate from business logic separate from HTTP routing. Business logic functions shouldn't know about Express's `req`/`res` objects, they should take plain arguments and return plain values, so they can be tested or reused independently of the web layer.
- When adding a new feature that resembles an existing one (for example, a new webhook type similar to an existing one), follow the same pattern already established in the codebase rather than inventing a new structure. Consistency matters more than any individual file being "more elegant."
- Design the `decisionEngine.js` / `agent.js` boundary so that swapping the rule-based logic for an LLM-based one later requires no changes to any calling code, only a change inside that one file.
- Use environment variables (via `.env`) for anything that could change between environments (API keys, ports, sandbox vs. production URLs), never hardcode these.

## Code quality

- Use `async/await` consistently, not a mix of callbacks and promises.
- Handle errors explicitly at each boundary that can fail (database calls, external API calls like Africa's Talking or Khaya), don't let unhandled rejections crash the process silently.
- Validate incoming request data (especially from webhooks, since that data comes from an external service) before using it, don't assume the shape is always correct.
- Add a short comment above any function whose purpose isn't obvious from its name and parameters, don't over-comment obvious code.
- No placeholder logic left silently in place, if something is a stub or a TODO, mark it clearly with a `// TODO:` comment explaining what still needs to happen.

## Documentation

- Document every HTTP endpoint using OpenAPI/Swagger (via `swagger-jsdoc` and `swagger-ui-express`), kept up to date as endpoints are added or changed, not written once and forgotten.
- Each endpoint's Swagger doc must include: method and path, a one-line description, expected request body/params with types, possible response shapes (including error responses), and example values.
- Serve the generated Swagger UI at a single, predictable route (e.g. `/api-docs`) so anyone on the team, or a judge, can open it and see the whole API surface without reading source code.
- Keep Swagger annotations next to the route they document (as JSDoc comments above the route handler), not in a separate file that can drift out of sync.
- Write a short README section explaining how to run the project locally, including required environment variables, so a teammate can get it running without asking.

## Error handling

- Every route handler must be wrapped so that a thrown error or rejected promise returns a proper HTTP error response, never crashes the server or hangs the request.
- Use a single centralized error-handling middleware in Express rather than repeating try/catch response logic in every route.
- Distinguish between error types in responses: client errors (bad input, missing fields) return 4xx with a clear message; unexpected server/integration failures (database, Africa's Talking, Khaya, Groq) return 5xx and are logged with enough detail to debug, without leaking internal details to the response body.
- For webhook endpoints specifically (Africa's Talking, SMS), always return a valid response even on internal failure, a broken webhook response can break the live call for the patient, so fail safely with a sensible default (e.g. a generic "please try again later" voice prompt) rather than returning a raw error.
- Never let one failed external API call (Khaya, Groq, Africa's Talking) take down an unrelated request, isolate failures per integration.

## Security

- Validate and sanitize all incoming input, especially on public-facing endpoints and webhooks, don't trust request bodies, query params, or webhook payloads by default.
- Store all secrets (API keys, tokens) in environment variables, never commit them, and add `.env` to `.gitignore` from the very first commit.
- Verify that incoming Africa's Talking webhook requests are genuinely from Africa's Talking where their API supports request validation, don't process a webhook payload as trusted just because it hit the expected route.
- Use parameterized queries for all database access, never string-concatenate user input into SQL, to prevent injection.
- Apply rate limiting on public endpoints (especially anything that could be hit repeatedly, like enrollment or webhook routes) to reduce abuse risk.
- Set sensible CORS rules, don't default to allowing all origins once a real frontend is integrated.
- Treat all patient data (names, phone numbers, health information) as sensitive: no plaintext logging of full patient records, and no returning more patient data in an API response than the specific endpoint actually needs.

## Data and safety

- Never invent real Twi text, phone numbers, or patient data. Use obviously-fake placeholders (e.g. `"[TWI: placeholder]"`, `"+233000000000"`) for anything that needs a human to verify or supply real content later.
- Don't store audio files as blobs in the database, always store them on disk (or a bucket) and save only the file path or URL.
- Treat all patient data as sensitive by default, don't log full patient details (phone numbers, names) to the console in a way that would linger in shared logs, even during development.

## Communication

- Before generating a significant new piece (a new stage, a new table, a new integration), summarize your plan in a few lines first and wait for confirmation if the approach involves a design decision I haven't already specified.
- After generating code, tell me clearly what you built, what's stubbed vs. fully working, and what I need to do next (e.g. "this needs a real Africa's Talking sandbox key in .env before it will run").
- If you're unsure whether something matches an existing pattern in the codebase, look at the existing files first rather than assuming or asking me to describe it again.