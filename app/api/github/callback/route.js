import { NextResponse } from "next/server";
import { clearGitHubStateCookie, createInstallationCookie, createInstallationToken, hasValidGitHubStateCookie, isValidGitHubInstallationId, verifyGitHubState } from "../../../../lib/orion-github-app.mjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request) {
  const url = new URL(request.url);
  const origin = url.origin;

  try {
    const installationId = url.searchParams.get("installation_id");
    const state = url.searchParams.get("state");
    const setupAction = url.searchParams.get("setup_action");
    const stateCookie = request.cookies.get("orion_github_oauth_state")?.value;

    // OAuth-style callbacks must echo and verify the state created by /connect.
    // GitHub's Post installation Setup URL is also invoked directly after an
    // install/update from GitHub settings; those callbacks carry setup_action
    // (install|update), but may not have our browser state cookie. They are
    // accepted only after the installation is cryptographically authenticated
    // with this GitHub App's JWT below.
    const validBrowserFlow = state
      ? verifyGitHubState(state, stateCookie)
      : (setupAction === "install" || setupAction === "update")
        ? true
        : hasValidGitHubStateCookie(stateCookie);

    if (!isValidGitHubInstallationId(installationId) || !validBrowserFlow) {
      const response = NextResponse.redirect(new URL("/agents?github=invalid_state", origin));
      response.headers.append("Set-Cookie", clearGitHubStateCookie());
      return response;
    }

    // This API call proves the installation belongs to this GitHub App.
    // Never issue a browser session based on installation_id alone.
    await createInstallationToken(installationId);
    const response = NextResponse.redirect(new URL("/agents?github=connected", origin));
    response.headers.append("Set-Cookie", createInstallationCookie(installationId));
    response.headers.append("Set-Cookie", clearGitHubStateCookie());
    return response;
  } catch (error) {
    const response = NextResponse.redirect(new URL("/agents?github=configuration_error", origin));
    try {
      response.headers.append("Set-Cookie", clearGitHubStateCookie());
    } catch {
      // Keep the safe failure redirect even when configuration is incomplete.
    }
    return response;
  }
}
