import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { AUTH_COOKIE_NAME, verifyAdminToken } from "@/lib/auth";

export async function requireAdmin() {
  const token = (await cookies()).get(AUTH_COOKIE_NAME)?.value;
  if (!token) {
    return NextResponse.json(
      { ok: false, error: "Unauthorized" },
      { status: 401 },
    );
  }

  try {
    await verifyAdminToken(token);
    return null;
  } catch {
    return NextResponse.json(
      { ok: false, error: "Unauthorized" },
      { status: 401 },
    );
  }
}

export function errorResponse(error, fallback = "Request failed") {
  const status = Number(error?.status) || 500;
  const message = error instanceof Error ? error.message : fallback;
  return NextResponse.json(
    { ok: false, error: message || fallback },
    { status },
  );
}
