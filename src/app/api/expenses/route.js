import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { errorResponse, requireAdmin } from "@/lib/apiAuth";
import { Expense, parseExpenseInput, serializeExpense } from "@/models/Expense";

export async function GET() {
  const denied = await requireAdmin();
  if (denied) return denied;

  try {
    await connectDB();
    const records = await Expense.find().sort({ date: -1, createdAt: -1 });
    return NextResponse.json(records.map(serializeExpense));
  } catch (error) {
    return errorResponse(error, "Could not load expenses");
  }
}

export async function POST(request) {
  const denied = await requireAdmin();
  if (denied) return denied;

  try {
    const data = parseExpenseInput(await request.json());
    await connectDB();
    const expense = await Expense.create(data);
    return NextResponse.json(serializeExpense(expense), { status: 201 });
  } catch (error) {
    return errorResponse(error, "Could not add expense");
  }
}
