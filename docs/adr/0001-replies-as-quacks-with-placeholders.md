# ADR 0001: Replies are quacks; deleted quacks with replies become placeholders

## Status

Accepted (2026-11-10). Implemented with the replies story ([docs/stories/replies.md](../stories/replies.md)).

## Context

Users want to reply to a quack and see the replies under it. Two requirements pull against each other:

- Replies belong to their authors. If an author deletes a quack that has replies, the replies must survive.
- When someone deletes a quack, its content (text, mood, author, poll) must really disappear from the app.

So a deleted quack cannot simply be removed (the replies would lose their anchor or vanish), and it cannot simply be hidden (the content would still be stored). Today `Quack` is a flat table where every row is a live post with a non-null `text` and `userId`, and deletion is a hard delete that cascades to poll options and votes.

This choice decides what a "quack" is for every feature that reads or writes the table: the feed, search, "Mine", polls, moderation, the seed and the API contract. It is also the hardest part to reverse once replies and placeholders exist in production data.

## Decision

Replies are rows in the `quack` table, linked by a self-reference `parentId`, one level deep. A deleted quack that still has replies is kept as a **placeholder** row: `deletedAt` is set and `text`, `mood` and `userId` are nulled, and its poll options and votes are deleted. A quack without replies is deleted outright, as today.

Concretely:

- `Quack.text` and `Quack.userId` become nullable. `Quack.parentId` (nullable, `onDelete: Restrict`) and `Quack.deletedAt` (nullable) are added.
- Three database `CHECK` constraints keep it consistent: a live quack has text and an author while a placeholder has neither nor a mood; a reply has no mood; only a top-level quack can be a placeholder.
- A placeholder is removed when its last reply is deleted.
- Two rules stay in the service because Prisma cannot express them: a reply's parent must be top-level, and polls attach only to top-level quacks.

The exact schema and SQL are in the replies story.

## Options considered

### A. Replies are quacks, with a tombstone on the same table (chosen)

- Pros: smallest change; posting, deleting, moderation, search and "Mine" keep working; one table; the migration only relaxes NOT NULL and adds columns, so it runs on existing data without a backfill; the content rules can be checked by the database with `CHECK`s.
- Cons: `text` and `userId` are nullable, so every reader of `Quack` must handle a placeholder; the feed query needs `parentId IS NULL`; two rules are enforced only in the service.

### B. Separate `Reply` table, parent quack tombstoned with `deletedAt`

- Pros: a reply is structurally not a poll and not a mood; `Reply.text` stays NOT NULL.
- Cons: delete, moderation, search and "Mine" are duplicated across two tables; the parent `Quack` still needs nullable content for the tombstone, so it carries the main drawback of A as well; making replies nestable later means merging the tables.
- Rejected: more code and more tables for no gain on the hard requirement.

### C. Split `Quack` into a thin anchor and a one-to-one `QuackContent` table

- Pros: all columns stay NOT NULL; "really deleted" is structural because the content row is deleted and there is nothing to blank.
- Cons: every read joins; polls and the `User` relation have to be moved; the migration moves every existing row.
- Rejected: the largest rewrite, and it reopens the polls that already shipped, to remove a nullable column.

### Parent foreign key behaviour (within A)

- `Restrict` (chosen): the database refuses to hard-delete a quack that still has replies, so replies cannot be destroyed or orphaned by a code path that forgets the placeholder rule.
- `Cascade`: rejected, replies vanish and the requirement is broken.
- `SetNull`: rejected, replies silently become top-level quacks and lose the context they exist to provide.

## Consequences

- **Any code reading a quack must handle a placeholder** (`text`, `userId` and the author are absent; `deleted` is true). The API response type for a quack changes: `replies` and `deleted` are added, and `text`, `mood` and `author` are absent on a placeholder. Frontend zod schemas change with it.
- **"Does this quack exist?" and "who wrote it?" are no longer the same question.** Code such as `getAuthorId` must treat a placeholder as not deletable and not owned by anyone.
- **Feed, search and "Mine" queries must add `parentId: null`.** A new query on `quack` that forgets this will list replies as top-level quacks.
- **Deletion is now a transaction, not a single `deleteMany`.** It locks the parent row first (so a concurrent reply cannot slip in between the check and the delete). With replies it must delete the poll options explicitly (the cascade only fires when the quack row itself is deleted), then blank the row; deleting a reply may also purge its placeholder parent.
- **Hard-deleting a quack that has replies is impossible by design.** Any future "delete account" feature must turn the user's quacks that have replies into placeholders first, or it will fail on the foreign key.
- **Future features must stay inside the rules above.** Anything that attaches data to a quack (reactions, edits, attachments) has to decide what happens to it when the quack becomes a placeholder; if it is content, it must be erased with it.
- **Moving away from this later is costly.** Switching to separate tables or to a content split means a data migration over live quacks and placeholders, and rewriting every reader above.
- **Known gap:** the two service-only rules are not enforced by the database. Revisit if anything other than the API ever writes quacks.
- **Out of scope here:** copies outside the application database (backups, logs) are not purged.
