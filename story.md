# User Story: Moderator deletes any quack

## Story

As a moderator (the admin),
I want to delete any quack in the feed,
so that I can remove abusive posts when their author won't.

## Why

Someone started posting nasty quacks. Their author won't delete them, and right now nobody else can. Moderation is the smallest fix: one trusted role that can remove any post.

## Scope

- Users with the existing `admin` role can delete **any** quack, not only their own.
- The admin sees a **Delete** action on every quack, on both the **All** and **Mine** tabs (Mine still lists only the admin's own quacks).
- The admin gets the same confirmation step as for their own quacks. When the quack belongs to someone else, the dialog says so ("This quack was posted by someone else. Deleting it removes it for everyone.").
- The rule is enforced on the server: `DELETE /api/quacks/:id` succeeds for the author or an admin and returns `403` for anyone else.
- The author is **not** notified and nothing is recorded: the quack is simply deleted.
- The seeded account `admin@example.com` has the admin role and is used to try this out.

## UI placement

- The same **Delete** button that authors already see on their own quacks, now also shown to the admin on everyone's quacks.

## Out of scope

- Creating, assigning or removing roles, or any admin screen.
- Notifying the author, an audit log, or a "removed by moderator" placeholder.
- Moderator powers other than deleting quacks (editing, banning, hiding).
- A separate "moderator" role, or any role other than `admin`.
- Undoing a delete.

## Acceptance criteria

1. Given I am signed in as the admin, when I look at the feed, every quack has a Delete action, on the All tab and on the Mine tab.
2. Given I am signed in as a regular user, when I look at the feed, only my own quacks have a Delete action.
3. Given I am the admin and open Delete on someone else's quack, the dialog tells me the quack is not mine and asks me to confirm.
4. Given I confirm, the quack disappears from the feed for everyone.
5. Given I am a regular user, when I call `DELETE /api/quacks/:id` on someone else's quack, the API returns `403` and the quack stays.
6. Given I am the admin, when I call `DELETE /api/quacks/:id` on someone else's quack, the API returns `204` and the quack is gone.
7. Given I am signed out, `DELETE /api/quacks/:id` returns `401`, as today.
