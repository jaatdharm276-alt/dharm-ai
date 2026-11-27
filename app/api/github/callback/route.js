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
    const stateCookie = request.cookies.get("orion_github_oauth_state")?.value;

    // OAuth-style callbacks echo state. GitHub's Post installation Setup URL
    // instead supplies installation_id only, so require the short-lived,
    // signed browser cookie created by /api/github/connect for that flow.
    const validBrowserFlow = state
      ? verifyGitHubState(state, stateCookie)
      : hasValidGitHubStateCookie(stateCookie);

    if (!isValidGitHubInstallationId(installationId) || !validBrowserFlow) {
      const response = NextResponse.redirect(new URL("/agents?github=invalid_state", origin));
      response.headers.append("Set-Cookie", clearGitHubStateCookie());
      return response;
    }

    // Confirm this installation belongs to this GitHub App before creating
    // the browser session; never trust installation_id by itself.
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
