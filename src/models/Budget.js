import mongoose from "mongoose";
import { budgetMonthKey, expenseMonthKey, nextPeriod, normalizeCategory } from "@/features/budget/carry";
import { EXPENSE_CATEGORIES } from "@/features/expenses/options";
import { BudgetCarry } from "@/models/BudgetCarry";
import { Expense } from "@/models/Expense";

const MONTHS = ["01", "02", "03", "04", "05", "06", "07", "08", "09", "10", "11", "12"];
const YEAR_KEY = /^\d{4}$/;

const budgetSchema = new mongoose.Schema(
  {
    category: {
      type: String,
      required: true,
      enum: EXPENSE_CATEGORIES.map((item) => item.value),
    },
    amount: { type: Number, required: true, min: 0 },
    month: { type: String, required: true, enum: MONTHS },
    year: { type: String, required: true },
    description: { type: String, default: "", trim: true },
  },
  { timestamps: true },
);

budgetSchema.index({ category: 1, year: 1, month: 1 }, { unique: true });
budgetSchema.index({ year: -1, month: -1, createdAt: -1 });

if (mongoose.models.Budget) {
  mongoose.deleteModel("Budget");
}

export const Budget = mongoose.model("Budget", budgetSchema);

export function serializeBudget(doc, spent = 0) {
  const budget = doc.toObject ? doc.toObject() : doc;
  const amount = Number(budget.amount) || 0;
  const spentAmount = Number(spent) || 0;
  return {
    id: String(budget._id),
    category: budget.category || "",
    amount,
    month: budget.month || "",
    year: budget.year || "",
    description: budget.description || "",
    spent: spentAmount,
    remaining: amount - spentAmount,
    createdAt: budget.createdAt ? new Date(budget.createdAt).toISOString() : null,
    updatedAt: budget.updatedAt ? new Date(budget.updatedAt).toISOString() : null,
  };
}

export function parseBudgetInput(body) {
  const category = String(body?.category || "").trim().toLowerCase();
  const month = String(body?.month || "").trim();
  const year = String(body?.year || "").trim();
  const description = String(body?.description || "").trim();
  const amount = typeof body?.amount === "number" ? body.amount : Number(body?.amount);

  if (!EXPENSE_CATEGORIES.some((item) => item.value === category)) {
    throw Object.assign(new Error("Category is required"), { status: 400 });
  }
  if (!MONTHS.includes(month)) {
    throw Object.assign(new Error("Month is required"), { status: 400 });
  }
  if (!YEAR_KEY.test(year) || Number(year) < 1000 || Number(year) > 9999) {
    throw Object.assign(new Error("Year is required"), { status: 400 });
  }
  if (!Number.isFinite(amount) || amount <= 0) {
    throw Object.assign(new Error("Budget amount must be greater than 0"), { status: 400 });
  }
  if (description.length > 500) {
    throw Object.assign(new Error("Description must be 500 characters or fewer"), { status: 400 });
  }

  return { category, amount, month, year, description };
}

export async function assertUniqueBudget({ category, year, month, ignoreId }) {
  const query = { category, year, month };
  if (ignoreId) query._id = { $ne: ignoreId };
  const existing = await Budget.findOne(query).select("_id");
  if (existing) {
    throw Object.assign(new Error("A budget for this category and month already exists"), {
      status: 409,
    });
  }
}

export async function spentByBudgetKey() {
  const expenses = await Expense.find().select("category amount date");
  const totals = new Map();
  expenses.forEach((expense) => {
    const category = normalizeCategory(expense.category);
    const monthKey = expenseMonthKey(expense.date);
    if (!category || !monthKey) return;
    const key = `${category}|${monthKey}`;
    totals.set(key, (totals.get(key) || 0) + (Number(expense.amount) || 0));
  });
  return totals;
}

export function budgetSpentKey(budget) {
  const category = normalizeCategory(budget.category);
  const monthKey = budgetMonthKey(budget.year, budget.month);
  if (!category || !monthKey) return "";
  return `${category}|${monthKey}`;
}

export async function syncCarryForward(records, spent) {
  const byMonth = new Map();
  records.forEach((record) => {
    const source = budgetMonthKey(record.year, record.month);
    if (!source) return;
    const remaining = (Number(record.amount) || 0) - (spent.get(budgetSpentKey(record)) || 0);
    byMonth.set(source, (byMonth.get(source) || 0) + remaining);
  });

  const carries = [...byMonth.entries()].flatMap(([source, amount]) => {
    const next = nextPeriod(source.slice(0, 4), source.slice(5, 7));
    if (!next) return [];
    return [{ source, target: `${next.year}-${next.month}`, amount }];
  });

  await Promise.all(
    carries.map((carry) =>
      BudgetCarry.findOneAndUpdate(
        { month: carry.target },
        {
          month: carry.target,
          sourceMonth: carry.source,
          amount: carry.amount,
          year: carry.target,
          sourceYear: carry.source.slice(0, 4),
        },
        { upsert: true, new: true },
      ),
    ),
  );

  const targets = carries.map((carry) => carry.target);
  await BudgetCarry.deleteMany({
    month: { $exists: true, $nin: targets.length ? targets : ["__none__"] },
  });
}

export function duplicateBudgetError(error) {
  if (error?.code !== 11000) return error;
  return Object.assign(new Error("A budget for this category and month already exists"), {
    status: 409,
  });
}
