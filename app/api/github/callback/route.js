import { NextResponse } from "next/server";
import { clearGitHubCookies, createInstallationCookie, verifyGitHubState } from "../../../../lib/orion-github-app.mjs";

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
    const response = NextResponse.redirect(new URL("/agents?github=connected", origin));
    response.headers.append("Set-Cookie", createInstallationCookie(installationId));
    for (const cookie of clearGitHubCookies()) response.headers.append("Set-Cookie", cookie);
    return response;
  } catch {
    return NextResponse.redirect(new URL("/agents?github=configuration_error", origin));
  }
}
