import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { errorResponse, requireAdmin } from "@/lib/apiAuth";
import { createIncomeRecord, ensureRecurringMonth, Income, parseIncomeInput, serializeIncome } from "@/models/Income";

export async function GET(request) {
  const denied = await requireAdmin();
  if (denied) return denied;

  try {
    await connectDB();
    const month = new URL(request.url).searchParams.get("month");
    if (month) await ensureRecurringMonth(month);
    const records = await Income.find({ role: { $ne: "template" } }).sort({ date: -1, createdAt: -1 });
    return NextResponse.json(records.map(serializeIncome));
  } catch (error) {
    return errorResponse(error, "Could not load income");
  }
}

export async function POST(request) {
  const denied = await requireAdmin();
  if (denied) return denied;

  try {
    const data = parseIncomeInput(await request.json());
    await connectDB();
    const income = await createIncomeRecord(data);
    return NextResponse.json(serializeIncome(income), { status: 201 });
  } catch (error) {
    return errorResponse(error, "Could not add income");
  }
}
