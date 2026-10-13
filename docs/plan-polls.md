# Plan: Polls on quacks

Implements [docs/stories/polls.md](stories/polls.md). Follows the quack feed pattern: Prisma model → repository → service → controller/DTO → zod schema → TanStack Query → components.

## Data model

Two new tables. There is **no separate `Poll` table**: a quack "has a poll" when it has options. That is one less thing to keep in sync, and the story has no poll-level attributes (no title, deadline, or closed flag).

```prisma
model PollOption {
  id        String   @id @default(cuid())
  quack     Quack    @relation(fields: [quackId], references: [id], onDelete: Cascade)
  quackId   String
  text      String   @db.VarChar(50)
  textKey   String   @db.Text          // normalized text, for the duplicate check (see decision 4)
  position  Int                         // display order, 0-based
  votes     PollVote[]
  createdAt DateTime @default(now())

  @@unique([quackId, textKey])          // no duplicate answers (case-insensitive)
  @@unique([quackId, position])
  @@unique([quackId, id])               // target for the composite FK from PollVote
  @@map("poll_option")
}

model PollVote {
  quack     Quack      @relation(fields: [quackId], references: [id], onDelete: Cascade)
  quackId   String
  user      User       @relation(fields: [userId], references: [id], onDelete: Cascade)
  userId    String
  option    PollOption @relation(fields: [quackId, optionId], references: [quackId, id], onDelete: Cascade)
  optionId  String
  createdAt DateTime   @default(now())
  updatedAt DateTime   @updatedAt

  @@id([quackId, userId])               // one vote per user per poll, enforced by the database
  @@index([optionId])
  @@map("poll_vote")
}
```

`Quack` gains `pollOptions PollOption[]` and `pollVotes PollVote[]`; `User` gains `pollVotes PollVote[]`.

Decisions to check hardest:

1. **One user, one vote is a primary key, not a service check.** `@@id([quackId, userId])` makes a second vote row impossible, even from two tabs or a double click. Changing a vote is an update of `optionId`; removing it is a delete.
2. **A vote cannot point at another quack's option.** The composite FK `(quackId, optionId) → PollOption(quackId, id)` makes the database reject it. Without this, a forged `optionId` could count in the wrong poll.
3. **Counts are never stored.** They are computed from `PollVote` rows on every read (`_count` per option), so they cannot drift from the stored votes. At MVP scale this is cheap; `@@index([optionId])` covers it.
4. **Case-insensitive uniqueness** uses a stored `textKey` with a unique constraint, because Prisma cannot declare a unique index on `lower(text)`. The service computes it as `text.trim().replace(/\s+/g, " ").normalize("NFC").toLowerCase()`, so "Pizza Place" and "pizza place" collide. `textKey` is `Text`, not `VarChar(50)`, because lowercasing can make a string longer (e.g. `İ` becomes two characters) and a 50-character answer would then fail with a 500. `text` is stored trimmed with original casing. The length check runs on the trimmed `text`.
5. **2–6 options is a service rule**, not a DB constraint. It is enforced in the same transaction that creates the quack and options, so a poll can never exist with 1 option. Options are immutable afterwards (story: polls are fixed), so the count cannot drift later.
6. **Cascade deletes** from quack and user keep no orphans. Deleting a user removes their votes, which lowers counts; that is acceptable and there is no user-delete feature today anyway.
7. Existing quacks need no backfill: no options means no poll.

## Endpoints

All behind `AuthenticatedUserGuard`, DTO-validated, and the user always comes from the session.

| Method   | Path                        | Purpose                                                                                                                                                                           |
| -------- | --------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `POST`   | `/api/quacks`               | **Extended.** New optional `pollOptions: string[]` (2–6 items, each trimmed, 1–50 chars, unique ignoring case). Creates quack and options in one transaction. Violations → `400`. |
| `GET`    | `/api/quacks`               | **Extended.** Each quack gets `poll: null \| Poll` (see below). Search is unchanged.                                                                                              |
| `PUT`    | `/api/quacks/:quackId/vote` | Body `{ optionId }`. Sets my vote to that option (insert or change). **Idempotent**, so retries and double clicks are safe. Returns the updated `Poll`.                           |
| `DELETE` | `/api/quacks/:quackId/vote` | Removes my vote. Idempotent (no vote → still `200`). Returns the updated `Poll`.                                                                                                  |

Errors for vote endpoints: `401` not signed in; `404` quack not found or has no poll; `400` option not in this quack's poll.

```ts
Poll = {
  options: { id: string; text: string; votes: number }[]  // ordered by position
  totalVotes: number
  myVoteOptionId: string | null
}
```

Implementation notes:

- The service first loads the quack's option ids: no quack or no options → `404`, `optionId` not among them → `400`. Only then does it write, so a foreign-key violation (`P2003`) is a bug, never an expected error path. Options are immutable, so this check cannot go stale.
- Set-vote is an `upsert` on `(quackId, userId)`. Prisma only uses a native `ON CONFLICT` for some upserts, so two first-time votes can race into a unique violation (`P2002`). The service catches that and retries once as an update. Slice 4 has a test that fires parallel votes.
- The list query loads options with `_count: { votes }` and `votes: { where: { userId } }` to get `myVoteOptionId`, so it needs no per-quack queries.
- Percentages are computed on the client from `votes` and `totalVotes`, rounded to whole numbers. With 0 total votes every bar is 0% (no division by zero). Rounded percentages may not add up to exactly 100; that is accepted, and the vote counts are the exact numbers.
- Voter identities are never returned.

## Build order (one slice at a time: generate → review → commit)

1. **Schema + migration.** Add the models above, run `pnpm backend prisma:migrations:run`, and extend the seed with one poll quack with a few votes. Review the generated SQL (PK, composite FK, unique constraints) before committing.
2. **Backend: create a poll.** Domain types, DTO validation (count, length, trim, duplicates), repository transactional create, service. Unit tests: valid, <2, >6, empty, 51 chars, duplicates differing only by case, no poll at all.
3. **Backend: read a poll.** Return `poll` in `GET /quacks` with counts and `myVoteOptionId`. Tests: counts match stored votes, `myVoteOptionId` differs per viewer, quacks without a poll return `null`.
4. **Backend: vote and unvote.** `PUT`/`DELETE` endpoints. Tests: first vote, change vote (old −1, new +1), idempotent repeat, remove, remove with no vote, option from another quack → `400`, quack without a poll → `404`, author votes, simultaneous votes leave one row.
5. **Frontend: schemas and read-only display.** Zod `pollSchema`, extend `quackSchema`, a `QuackPoll` component (answer rows, percentage bar, count, highlighted pick, no click behavior yet). Component tests with fixtures.
6. **Frontend: composer.** "Add poll" toggle in `QuackForm`: starts with 2 inputs, add up to 6, remove down to 2, toggle off discards. Client-side validation mirrors the server, and `addQuack` sends `pollOptions`. Form tests. Uses kit components only (`pnpm dlx shadcn@latest add …` if something is missing).
7. **Frontend: voting.** `useVote` mutation: cancel in-flight list queries, optimistically update the cached quack list (recomputing counts, `totalVotes` and `myVoteOptionId` locally), use a TanStack `scope: { id: quackId }` so rapid clicks on one poll run in order, on error roll back and show an error toast, and refetch once the last queued mutation for that quack settles (not after each one, or an early refetch overwrites a later optimistic state). Clicking the selected answer calls `DELETE`. Tests: instant update, change, remove, failure rolls back and shows the toast.
8. **Wrap-up.** `pnpm check-all`, a pass over the acceptance criteria in the story, and a UI check against [DESIGN.md](../DESIGN.md) (no nested cards, no shadows on inputs).

## Open points for plan review

- **Toast:** `sonner` and its `Toaster` are already in the app, so slice 7 only calls `toast.error(...)`.
- **Search:** unchanged, but the list query keeps its `include` for options, so confirm search still returns polls intact (covered in slice 3 tests).
- **Auto-refresh:** not in scope, so a stale tab shows old counts until it refetches. Voting itself returns fresh counts, which corrects the voter's own view.
