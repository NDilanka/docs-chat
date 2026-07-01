# Account and Security

This page covers your profile, password, active sessions, and the organization-level security controls on Team and Business plans. Two-factor authentication has its own dedicated guide.

## Your profile

Edit your name, photo, and preferred time zone under **Settings → Profile**. Your time zone affects reminder delivery, due-date display, and email digest timing.

## Password

Passwords must be at least **10 characters**. Change yours under **Settings → Security → Password**; you'll be asked for your current password first. Changing your password signs out all other sessions automatically.

If you sign in only with Google or Apple, you don't have a Tessera password unless you choose to set one.

## Active sessions

**Settings → Security → Active sessions** lists every device currently signed in to your account, with its browser or app, approximate location, and last-active time. Click **Sign out** next to any session to end it, or **Sign out everywhere** to end all sessions except the one you're using.

Sessions expire automatically after **30 days** of inactivity. Signing out of a session immediately revokes its access.

## Passkeys

Tessera supports **passkeys** (WebAuthn) for passwordless sign-in using your device's fingerprint, face, or hardware security key. Add a passkey under **Settings → Security → Passkeys**. Passkeys can be used on their own or as a second factor.

## Single sign-on (SSO)

On the **Business** plan, administrators can enforce **SAML-based SSO** with identity providers such as Okta, Microsoft Entra ID, or Google Workspace. Configure it under **Admin console → Security → SSO**. When SSO is enforced, members sign in through your identity provider and local passwords are disabled.

## SCIM provisioning

Business organizations can connect **SCIM** to automatically create, update, and deactivate member accounts from their identity provider, so removing someone there immediately revokes their Tessera access.

## Admin console

Team and Business owners and admins manage members, roles, security policy, and billing from the **Admin console**. From here you can require two-factor authentication for all members, set a session length policy, and review the audit log.

## Audit log

The **audit log** records sign-ins, permission changes, space creation and deletion, exports, and member changes. Team retains **90 days** of audit history; Business retains **1 year**. Export the log as CSV from the admin console.

## Account deletion

Delete your account under **Settings → Account → Delete account**. This is permanent and removes your personal space and content after a **30-day** grace period, during which you can still recover it by signing back in.
