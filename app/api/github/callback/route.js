import { NextResponse } from "next/server";
import { clearGitHubStateCookie, createInstallationCookie, createInstallationToken, verifyGitHubState } from "../../../../lib/orion-github-app.mjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request) {
  const url = new URL(request.url);
  const installationId = url.searchParams.get("installation_id");
  const state = url.searchParams.get("state");
  const stateCookie = request.cookies.get("orion_github_oauth_state")?.value;
  const origin = url.origin;

  if (!installationId || !state || !verifyGitHubState(state, stateCookie)) {
    const response = NextResponse.redirect(new URL("/agents?github=invalid_state", origin));
    for (const cookie of clearGitHubCookies()) response.headers.append("Set-Cookie", cookie);
    return response;
  }

  try {
    await createInstallationToken(installationId);
    const response = NextResponse.redirect(new URL("/agents?github=connected", origin));
    response.headers.append("Set-Cookie", createInstallationCookie(installationId));
    response.headers.append("Set-Cookie", clearGitHubStateCookie());
    return response;
  } catch {
    return NextResponse.redirect(new URL("/agents?github=configuration_error", origin));
  }
}
