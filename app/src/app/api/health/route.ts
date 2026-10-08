import { NextResponse } from "next/server";
import { hasServerCredential,serverRequiresByok } from "@/lib/llm";
import { serverModelHealth } from "@/lib/server-model-health";

export const dynamic = "force-dynamic";

/**
 * Safe connection flags and anonymous budget numbers, never credentials. Lets the client tell
 * the difference between "this deployment has a model" and "you need to bring
 * your own", so a keyless clone can guide instead of throwing 503s.
 */
export async function GET(request: Request) {
  return NextResponse.json(
    { serverKey: hasServerCredential(), requireByok: serverRequiresByok(), ...await serverModelHealth(new URL(request.url).searchParams.get("retry") === "1") },
    { headers: { "Cache-Control": "no-store" } },
  );
}
