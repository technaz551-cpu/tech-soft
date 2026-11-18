import { NextResponse } from "next/server";
import mongoose from "mongoose";
import connectDB from "@/lib/db";
import { errorResponse, requireAdmin } from "@/lib/apiAuth";
import { Attendance, serializeAttendance } from "@/models/Attendance";

function invalidId() {
  return NextResponse.json(
    { ok: false, error: "Attendance record not found" },
    { status: 404 },
  );
}

export async function GET(_request, { params }) {
  const denied = await requireAdmin();
  if (denied) return denied;

  try {
    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) return invalidId();

    await connectDB();
    const record = await Attendance.findById(id);
    if (!record) return invalidId();
    return NextResponse.json(serializeAttendance(record));
  } catch (error) {
    return errorResponse(error, "Could not load attendance");
  }
}

export async function DELETE(_request, { params }) {
  const denied = await requireAdmin();
  if (denied) return denied;

  try {
    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) return invalidId();

    await connectDB();
    const record = await Attendance.findByIdAndDelete(id);
    if (!record) return invalidId();
    return NextResponse.json({ ok: true });
  } catch (error) {
    return errorResponse(error, "Could not delete attendance");
  }
}
