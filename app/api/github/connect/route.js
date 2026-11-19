import { NextResponse } from "next/server";
import { createGitHubState, getGitHubAppSlug } from "../../../../lib/orion-github-app.mjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request) {
  try {
    const { state, cookie } = createGitHubState();
    const installUrl = new URL(`https://github.com/apps/${encodeURIComponent(getGitHubAppSlug())}/installations/new`);
    installUrl.searchParams.set("state", state);
    const response = NextResponse.redirect(installUrl);
    response.headers.append("Set-Cookie", cookie);
    return response;
  } catch (error) {
    return NextResponse.json({ connected: false, error: error.message || "GitHub App is not configured." }, { status: 503 });
  }
}
