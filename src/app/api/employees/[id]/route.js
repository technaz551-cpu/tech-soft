import { NextResponse } from "next/server";
import mongoose from "mongoose";
import connectDB from "@/lib/db";
import { errorResponse, requireAdmin } from "@/lib/apiAuth";
import { Attendance } from "@/models/Attendance";
import {
  Employee,
  parseEmployeeInput,
  serializeEmployee,
} from "@/models/Employee";

function invalidId() {
  return NextResponse.json(
    { ok: false, error: "Employee not found" },
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
    const employee = await Employee.findById(id);
    if (!employee) return invalidId();
    return NextResponse.json(serializeEmployee(employee));
  } catch (error) {
    return errorResponse(error, "Could not load employee");
  }
}

export async function PATCH(request, { params }) {
  const denied = await requireAdmin();
  if (denied) return denied;

  try {
    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) return invalidId();

    const data = parseEmployeeInput(await request.json());
    await connectDB();
    const employee = await Employee.findByIdAndUpdate(id, data, {
      new: true,
      runValidators: true,
    });
    if (!employee) return invalidId();
    return NextResponse.json(serializeEmployee(employee));
  } catch (error) {
    if (error?.code === 11000) {
      return NextResponse.json(
        { ok: false, error: "An employee with this email already exists" },
        { status: 409 },
      );
    }
    return errorResponse(error, "Could not update employee");
  }
}

export async function DELETE(_request, { params }) {
  const denied = await requireAdmin();
  if (denied) return denied;

  try {
    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) return invalidId();

    await connectDB();
    const employee = await Employee.findByIdAndDelete(id);
    if (!employee) return invalidId();
    await Attendance.deleteMany({ employee: id });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return errorResponse(error, "Could not delete employee");
  }
}
