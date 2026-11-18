import { NextResponse } from "next/server";
import mongoose from "mongoose";
import connectDB from "@/lib/db";
import { errorResponse, requireAdmin } from "@/lib/apiAuth";
import {
  Attendance,
  isDateKey,
  parseAttendanceEntry,
  serializeAttendance,
} from "@/models/Attendance";
import { Employee } from "@/models/Employee";

export async function GET(request) {
  const denied = await requireAdmin();
  if (denied) return denied;

  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get("date");
    const employeeId = searchParams.get("employeeId");
    const month = searchParams.get("month");

    if (!date && !employeeId && !month) {
      return NextResponse.json(
        { ok: false, error: "Provide a date, a month, or an employee" },
        { status: 400 },
      );
    }
    if (date && !isDateKey(date)) {
      return NextResponse.json(
        { ok: false, error: "Date must be YYYY-MM-DD" },
        { status: 400 },
      );
    }
    if (month && !/^\d{4}-\d{2}$/.test(month)) {
      return NextResponse.json(
        { ok: false, error: "Month must be YYYY-MM" },
        { status: 400 },
      );
    }
    if (employeeId && !mongoose.Types.ObjectId.isValid(employeeId)) {
      return NextResponse.json(
        { ok: false, error: "Employee not found" },
        { status: 404 },
      );
    }

    await connectDB();
    const filter = {};
    if (date) filter.date = date;
    else if (month) filter.date = { $gte: `${month}-01`, $lte: `${month}-31` };
    if (employeeId) filter.employee = employeeId;

    const records = await Attendance.find(filter).sort({ date: -1 });
    return NextResponse.json({
      date: date || null,
      employeeId: employeeId || null,
      records: records.map(serializeAttendance),
    });
  } catch (error) {
    return errorResponse(error, "Could not load attendance");
  }
}

export async function PUT(request) {
  const denied = await requireAdmin();
  if (denied) return denied;

  try {
    const body = await request.json();
    const date = String(body?.date || "");
    const entries = Array.isArray(body?.entries) ? body.entries : [];

    if (!isDateKey(date)) {
      return NextResponse.json(
        { ok: false, error: "Date must be YYYY-MM-DD" },
        { status: 400 },
      );
    }
    if (entries.length === 0) {
      return NextResponse.json(
        { ok: false, error: "Select at least one attendance status" },
        { status: 400 },
      );
    }

    const operations = [];
    for (const entry of entries) {
      const { employeeId, status, note } = parseAttendanceEntry(entry);
      operations.push({
        updateOne: {
          filter: { employee: employeeId, date },
          update: { $set: { employee: employeeId, date, status, note } },
          upsert: true,
        },
      });
    }

    await connectDB();
    const ids = operations.map((item) => item.updateOne.filter.employee);
    const found = await Employee.countDocuments({ _id: { $in: ids } });
    if (found !== new Set(ids.map(String)).size) {
      return NextResponse.json(
        { ok: false, error: "One of the employees no longer exists" },
        { status: 400 },
      );
    }

    await Attendance.bulkWrite(operations);
    const records = await Attendance.find({ date }).sort({ date: -1 });
    return NextResponse.json({
      date,
      records: records.map(serializeAttendance),
    });
  } catch (error) {
    return errorResponse(error, "Could not save attendance");
  }
}
