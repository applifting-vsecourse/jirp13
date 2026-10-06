# User Story: Search quacks

## Story

As a user browsing the quack feed,
I want to type a word or a name into a search box,
so that I can find a specific post I remember without scrolling through the whole feed.

## Why

Users report they can't find a post they saw last week. They typically remember either a word from the post or who wrote it. This is an MVP to validate whether people actually use search before investing in anything more advanced.

## Scope

- Search applies to **all posts in the feed** (not just the current user's own posts).
- A single search input filters posts where the **search term appears in the post text OR the author's name**, matched as a **case-insensitive substring** (e.g. "quack" matches "Quack!" and "unquackable").
- Filtering is **live**: the list updates automatically a short moment after the user stops typing (debounced), with no separate search button.
- Filtering only kicks in once the query is **at least 2 characters** long. Below that, the full feed is shown.
- Clearing the search box (or dropping below 2 characters) restores the full, unfiltered feed.
- If no posts match, the feed area shows a simple "no matches" message instead of an empty list.

## UI placement

- The search input sits at the **top of the feed, always visible** (not behind a toggle), alongside/below the existing post form.

## Out of scope (for this iteration)

- Fuzzy matching, typo tolerance, or ranking by relevance.
- Whole-word-only matching.
- Searching anything other than post text and author name (e.g. dates, tags).
- Highlighting the matched term in results.
- Persisting the search query across page reloads or in the URL.
- Pagination/infinite scroll changes — filtering applies to whatever the feed already loads.

## Acceptance criteria

1. Given the feed is showing posts, when I type 1 character into the search box, the feed remains unfiltered.
2. Given the feed is showing posts, when I type 2+ characters that match a substring of a post's text (any case), that post appears in the filtered list.
3. Given the feed is showing posts, when I type 2+ characters that match a substring of an author's name (any case), that author's posts appear in the filtered list.
4. Given a search term with no matches, the feed shows a "no matches" message instead of an empty list.
5. Given text in the search box, when I clear it, the full feed reappears.
6. Typing does not require pressing Enter or a button — the list updates on its own shortly after I stop typing.
