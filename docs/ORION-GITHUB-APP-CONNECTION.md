# ORION GitHub App connection

This feature connects the current browser to a GitHub App installation and verifies the repositories that installation can access.

## Server-only environment variables

Set these on the Vercel project (Production and Preview as appropriate), then redeploy:

- `GITHUB_APP_ID`: numeric App ID from GitHub App settings (not the Client ID).
- `GITHUB_APP_SLUG`: URL slug of the GitHub App, used for the installation URL.
- `GITHUB_APP_PRIVATE_KEY`: complete PEM private key. In Vercel, paste the PEM including BEGIN/END lines; if entering a single line, preserve newlines as literal `\n`.
- `GITHUB_APP_SESSION_SECRET`: random secret with at least 32 characters, used to sign HttpOnly browser cookies.

Never prefix these with `NEXT_PUBLIC_`, put them in source control, or send them to the browser.

## GitHub App registration

Configure the App's **Setup URL** (not its OAuth Callback URL) to:

`https://dharm-ai.vercel.app/api/github/callback`

The App needs repository permissions:
- Metadata: Read-only (required)
- Contents: Read-only
- Pull requests: Read-only
- Actions: Read-only

Install the App only on the repositories you intend ORION to see. The code requests a short-lived installation token scoped to these read permissions. It does not request repository write permissions.

## Connect and verify

1. Open ORION's Agent Control Room at `/agents`.
2. Choose **Connect GitHub App** and approve the App installation for selected repositories.
3. GitHub redirects to the callback. ORION validates the one-time signed state, exchanges the installation ID for a short-lived installation token, and verifies the installation.
4. The browser receives a signed, HttpOnly, Secure, SameSite=Lax cookie containing the installation ID (never the token).
5. The status endpoint mints a fresh installation token server-side and lists accessible repositories. Tokens are never returned to the browser.
6. **Disconnect GitHub** clears the browser's installation cookie. Revoke the installation in GitHub App settings to remove GitHub-side access.

## Security boundary and current limitations

- The current connection is browser-session scoped; it is not a global server-side installation registry and does not establish a separate GitHub user OAuth identity.
- Repository access is read-only. No clone, file write, branch push, commit, PR, merge, or deployment action is exposed by this connection yet.
- Every installation token is short-lived and generated server-side. Only installation ID and signed state are stored in cookies.
- Do not call this connected until the status endpoint successfully returns the installation's repository list.
- Add a real application user-authentication layer and per-user server-side connection storage before using this for a public multi-user production service.
