# Search

Search is the fastest way to find anything in Tessera. It indexes note titles, body text, task titles, comments, and the text inside attached PDFs.

## Running a search

Press **Cmd/Ctrl + Shift + F** to open full search, or **Cmd/Ctrl + K** for the quick command palette, which searches as you type. Results are ranked by relevance and recency, and update live with each keystroke.

The search results page shows up to **100 results** per query. Each result displays the note title, the space it lives in, and a snippet with your search terms highlighted.

## Search operators

Refine a search by combining operators:

- `in:"Marketing"` — limit to a specific space
- `tag:#roadmap` — only notes or tasks with a tag
- `from:@dana` — content created by a person
- `is:task` or `is:note` — limit to one object type
- `created:>2026-01-01` — created after a date
- `updated:<2026-06-01` — last edited before a date
- `has:attachment` — notes that contain a file
- `"exact phrase"` — match an exact phrase

Operators can be combined, for example: `in:"Engineering" tag:#bug is:task updated:>2026-06-01`.

## Filters

The left rail of the search page offers click-to-apply filters for **Space**, **Type**, **Tag**, **Assignee**, and **Date range**. Filters and typed operators stack together.

## Saved searches

Save any query — including its filters — as a **saved search**. Saved searches appear under **Search** in the sidebar and re-run live each time you open them, so a query like "open bugs assigned to me" always reflects the current state.

## Sorting results

Sort results by **Relevance** (default), **Last edited**, or **Created date** using the control at the top-right of the results page.

## Indexing and limits

New and edited content is searchable within a few seconds. Text inside PDFs up to **40 MB** is indexed automatically; scanned image-only PDFs are not searched because Tessera does not perform OCR. Advanced operators such as `from:` and `has:` require the **Plus** plan or higher.
