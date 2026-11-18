import { NextResponse } from "next/server";
import { listInstallationRepositories, readInstallationId } from "../../../../lib/orion-github-app.mjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request) {
  try {
    const installationId = readInstallationId(request.headers.get("cookie") || "");
    if (!installationId) return NextResponse.json({ connected: false, repositories: [] });
    const result = await listInstallationRepositories(installationId);
    return NextResponse.json({ connected: true, installationId, ...result }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const status = error.status === 401 || error.status === 404 ? 401 : 503;
    return NextResponse.json({ connected: false, error: error.message || "Could not verify GitHub installation." }, { status });
  }
}
