import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { errorResponse, requireAdmin } from "@/lib/apiAuth";
import {
  Employee,
  parseEmployeeInput,
  removeLegacySalary,
  serializeEmployee,
} from "@/models/Employee";

export async function GET() {
  const denied = await requireAdmin();
  if (denied) return denied;

  try {
    await connectDB();
    await removeLegacySalary();
    const employees = await Employee.find().select("-profileImage").sort({ fullName: 1 });
    return NextResponse.json(employees.map(serializeEmployee));
  } catch (error) {
    return errorResponse(error, "Could not load employees");
  }
}

export async function POST(request) {
  const denied = await requireAdmin();
  if (denied) return denied;

  try {
    const body = await request.json();
    const data = parseEmployeeInput(body);
    await connectDB();
    await removeLegacySalary();
    const employee = await Employee.create(data);
    return NextResponse.json(serializeEmployee(employee), { status: 201 });
  } catch (error) {
    if (error?.code === 11000) {
      return NextResponse.json(
        { ok: false, error: "An employee with this email already exists" },
        { status: 409 },
      );
    }
    return errorResponse(error, "Could not create employee");
  }
}
