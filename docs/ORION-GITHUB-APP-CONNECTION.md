# ORION GitHub App connection

This feature connects the current browser to a GitHub App installation and verifies the repositories that installation can access.

## Server-only environment variables

Set these on the Vercel project (Production and Preview as appropriate), then redeploy:

- `GITHUB_APP_ID`: numeric App ID from GitHub App settings (not the Client ID).
- `GITHUB_APP_SLUG`: URL slug of the GitHub App, used for the installation URL.
- `GITHUB_APP_PRIVATE_KEY`: complete PEM private key. In Vercel, paste the PEM including BEGIN/END lines; if entering a single line, preserve newlines as literal `\\n`.
- `GITHUB_APP_SESSION_SECRET`: random secret with at least 32 characters, used to sign HttpOnly browser cookies.

Never prefix these with `NEXT_PUBLIC_`, put them in source control, or send them to the browser.

## GitHub App registration: important URL and redirect settings

The GitHub App has one global **Setup URL**. It must point to the deployment that is currently handling the connection:

- Production: `https://dharm-ai.vercel.app/api/github/callback`
- Preview testing: use the stable branch alias for the Preview deployment, followed by `/api/github/callback`. Do not use a one-off deployment URL because it changes on each deployment.

Set this in **GitHub App → General → Post installation → Setup URL**. Do not put the callback URL in the Webhook URL field. Webhooks are not used by this browser connection; leave Webhook Active off unless a separate webhook feature is implemented.

Enable **Redirect on update**. This matters when the app is already installed: GitHub can open the existing installation's settings instead of completing the callback immediately. After enabling this option, a real installation update must occur for GitHub to redirect to the Setup URL. Do not broaden repository access to force an update; keep the installation restricted to the intended repositories.

After changing the global Setup URL or redirect setting, verify the target deployment is reachable. When switching from Preview testing to Production, change the Setup URL back to the Production callback.

**Important for an already-installed App:** opening the installation settings page is not the callback. The Setup URL is a GitHub App registration setting (not an ORION route that can be fixed by retrying the connect button). Set the exact Production URL above under GitHub App → General → Post installation → Setup URL, turn on Redirect on update, and save the App configuration. Then open ORION /agents and connect again. If GitHub presents the existing installation settings, use its Save button without changing or broadening the selected repository list; GitHub should then return to the Setup URL. The Control Room must show a repository list before the connection is considered complete.

## Required repository permissions

- Metadata: Read-only (required)
- Contents: Read-only
- Pull requests: Read-only
- Actions: Read-only

Install the App only on the repositories you intend ORION to see. The code requests a short-lived installation token scoped to these read permissions. It does not request repository write permissions.

## Connect and verify

1. Open ORION's Agent Control Room at `/agents` on the same deployment whose callback is configured as the Setup URL.
2. Choose **Connect GitHub App**.
3. If GitHub opens the existing installation settings instead of returning to ORION, do not uninstall the App or grant all repositories. Confirm the Setup URL and Redirect on update settings above, then complete a safe installation update while keeping the selected repository list unchanged.
4. GitHub should redirect to `/api/github/callback`. ORION validates the one-time signed state, exchanges the installation ID for a short-lived installation token, and verifies the installation.
5. The browser receives a signed, HttpOnly, Secure, SameSite=Lax cookie containing the installation ID (never the token).
6. The status endpoint mints a fresh installation token server-side and lists accessible repositories. Tokens are never returned to the browser.
7. **Disconnect GitHub** clears the browser's installation cookie. Revoke the installation in GitHub App settings to remove GitHub-side access.

Do not call this connected until the Agent Control Room shows the repository list and the status endpoint succeeds.

## Security boundary and current limitations

- The current connection is browser-session scoped; it is not a global server-side installation registry and does not establish a separate GitHub user OAuth identity.
- Repository access is read-only. No clone, file write, branch push, commit, PR, merge, or deployment action is exposed by this connection yet.
- Every installation token is short-lived and generated server-side. Only installation ID and signed state are stored in cookies.
- Add a real application user-authentication layer and per-user server-side connection storage before using this for a public multi-user production service.
