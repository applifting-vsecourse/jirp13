# Architecture Decision Records

One file per decision that is hard to undo or affects more than one feature. Check this index before changing the data model or the structure of the app.

| #                                                   | Title                                                               | Status   | Summary                                                                                                                                                                                |
| --------------------------------------------------- | ------------------------------------------------------------------- | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [0001](0001-replies-as-quacks-with-placeholders.md) | Replies are quacks; deleted quacks with replies become placeholders | Accepted | Replies live in the `quack` table via `parentId`, and a deleted quack that still has replies is kept as a content-free placeholder so the replies survive while its content is erased. |
