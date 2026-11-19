import { NextResponse } from "next/server";
import connectDB from "@/lib/db";

export async function GET() {
  try {
    await connectDB();
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to connect to MongoDB";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
