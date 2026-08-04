import { NextResponse } from "next/server";

import { clearAuthResponseCookies } from "@/features/auth/auth-cookie.response";
import { getAuthRuntimeConfig } from "@/features/auth/auth.config";
import { signOutSupabase } from "@/features/auth/supabase-auth.service";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const config = getAuthRuntimeConfig();
  if (config.provider === "supabase") await signOutSupabase(request);
  const response = NextResponse.json({ ok: true });
  clearAuthResponseCookies(response);
  return response;
}
