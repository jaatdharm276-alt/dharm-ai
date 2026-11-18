import { NextResponse } from "next/server";
import { clearGitHubCookies } from "../../../../lib/orion-github-app.mjs";

export const runtime = "nodejs";

export async function POST() {
  const response = NextResponse.json({ connected: false, disconnected: true });
  for (const cookie of clearGitHubCookies()) response.headers.append("Set-Cookie", cookie);
  return response;
}
