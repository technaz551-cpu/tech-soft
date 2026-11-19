import { NextResponse } from "next/server";
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
  syncCarryForward,
} from "@/models/Budget";

export async function GET() {
  const denied = await requireAdmin();
  if (denied) return denied;

  try {
    await connectDB();
    const [records, spent] = await Promise.all([
      Budget.find().sort({ year: -1, month: -1, createdAt: -1 }),
      spentByBudgetKey(),
    ]);
    await syncCarryForward(records, spent);
    return NextResponse.json(
      records.map((record) => serializeBudget(record, spent.get(budgetSpentKey(record)) || 0)),
    );
  } catch (error) {
    return errorResponse(error, "Could not load budgets");
  }
}

export async function POST(request) {
  const denied = await requireAdmin();
  if (denied) return denied;

  try {
    const data = parseBudgetInput(await request.json());
    await connectDB();
    await assertUniqueBudget(data);
    const budget = await Budget.create(data);
    const spent = await spentByBudgetKey();
    return NextResponse.json(serializeBudget(budget, spent.get(budgetSpentKey(budget)) || 0), {
      status: 201,
    });
  } catch (error) {
    return errorResponse(duplicateBudgetError(error), "Could not add budget");
  }
}
