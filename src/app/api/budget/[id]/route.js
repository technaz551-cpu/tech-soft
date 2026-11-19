import { NextResponse } from "next/server";
import mongoose from "mongoose";
import connectDB from "@/lib/db";
import { errorResponse, requireAdmin } from "@/lib/apiAuth";
import {
  Budget,
  assertUniqueBudget,
  budgetSpentKey,
  duplicateBudgetError,
  parseBudgetInput,
  serializeBudget,
  spentByBudgetKey,
} from "@/models/Budget";

function invalidId() {
  return NextResponse.json({ ok: false, error: "Budget not found" }, { status: 404 });
}

export async function GET(_request, { params }) {
  const denied = await requireAdmin();
  if (denied) return denied;

  try {
    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) return invalidId();

    await connectDB();
    const budget = await Budget.findById(id);
    if (!budget) return invalidId();
    const spent = await spentByBudgetKey();
    return NextResponse.json(serializeBudget(budget, spent.get(budgetSpentKey(budget)) || 0));
  } catch (error) {
    return errorResponse(error, "Could not load budget");
  }
}

export async function PATCH(request, { params }) {
  const denied = await requireAdmin();
  if (denied) return denied;

  try {
    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) return invalidId();

    const data = parseBudgetInput(await request.json());
    await connectDB();
    await assertUniqueBudget({ ...data, ignoreId: id });
    const budget = await Budget.findByIdAndUpdate(id, data, {
      new: true,
      runValidators: true,
    });
    if (!budget) return invalidId();
    const spent = await spentByBudgetKey();
    return NextResponse.json(serializeBudget(budget, spent.get(budgetSpentKey(budget)) || 0));
  } catch (error) {
    return errorResponse(duplicateBudgetError(error), "Could not update budget");
  }
}

export async function DELETE(_request, { params }) {
  const denied = await requireAdmin();
  if (denied) return denied;

  try {
    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) return invalidId();

    await connectDB();
    const budget = await Budget.findByIdAndDelete(id);
    if (!budget) return invalidId();
    return NextResponse.json({ ok: true });
  } catch (error) {
    return errorResponse(error, "Could not delete budget");
  }
}
