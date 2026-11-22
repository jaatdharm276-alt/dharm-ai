import { NextResponse } from "next/server";
import { clearGitHubStateCookie, createInstallationCookie, createInstallationToken, verifyGitHubState } from "../../../../lib/orion-github-app.mjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request) {
  const url = new URL(request.url);
  const origin = url.origin;

  try {
    const installationId = url.searchParams.get("installation_id");
    const state = url.searchParams.get("state");
    const stateCookie = request.cookies.get("orion_github_oauth_state")?.value;

    if (!installationId || !/^\\d{1,20}$/.test(installationId) ||
        !state || !verifyGitHubState(state, stateCookie)) {
      const response = NextResponse.redirect(new URL("/agents?github=invalid_state", origin));
      response.headers.append("Set-Cookie", clearGitHubStateCookie());
      return response;
    }

    // Validate the installation before creating a browser session.
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
