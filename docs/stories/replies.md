# User Story: Reply to a quack

## Story

As a user reading the quack feed,
I want to reply directly to a quack and see the replies listed under it,
so that I can follow a conversation without guessing what a "@name …" quack is answering.

## Why

People discuss a quack by posting a new quack that starts with "@name", and nobody can tell what it refers to. Replies must belong to the people who wrote them: when an author deletes a quack that already has replies, the replies stay. At the same time, a deleted quack's content (text, mood, poll, author) must really disappear from the app, not just be hidden.

## Scope

- Every signed-in user can **reply to any top-level quack**, including their own and including a quack that was deleted and now shows as a placeholder (see below).
- A reply is **text only**: trimmed, non-empty, at most 280 characters, the same text rule as a quack. **No mood and no poll** on replies.
- **One level only.** You cannot reply to a reply; replies have no "Reply" action.
- Replies are shown **under their quack in the feed**, **oldest first**, always visible (no collapsing, no paging). Replies are **not** separate feed items.
- The feed stays ordered by the **top-level quack's creation time, newest first**. A reply never moves its quack.
- The **author or an admin** can delete a reply (same permission rule as deleting a quack today).
- **Deleting a quack without replies** removes it completely, as today (poll options and votes included).
- **Deleting a quack with replies** keeps the replies and erases the quack's content:
  - its text, mood, author and poll (answers and votes) are permanently removed from the database and from every API response;
  - the feed shows a placeholder **"This quack was deleted"** in its original position, with its replies under it, and no author name;
  - the placeholder can still be replied to;
  - the placeholder cannot be deleted again and is not searchable.
- **When the last reply under a placeholder is deleted, the placeholder is removed too**, so no empty "This quack was deleted" entries remain.
- An **admin** deleting any quack follows exactly the same rules as the author.
- **Search and "Mine" filters apply to top-level quacks only**, as today. The replies of every listed quack are shown in full; a match inside a reply does not list its parent.

## UI placement

- **Quack card:** a "Reply" action sits with the quack's other actions. It opens an inline text box (with a character counter and a Post button) directly beneath the quack.
- **Replies:** rendered directly below the quack, indented, oldest first. Each shows the author's name and username, the text and the time. The author and admins see "Delete" on a reply, matching how "Delete" works on quacks.
- **Placeholder:** a muted card reading "This quack was deleted" with the replies beneath it and the same "Reply" action. No author, no mood, no poll, no delete action.

## Out of scope (for this iteration)

- Replying to replies, or any nesting deeper than one level.
- Notifications or "you have a new reply" indicators.
- Reply counts, collapsing threads, paging replies, or a separate thread page.
- Moods or polls on replies.
- Editing a reply.
- Searching reply text, or surfacing a quack because one of its replies matches a filter.
- Bumping a quack in the feed when it receives a reply.
- Deleting an account (there is no such feature yet). When it is built it must handle quacks that have replies explicitly; see Decisions.
- Purging copies outside the application database (backups, logs).

## Acceptance criteria

1. Given a quack in the feed, when I click "Reply", type 1–280 characters and post, my reply appears under that quack, below any earlier replies, with my name.
2. Given an empty or whitespace-only reply, or one over 280 characters, the form shows an error and nothing is posted; the server rejects the same input.
3. Given several replies, they are listed oldest first, and the quack's position in the feed does not change when a reply is added.
4. Given a reply, it has no "Reply" action, and the server rejects a reply addressed to a reply.
5. Given a request that tries to attach a mood or poll to a reply, the server rejects it.
6. Given a quack with no replies, when its author deletes it, it disappears from the feed and its poll data is gone, as today.
7. Given a quack with replies, when its author deletes it, the feed shows "This quack was deleted" in the same position with all replies still under it, and neither the UI nor any API response contains the quack's text, mood, author or poll.
8. Given a deleted quack that had a poll, no poll options or votes for it remain in the database.
9. Given a placeholder, I can still reply to it and my reply appears under it.
10. Given a placeholder, when the last reply under it is deleted, the placeholder disappears from the feed and its row is removed.
11. Given a placeholder with at least one remaining reply, deleting one reply keeps the placeholder.
12. **The delete-vs-reply race is settled in the delete transaction by locking the parent row, with the `Restrict` foreign key as a backstop.** Inserting a reply needs a share lock on its parent, so a concurrent reply waits for the delete to finish and then either lands under the new placeholder or fails because the parent is gone (the person gets a "not found" error). Rejected: catching the foreign-key failure and retrying (a failed statement aborts the Postgres transaction, so the retry needs a second transaction and more code).
13. Given I am an admin, I can delete any quack or reply, with the same outcome as if the author had done it.
14. Given I search for text that appears only inside a reply, the parent quack is not listed; given I search for text in a listed quack, all its replies are still shown.
15. Given "Mine" is on, only top-level quacks I wrote are listed; each still shows all its replies.
16. Given a quack is deleted at the same moment someone replies to it, no row is left half-deleted and a saved reply is never lost: either the reply lands under the new placeholder, or (when the quack had no replies and is removed outright) the person replying gets a "not found" error.
17. Given a deleted quack, searching for words that were in its text returns nothing.

## Decisions

Each decision lists the option we rejected and why.

1. **Replies appear nested under the quack in the feed.** Rejected: a separate thread page (replies not visible in the feed itself, new route) and replies also shown flat in the feed (same text in two places).
2. **One level of replies.** Rejected: unlimited nesting (recursive queries, indentation rules, a deleted middle node leaves a hole) and "reply to a reply flattened with an @name" (a second pointer to maintain for little gain).
3. **A deleted quack with replies becomes a placeholder; its content is erased, not hidden.** Rejected: promoting replies to top-level quacks (they lose the context this story exists to give) and a placeholder that keeps the author's name (leaks who wrote it after they chose to delete it).
4. **Data model: replies are quacks (self-reference `parentId`) plus `deletedAt`; `text` and `userId` become nullable, tied to `deletedAt` by a database `CHECK`.** Rejected: a separate `Reply` table (duplicates delete, moderation, search and "mine" and still needs a nullable tombstone on `Quack`), and splitting `Quack` into anchor plus `QuackContent` (clean NOT NULL columns and structurally real deletion, but every read joins and it rewrites the shipped polls and the migration moves all existing rows). Chosen because it is the smallest change that meets both requirements and keeps one place for posting, deleting and moderation.
5. **The placeholder is purged when its last reply is deleted.** Rejected: keeping it forever (empty placeholders pile up) and hiding empty placeholders in the query (dead rows stay in the database forever).
6. **Replies are text only, 280 characters.** Rejected: text plus mood, and full quack features including polls (polls inside threads multiply what "delete content" must erase and clutter threads).
7. **Search and "Mine" match top-level quacks only; replies ride along.** Rejected: surfacing a parent when a reply matches (extra `EXISTS` in the feed query and the UI must explain why it matched) and filtering replies inside each thread (threads look as if replies are missing).
8. **A placeholder can still be replied to.** Rejected: closing the thread when its quack is deleted. Consequence: a placeholder can live as long as people keep replying; there is no "reply to a deleted quack" error case.
9. **Oldest-first, always visible, feed order unchanged.** Rejected: collapsed behind "N replies" (needs a count and expand state) and bumping a quack on new replies (needs a stored `lastActivityAt`, which is a number we would have to keep in sync, or a `MAX()` on every read).
10. **`parentId` uses `onDelete: Restrict`.** The database refuses to hard-delete a quack that still has replies, so nothing can destroy or orphan replies by accident; the only way to remove a parent's content is the application's delete path. Rejected: `Cascade` (replies vanish, violating the story) and `SetNull` (replies silently become top-level quacks). Consequence: a future "delete account" feature must turn the user's quacks that have replies into placeholders first.
11. **Two rules are enforced in the service, not the database: a reply's parent must itself be top-level, and polls attach only to top-level quacks.** Both would need a trigger or a composite-foreign-key trick that Prisma cannot model. Rejected for now because the API is the only writer, and both rules are covered by tests (criteria 4 and 5). Revisit if anything other than the API ever writes quacks. **This is the one place where `CLAUDE.md`'s "rules live in the database" is not fully met; flagged for review.**
12. **Placeholder purge and the delete-vs-reply race are settled by the database, not by locks in the service.** Because of decision 10, a concurrent reply makes a purge `DELETE` fail on the foreign key (the placeholder stays), and a reply inserted while a quack is being hard-deleted makes that delete fail so the service falls back to making it a placeholder.
13. **No reply count is stored.** It can be counted from rows if a later story needs one.

## Proposed schema

Only `Quack` changes (the `User.quacks` relation stays as is). The `CHECK` constraints are added by hand to the generated migration, because Prisma cannot express them.

```prisma
model Quack {
  id        String     @id @default(cuid())
  // null only on a deleted quack (placeholder)
  text      String?    @db.Text
  mood      QuackMood?
  // null only on a deleted quack (placeholder)
  user      User?      @relation(fields: [userId], references: [id], onDelete: Cascade)
  userId    String?
  // set when this quack is a reply; replies are one level deep
  parent    Quack?     @relation("QuackReplies", fields: [parentId], references: [id], onDelete: Restrict)
  parentId  String?
  replies   Quack[]    @relation("QuackReplies")
  // set when the author or an admin deleted a quack that still has replies
  deletedAt DateTime?
  createdAt DateTime   @default(now())
  updatedAt DateTime   @default(now()) @updatedAt

  pollOptions PollOption[]
  pollVotes   PollVote[]

  @@index([userId])
  @@index([parentId, createdAt])
  @@map("quack")
}
```

```sql
-- appended by hand to the generated migration

-- A live quack has text and an author; a deleted one has neither (and no mood).
ALTER TABLE "quack" ADD CONSTRAINT "quack_deleted_has_no_content" CHECK (
  ("deletedAt" IS NULL AND "text" IS NOT NULL AND "userId" IS NOT NULL)
  OR
  ("deletedAt" IS NOT NULL AND "text" IS NULL AND "userId" IS NULL AND "mood" IS NULL)
);

-- Replies are text only.
ALTER TABLE "quack" ADD CONSTRAINT "quack_reply_has_no_mood" CHECK (
  "parentId" IS NULL OR "mood" IS NULL
);

-- Only a top-level quack can be a placeholder; deleted replies are removed outright.
ALTER TABLE "quack" ADD CONSTRAINT "quack_placeholder_is_top_level" CHECK (
  "deletedAt" IS NULL OR "parentId" IS NULL
);
```

### Design questions

1. **Can everything the user sees be read from this model with simple queries?** Yes.
   - Feed: `quack.findMany({ where: { parentId: null, ...search/mine filters }, orderBy: { createdAt: 'desc' }, include: { user, replies: { orderBy: { createdAt: 'asc' }, include: { user } }, pollOptions (+ vote counts), my pollVotes } })`. Placeholders are the rows with `deletedAt` set; they have no text or author, so search and "Mine" never match them, and they appear unfiltered only because they hold replies.
   - Post a reply: find the parent by id (must exist and have `parentId IS NULL`), then `quack.create({ text, userId, parentId })`.
   - Delete a quack or reply: read `userId, parentId` and the reply count for the target (see 3).
   - Reply count, if ever needed: `count where parentId = X`; not stored.
2. **Is anything stored twice?** One thing: "deleted" is visible both as `deletedAt IS NOT NULL` and as `text IS NULL AND userId IS NULL`. Both are kept because the first is the readable flag and the second is the proof that the content is gone; the `quack_deleted_has_no_content` CHECK makes it impossible for them to disagree. Nothing else is duplicated: vote counts, reply counts and the viewer's vote are derived on read.
3. **What happens to related rows when a quack is deleted?**
   - No replies: the row is deleted; its poll options and votes cascade away (as today).
   - Has replies: one transaction deletes its poll options (their votes cascade) and updates the row to `text = NULL, mood = NULL, userId = NULL, deletedAt = now()`. The row stays because the replies point at it, so the poll rows must be deleted explicitly, since the cascade only fires when the quack row itself is deleted.
   - Deleting a reply: the reply row is deleted; then if its parent has `deletedAt` set and no other replies, the parent is deleted too.
   - Races: the delete transaction locks the parent row first, so a concurrent reply waits and then lands under the placeholder or is refused with "not found". The `Restrict` foreign key is a backstop if the locking is ever bypassed.
   - Deleting a user row (no such feature yet): their quacks are removed through `onDelete: Cascade`; `Restrict` makes that fail for a quack that still has replies, so that feature has to produce placeholders first.
4. **Will the migration run on a production database that already has data?** Yes, with no backfill. It only drops NOT NULL on `text` and `userId`, adds two nullable columns, an index and a foreign key, then adds the three CHECKs. Every existing row has `text` and `userId` set, `deletedAt` and `parentId` null, so it satisfies all three CHECKs when they are validated. Adding the CHECKs takes a brief table lock while Postgres scans the table; at this app's size that is negligible (for a very large table use `ADD CONSTRAINT … NOT VALID` followed by `VALIDATE CONSTRAINT`). This is reasoning from the schema, not yet run: the migration should be applied to a copy of a seeded database before merge.

## Where it lands in the code

- **Backend, `apps/backend/src/modules/quack`** (same module, no new module): `QuackRepository` (feed includes `replies`, `createReply`, delete with the placeholder and purge transaction), `QuacksService` (reply validation and the delete logic; `getAuthorId` must handle a placeholder, which has no author, by answering 404), `QuacksController` (`POST /api/quacks/:quackId/replies`; the existing `DELETE /api/quacks/:quackId` handles replies and placeholders), DTOs (`CreateReplyDto`; `QuackResponseDto` gains `replies` and `deleted`, and `text`, `mood`, `author` become absent for a placeholder), domain `Quack` type (nullable content, `replies`).
- **Existing features touched:** delete own quack, admin moderation delete, polls (explicit poll cleanup on delete), search and "Mine" (add `parentId: null`), the seed (add sample replies, one thread under a deleted quack), the e2e specs for delete and moderation.
- **Frontend, `apps/frontend/src/features/quack`:** zod schema (replies, `deleted` flag), a reply form, a reply list, the placeholder card, and a TanStack Query mutation that updates the feed cache. All controls come from `src/components/ui/`, following `DESIGN.md` (no nested cards for replies: indentation, not boxes).
