import mongoose from "mongoose";
import { EXPENSE_CATEGORIES, PAYMENT_METHODS } from "@/features/expenses/options";

const DATE_KEY = /^\d{4}-\d{2}-\d{2}$/;

const expenseSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    category: {
      type: String,
      required: true,
      enum: EXPENSE_CATEGORIES.map((item) => item.value),
    },
    amount: { type: Number, required: true, min: 0 },
    date: { type: String, required: true },
    paymentMethod: {
      type: String,
      required: true,
      enum: PAYMENT_METHODS.map((item) => item.value),
    },
    description: { type: String, default: "", trim: true },
  },
  { timestamps: true },
);

expenseSchema.index({ date: -1, createdAt: -1 });

if (mongoose.models.Expense) {
  mongoose.deleteModel("Expense");
}

export const Expense = mongoose.model("Expense", expenseSchema);

export function serializeExpense(doc) {
  const expense = doc.toObject ? doc.toObject() : doc;
  return {
    id: String(expense._id),
    title: expense.title,
    category: expense.category || "",
    amount: expense.amount ?? 0,
    date: expense.date || "",
    paymentMethod: expense.paymentMethod || "",
    description: expense.description || "",
    createdAt: expense.createdAt ? new Date(expense.createdAt).toISOString() : null,
    updatedAt: expense.updatedAt ? new Date(expense.updatedAt).toISOString() : null,
  };
}

export function parseExpenseInput(body) {
  const title = String(body?.title || "").trim();
  const category = String(body?.category || "").trim().toLowerCase();
  const paymentMethod = String(body?.paymentMethod || "").trim().toLowerCase();
  const description = String(body?.description || "").trim();
  const date = String(body?.date || "").trim();
  const amount = typeof body?.amount === "number" ? body.amount : Number(body?.amount);

  if (!title) {
    throw Object.assign(new Error("Title is required"), { status: 400 });
  }
  if (!EXPENSE_CATEGORIES.some((item) => item.value === category)) {
    throw Object.assign(new Error("Category is required"), { status: 400 });
  }
  if (!PAYMENT_METHODS.some((item) => item.value === paymentMethod)) {
    throw Object.assign(new Error("Payment method is required"), { status: 400 });
  }
  if (!Number.isFinite(amount) || amount <= 0) {
    throw Object.assign(new Error("Amount must be greater than 0"), { status: 400 });
  }
  if (!DATE_KEY.test(date)) {
    throw Object.assign(new Error("Date must be YYYY-MM-DD"), { status: 400 });
  }
  if (description.length > 500) {
    throw Object.assign(new Error("Description must be 500 characters or fewer"), { status: 400 });
  }

  return { title, category, amount, date, paymentMethod, description };
}
