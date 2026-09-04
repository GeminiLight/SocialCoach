import { NextResponse } from "next/server";
import { hasServerCredential } from "@/lib/llm";

export const dynamic = "force-dynamic";

/**
 * Booleans only — never any part of the credential itself. Lets the client tell
 * the difference between "this deployment has a model" and "you need to bring
 * your own", so a keyless clone can guide instead of throwing 503s.
 */
export function GET() {
  return NextResponse.json(
    { serverKey: hasServerCredential(), requireByok: process.env.LLM_REQUIRE_BYOK === "true" },
    { headers: { "Cache-Control": "no-store" } },
  );
}
