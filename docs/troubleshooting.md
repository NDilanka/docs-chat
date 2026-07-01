# Troubleshooting

Common problems and how to fix them. If none of these help, email **support@tessera.app** with your account email and a description of what you saw.

## A note isn't syncing

1. Check the sync dot in the top bar — hollow means a sync is in progress.
2. Confirm you're online and not behind a firewall blocking **api.tessera.app**.
3. Reload the app (**Cmd/Ctrl + R** on the web) to force a fresh sync.
4. On mobile, make sure background app refresh is allowed for Tessera.

Edits are never lost while offline; they're queued locally and merge when the connection returns.

## I can't sign in

- Double-check your email and that **Caps Lock** is off.
- If you use 2FA, make sure your authenticator app's clock is accurate — TOTP codes fail if the device clock drifts more than about 30 seconds.
- Use a **recovery code** if you've lost your authenticator.
- Reset your password from the **Forgot password?** link on the sign-in page. Reset links expire after **60 minutes**.

## A note seems to have disappeared

- Look in **Trash** — it may have been deleted. Notes are recoverable for 30 days.
- Use search; the note may have been moved to another folder or space.
- Check the space's **Archived** list under **Settings → Spaces**.

## The editor is slow or laggy

- Very large notes (near the 5 MB limit) can slow down; split long notes into linked pages.
- Disable browser extensions that inject content into pages, which can conflict with the editor.
- Clear the app cache from **Settings → Advanced → Clear cache**; this never deletes your content.

## Images won't upload

- Confirm the file is under your plan's upload limit (50 MB on Free, up to 500 MB on Business).
- Check that the format is supported (PNG, JPG, GIF, WebP, SVG).
- If you're over your storage quota, free space or upgrade — uploads are blocked when storage is full.

## A teammate can't see a note

- Verify their **role** in the space (a Viewer can read but not edit).
- For a note shared individually, confirm they were added to that specific note.
- Pending invitations expire after 7 days; re-invite if needed.

## Checking system status

If something looks broken across the whole app, check **status.tessera.app** for current incidents and maintenance windows before filing a report.
