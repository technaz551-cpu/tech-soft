import { NextResponse } from "next/server";
import mongoose from "mongoose";
import connectDB from "@/lib/db";
import { errorResponse, requireAdmin } from "@/lib/apiAuth";
import { Expense, parseExpenseInput, serializeExpense } from "@/models/Expense";

function invalidId() {
  return NextResponse.json({ ok: false, error: "Expense record not found" }, { status: 404 });
}

export async function GET(_request, { params }) {
  const denied = await requireAdmin();
  if (denied) return denied;

  try {
    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) return invalidId();

    await connectDB();
    const expense = await Expense.findById(id);
    if (!expense) return invalidId();
    return NextResponse.json(serializeExpense(expense));
  } catch (error) {
    return errorResponse(error, "Could not load expense");
  }
}

export async function PATCH(request, { params }) {
  const denied = await requireAdmin();
  if (denied) return denied;

  try {
    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) return invalidId();

    const data = parseExpenseInput(await request.json());
    await connectDB();
    const expense = await Expense.findByIdAndUpdate(id, data, {
      new: true,
      runValidators: true,
    });
    if (!expense) return invalidId();
    return NextResponse.json(serializeExpense(expense));
  } catch (error) {
    return errorResponse(error, "Could not update expense");
  }
}

export async function DELETE(_request, { params }) {
  const denied = await requireAdmin();
  if (denied) return denied;

  try {
    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) return invalidId();

    await connectDB();
    const expense = await Expense.findByIdAndDelete(id);
    if (!expense) return invalidId();
    return NextResponse.json({ ok: true });
  } catch (error) {
    return errorResponse(error, "Could not delete expense");
  }
}
