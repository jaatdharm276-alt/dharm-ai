import { NextResponse } from "next/server";
import { createGitHubState, getGitHubAppSlug } from "../../../../lib/orion-github-app.mjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Alternate public entry point for GitHub installation. Kept outside /api
// so the browser can start the flow through a regular app route as well.
export async function GET() {
  try {
    const { state, cookie } = createGitHubState();
    const installUrl = new URL(`https://github.com/apps/${encodeURIComponent(getGitHubAppSlug())}/installations/new`);
    installUrl.searchParams.set("state", state);
    const response = NextResponse.redirect(installUrl);
    response.headers.append("Set-Cookie", cookie);
    return response;
  } catch (error) {
    return NextResponse.json(
      { connected: false, error: error.message || "GitHub App is not configured." },
      { status: 503 }
    );
  }
}
