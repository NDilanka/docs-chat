# REST API Reference

The Tessera REST API lets you read and write notes, tasks, and spaces programmatically. This reference covers authentication, conventions, rate limits, and the core endpoints.

## Base URL

All endpoints are served under:

```
https://api.tessera.app/v1
```

The API speaks JSON. Send `Content-Type: application/json` on requests with a body. The API version is part of the path (`/v1`); breaking changes ship under a new version.

## Authentication

Authenticate with a **personal access token** sent as a bearer token:

```
Authorization: Bearer tsk_live_xxxxxxxxxxxxxxxxxxxxx
```

Create and revoke tokens under **Settings → Developer → API tokens**. Each token is scoped to **read** or **read-write** and to specific spaces. Tokens are shown only once at creation, so store them securely. A request with a missing or invalid token returns **401 Unauthorized**.

## Rate limits

Rate limits depend on your plan, measured per token per minute:

- **Free** — 60 requests/min
- **Plus** — 120 requests/min
- **Team** — 600 requests/min
- **Business** — 1,200 requests/min

Every response includes `X-RateLimit-Limit`, `X-RateLimit-Remaining`, and `X-RateLimit-Reset` (a Unix timestamp). Exceeding the limit returns **429 Too Many Requests**; respect the `Retry-After` header before retrying.

## Pagination

List endpoints are cursor-paginated. Pass `limit` (default **25**, maximum **100**) and `cursor`:

```
GET /v1/notes?limit=50&cursor=eyJpZCI6Im4_8f...
```

The response body includes a `next_cursor` field, which is `null` on the last page.

## Errors

Errors return a JSON body with a stable machine-readable `code`:

```json
{
  "error": {
    "code": "not_found",
    "message": "No note exists with that id."
  }
}
```

Common status codes are **400** (bad request), **401** (unauthenticated), **403** (forbidden), **404** (not found), **422** (validation failed), **429** (rate limited), and **500** (server error).

## Endpoints

### Notes

- `GET /v1/notes` — list notes. Filter with `space_id`, `tag`, `updated_since`.
- `POST /v1/notes` — create a note. Body: `{ "space_id", "title", "content", "folder_id"? }`. `content` is Markdown.
- `GET /v1/notes/{id}` — fetch one note, including its Markdown content.
- `PATCH /v1/notes/{id}` — update `title`, `content`, or `folder_id`.
- `DELETE /v1/notes/{id}` — move a note to Trash. Add `?permanent=true` to delete immediately.

### Tasks

- `GET /v1/tasks` — list tasks. Filter with `space_id`, `assignee_id`, `status`, `due_before`.
- `POST /v1/tasks` — create a task. Body: `{ "space_id", "title", "status"?, "assignee_id"?, "due_date"?, "priority"? }`.
- `PATCH /v1/tasks/{id}` — update any task field, including `status`.

### Spaces

- `GET /v1/spaces` — list spaces you can access.
- `POST /v1/spaces` — create a space. Body: `{ "name", "icon"? }`.

### Search

- `GET /v1/search?q=` — full-text search across notes and tasks. Supports the same operators as the in-app search and returns paginated results.

### Current user

- `GET /v1/me` — return the authenticated user and the plan in effect.

## Example request

Create a note with curl:

```
curl https://api.tessera.app/v1/notes \
  -H "Authorization: Bearer tsk_live_xxx" \
  -H "Content-Type: application/json" \
  -d '{"space_id":"sp_123","title":"Launch checklist","content":"# Launch\n- [ ] Ship"}'
```

A successful create returns **201 Created** with the new note's `id` and `url`.

## Versioning and changes

We announce additions and deprecations on the developer changelog at **tessera.app/developers/changelog**. Additive changes (new fields, new endpoints) can ship without a version bump, so write clients that ignore unknown fields.
