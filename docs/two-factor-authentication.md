# Two-Factor Authentication

Two-factor authentication (2FA) adds a second step to sign-in so that a stolen password alone can't unlock your account. Tessera uses time-based one-time codes from an authenticator app.

## Supported methods

Tessera supports **TOTP authenticator apps** such as Google Authenticator, 1Password, Authy, and Microsoft Authenticator. Any standard TOTP app works.

> **Note:** Tessera does **not** offer SMS text-message codes for 2FA. App-based codes are more secure because they can't be intercepted by SIM-swapping. For a passwordless option, see passkeys in the Account and Security guide.

## Turning on 2FA

1. Go to **Settings → Security → Two-factor authentication**.
2. Click **Enable** and scan the QR code with your authenticator app, or enter the setup key manually.
3. Type the 6-digit code from your app to confirm.
4. Save your recovery codes (see below).

Once enabled, you'll enter a 6-digit code from your app each time you sign in on a new device.

## Recovery codes

When you enable 2FA, Tessera generates **10 single-use recovery codes**. Store them somewhere safe — a password manager is ideal. Each code works once and lets you sign in if you lose access to your authenticator app.

You can regenerate a fresh set at any time under **Settings → Security → Two-factor authentication → Recovery codes**. Regenerating invalidates the previous set immediately.

## Trusted devices

After signing in with 2FA, you can mark a device as **trusted** to skip the code on that device for **30 days**. Trusted-device status is cleared whenever you change your password or sign out everywhere.

## If you lose your device

Use one of your **recovery codes** to sign in, then disable and re-enable 2FA with your new device. If you've also lost your recovery codes, contact **support@tessera.app** from your account's verified email address; identity verification can take up to **3 business days**.

## Requiring 2FA for a team

On **Team** and **Business** plans, an admin can require 2FA for all members under **Admin console → Security**. Members without 2FA are prompted to set it up the next time they sign in and cannot access spaces until they do.
