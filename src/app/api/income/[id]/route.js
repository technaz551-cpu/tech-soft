import { NextResponse } from "next/server";
import mongoose from "mongoose";
import connectDB from "@/lib/db";
import { errorResponse, requireAdmin } from "@/lib/apiAuth";
import { Income, parseIncomeInput, removeIncomeRecord, serializeIncome, updateIncomeRecord } from "@/models/Income";

function invalidId() {
  return NextResponse.json({ ok: false, error: "Income record not found" }, { status: 404 });
}

export async function GET(_request, { params }) {
  const denied = await requireAdmin();
  if (denied) return denied;

  try {
    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) return invalidId();

    await connectDB();
    const income = await Income.findById(id);
    if (!income || income.role === "template") return invalidId();
    return NextResponse.json(serializeIncome(income));
  } catch (error) {
    return errorResponse(error, "Could not load income");
  }
}

export async function PATCH(request, { params }) {
  const denied = await requireAdmin();
  if (denied) return denied;

  try {
    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) return invalidId();

    const data = parseIncomeInput(await request.json());
    await connectDB();
    const income = await updateIncomeRecord(id, data);
    if (!income) return invalidId();
    return NextResponse.json(serializeIncome(income));
  } catch (error) {
    return errorResponse(error, "Could not update income");
  }
}

export async function DELETE(_request, { params }) {
  const denied = await requireAdmin();
  if (denied) return denied;

  try {
    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) return invalidId();

    await connectDB();
    const removed = await removeIncomeRecord(id);
    if (!removed) return invalidId();
    return NextResponse.json({ ok: true });
  } catch (error) {
    return errorResponse(error, "Could not delete income");
  }
}
