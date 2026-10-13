# User Story: Polls on quacks

## Story

As a user writing a quack,
I want to attach a few answer choices to it and let other users pick one,
so that we can settle a question like "where do we go for lunch?" without counting replies by hand.

## Why

People ask questions in posts and then count the replies manually. Someone always gets the numbers wrong, and the post gets buried under replies. This is an MVP to validate whether people actually use polls before investing in anything more advanced.

## Scope

- A **quack can optionally have a poll attached**. The **quack text is the question**; there is no separate question field. A quack may have both a mood and a poll.
- A poll has **2 to 6 answers**, each **at most 50 characters**. Answers are trimmed, must be non-empty, and must be unique (case-insensitive). The same rules are enforced by the server and shown in the form.
- A poll is **fixed once posted**: no editing of question or answers, no deleting a poll separately from its quack. The poll **never closes**.
- Every signed-in user, **including the author**, can vote.
- **One user, one vote per poll.** A user can **change** their vote by clicking another answer, and **remove** it by clicking their currently selected answer again.
- **Results are always visible** to everyone, before and after voting. Each answer shows its **vote count and a proportional percentage bar**; the current user's pick is highlighted.
- **Voter identities are not shown**, only totals.
- Counts come from the server and are **correct on page load and after the user's own vote**. There is no live push of other people's votes.
- Voting is **optimistic**: the click updates the UI instantly. If the request fails, the UI **rolls back to the server state** and an **error toast** says the vote didn't go through.
- Concurrent or repeated voting must never produce more than one vote per user per poll, and counts must match the stored votes.

## UI placement

- **Post form:** an "Add poll" toggle (off by default) reveals the answer inputs. It starts with 2 empty answers; "Add answer" adds up to 6; answers can be removed down to 2. Turning the toggle off discards the answers.
- **Feed:** the poll renders inside its quack, below the quack text, as a list of answer rows (label, bar, count/percentage) that act as buttons.

## Out of scope (for this iteration)

- Editing or deleting a poll, closing a poll, or expiry times.
- Multiple-choice (several answers per user) polls.
- Showing who voted for what.
- Live updates, polling or websockets for other people's votes.
- Searching by answer text (search still matches quack text and author name only).
- Hiding results until the user has voted.
- Notifications, sorting or filtering by poll activity.

## Acceptance criteria

1. Given the post form, when I turn on "Add poll", two empty answer inputs appear; I can add answers up to 6 and remove them down to 2.
2. Given a poll with fewer than 2 valid answers, an empty or over-50-character answer, or duplicate answers (case-insensitive), the form shows a clear error and the quack is not posted; the server rejects the same input.
3. Given a valid quack with a poll, when I post it, it appears in the feed with all answers at 0 votes.
4. Given a poll I have not voted on, when I click an answer, my vote appears immediately (count +1, answer highlighted, bars updated).
5. Given I have voted, when I click a different answer, my vote moves: the old answer's count drops by 1 and the new one's rises by 1, with no moment of two votes.
6. Given I have voted, when I click my selected answer again, my vote is removed and the count drops by 1.
7. Given a vote request fails, the poll reverts to the server's state and an error toast says the vote didn't go through.
8. Given I vote twice quickly or from two tabs, the poll still has at most one vote from me, and the counts shown equal the stored votes.
9. Given any user opens the feed, they see the same counts and percentage bars for a poll; only their own pick is highlighted, and no voter names are shown.
10. Given the author of a poll, they can vote on it like anyone else.
11. Given a quack without a poll, the feed and post form behave as before.
