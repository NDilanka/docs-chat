# Integrations

Connect Tessera to the other tools your team uses. Manage every connection under **Settings → Integrations**. Most integrations require the **Plus** plan or higher; Slack and the Web Clipper work on every plan.

<!-- Screenshots for each integration are added in the design pass; placeholders omitted here. -->

## Slack

Link a Slack workspace to:

- Receive notifications for mentions, assignments, and comments in chosen Slack channels.
- Use the **/tessera** slash command to capture a quick note or task into a space without leaving Slack.
- Unfurl Tessera links pasted in Slack into rich previews showing the note title and a snippet.

Connect from **Settings → Integrations → Slack** and authorize the workspace.

## Google Calendar

Show tasks that have due dates on your Google Calendar. The sync is **one-way**, from Tessera to Calendar: completing or rescheduling a task updates the calendar event, but editing the event in Google does not change the task. Choose which spaces feed the calendar during setup.

## Google Drive

Attach Google Drive files to a note as live embeds. Embedded Drive files show their current title and thumbnail and open in Drive when clicked. Tessera never copies the file's contents; it stores only a link, so Drive permissions still apply.

## Zapier

The Zapier integration exposes triggers (such as **New note**, **Task completed**) and actions (such as **Create note**, **Create task**) so you can automate workflows across thousands of apps without writing code.

## Webhooks

Send real-time events to your own endpoint. Create a webhook under **Settings → Integrations → Webhooks** and subscribe to events including `note.created`, `note.updated`, `note.deleted`, `task.created`, `task.completed`, and `comment.created`. Each delivery is signed with an `X-Tessera-Signature` header (HMAC-SHA256) you can verify with your webhook's secret. Failed deliveries retry with exponential backoff for up to 24 hours.

## Web Clipper

The **Tessera Web Clipper** browser extension saves web pages, selections, and bookmarks straight into a space. It's available for Chrome, Firefox, and Edge. Clip a full article as clean Markdown, a simplified reader view, or a URL bookmark with a screenshot.

## Import

Bring existing content in from **Settings → Import**. Tessera imports from **Markdown** files and folders, **Evernote** (`.enex`), **Notion** (Markdown/CSV export), and plain **CSV** for tasks. Imports preserve folder structure where possible and run in the background.
