import mongoose from "mongoose";
import { INCOME_CATEGORIES } from "@/features/income/categories";

const DATE_KEY = /^\d{4}-\d{2}-\d{2}$/;
const MONTH_KEY = /^\d{4}-\d{2}$/;
const DUPLICATE_MESSAGE = "This income is already recorded for that month";

const incomeSchema = new mongoose.Schema(
  {
    clientName: { type: String, required: true, trim: true },
    title: { type: String, required: true, trim: true },
    category: {
      type: String,
      enum: ["", ...INCOME_CATEGORIES.map((item) => item.value)],
      default: "",
    },
    amount: { type: Number, required: true, min: 0 },
    date: { type: String, required: true },
    recurring: { type: Boolean, default: false },
    description: { type: String, default: "", trim: true },
    status: { type: String, enum: ["received", "pending"], default: "received" },
    role: { type: String, enum: ["entry", "template"], default: "entry" },
    seriesId: { type: String, default: "" },
    occurrenceMonth: { type: String, default: "" },
    endMonth: { type: String, default: "" },
    skippedMonths: { type: [String], default: [] },
  },
  { timestamps: true },
);

incomeSchema.index({ date: -1, createdAt: -1 });
incomeSchema.index(
  { seriesId: 1, occurrenceMonth: 1 },
  {
    unique: true,
    partialFilterExpression: { role: "entry", seriesId: { $gt: "" } },
  },
);

if (mongoose.models.Income) {
  mongoose.deleteModel("Income");
}

export const Income = mongoose.model("Income", incomeSchema);

export function serializeIncome(doc) {
  const income = doc.toObject ? doc.toObject() : doc;
  return {
    id: String(income._id),
    clientName: income.clientName,
    title: income.title,
    category: income.category || "",
    amount: income.amount ?? 0,
    date: income.date || "",
    recurring: Boolean(income.recurring),
    description: income.description || "",
    status: income.status === "pending" ? "pending" : "received",
    seriesId: income.seriesId || "",
    createdAt: income.createdAt ? new Date(income.createdAt).toISOString() : null,
    updatedAt: income.updatedAt ? new Date(income.updatedAt).toISOString() : null,
  };
}

function reject(message, status) {
  throw Object.assign(new Error(message), { status });
}

function monthKey(date) {
  return String(date || "").slice(0, 7);
}

function dateInMonth(dateKey, targetMonth) {
  const day = Number(String(dateKey).slice(8, 10)) || 1;
  const year = Number(targetMonth.slice(0, 4));
  const month = Number(targetMonth.slice(5, 7));
  const lastDay = new Date(year, month, 0).getDate();
  const clamped = Math.min(Math.max(day, 1), lastDay);
  return `${targetMonth}-${String(clamped).padStart(2, "0")}`;
}

function exactName(value) {
  return new RegExp(`^${String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i");
}

function entryFields(data, extras) {
  return {
    clientName: data.clientName,
    title: data.title,
    category: data.category,
    amount: data.amount,
    date: data.date,
    recurring: data.recurring,
    description: data.description,
    status: data.status,
    role: "entry",
    skippedMonths: [],
    ...extras,
  };
}

async function assertUniqueSeries(data, ignoreTemplateId) {
  const existing = await Income.findOne({
    role: "template",
    recurring: true,
    clientName: exactName(data.clientName),
    title: exactName(data.title),
    ...(ignoreTemplateId ? { _id: { $ne: ignoreTemplateId } } : {}),
  });
  if (existing) {
    reject("A recurring income for this client and title already exists", 409);
  }
}

async function assertMonthAvailable(seriesId, occurrenceMonth, ignoreId) {
  const existing = await Income.findOne({
    role: "entry",
    seriesId,
    occurrenceMonth,
    ...(ignoreId ? { _id: { $ne: ignoreId } } : {}),
  });
  if (existing) reject(DUPLICATE_MESSAGE, 409);
}

export function parseIncomeInput(body) {
  const clientName = String(body?.clientName || "").trim();
  const title = String(body?.title || "").trim();
  const category = String(body?.category || "").trim().toLowerCase();
  const description = String(body?.description || "").trim();
  const date = String(body?.date || "").trim();
  const amount = typeof body?.amount === "number" ? body.amount : Number(body?.amount);
  const recurring = body?.recurring === true || body?.recurring === "yes";
  const status = body?.status === "pending" ? "pending" : "received";

  if (!clientName) reject("Client name is required", 400);
  if (!title) reject("Title is required", 400);
  if (!INCOME_CATEGORIES.some((item) => item.value === category)) {
    reject("Category is required", 400);
  }
  if (!Number.isFinite(amount) || amount <= 0) reject("Amount must be greater than 0", 400);
  if (!DATE_KEY.test(date)) reject("Date must be YYYY-MM-DD", 400);
  if (description.length > 500) reject("Description must be 500 characters or fewer", 400);

  return { clientName, title, category, amount, date, recurring, description, status };
}

async function backfillRecurringSeries() {
  const legacy = await Income.find({
    recurring: true,
    role: { $ne: "template" },
    $or: [{ seriesId: "" }, { seriesId: { $exists: false } }],
  });

  for (const entry of legacy) {
    const occurrenceMonth = monthKey(entry.date);
    const template = await Income.create({
      clientName: entry.clientName,
      title: entry.title,
      category: entry.category || "",
      amount: entry.amount,
      date: entry.date,
      recurring: true,
      description: entry.description || "",
      status: entry.status === "pending" ? "pending" : "received",
      role: "template",
      seriesId: "",
      occurrenceMonth,
      skippedMonths: [],
    });
    template.seriesId = String(template._id);
    await template.save();
    entry.role = "entry";
    entry.seriesId = template.seriesId;
    entry.occurrenceMonth = occurrenceMonth;
    if (entry.status !== "pending") entry.status = "received";
    await entry.save();
  }
}

export async function ensureRecurringMonth(month) {
  if (!MONTH_KEY.test(month || "")) return;
  await backfillRecurringSeries();
  const templates = await Income.find({ role: "template", recurring: true });

  for (const template of templates) {
    const start = template.occurrenceMonth || monthKey(template.date);
    if (month < start) continue;
    if (!template.recurring || (template.endMonth && month > template.endMonth)) continue;
    if ((template.skippedMonths || []).includes(month)) continue;
    const seriesId = template.seriesId || String(template._id);
    const exists = await Income.exists({ role: "entry", seriesId, occurrenceMonth: month });
    if (exists) continue;
    try {
      await Income.create({
        clientName: template.clientName,
        title: template.title,
        category: template.category || "",
        amount: template.amount,
        date: dateInMonth(template.date, month),
        recurring: true,
        description: template.description || "",
        status: "pending",
        role: "entry",
        seriesId,
        occurrenceMonth: month,
        skippedMonths: [],
      });
    } catch (error) {
      if (error?.code !== 11000) throw error;
    }
  }
}

export async function createIncomeRecord(data) {
  const occurrenceMonth = monthKey(data.date);
  if (!data.recurring) {
    return Income.create(
      entryFields(data, { seriesId: "", occurrenceMonth }),
    );
  }

  await assertUniqueSeries(data);
  const template = await Income.create({
    ...data,
    role: "template",
    seriesId: "",
    occurrenceMonth,
    skippedMonths: [],
  });
  template.seriesId = String(template._id);
  await template.save();
  try {
    return await Income.create(
      entryFields(data, { seriesId: template.seriesId, occurrenceMonth }),
    );
  } catch (error) {
    await Income.deleteOne({ _id: template._id });
    if (error?.code === 11000) reject(DUPLICATE_MESSAGE, 409);
    throw error;
  }
}

async function resumeSeries(template) {
  template.recurring = true;
  template.endMonth = "";
  await template.save();
  await Income.updateMany(
    { role: "entry", seriesId: template.seriesId },
    { $set: { recurring: true } },
  );
}

async function stopSeries(template, endMonth) {
  template.recurring = false;
  template.endMonth = endMonth;
  await template.save();
  await Income.deleteMany({
    role: "entry",
    seriesId: template.seriesId,
    occurrenceMonth: { $gt: endMonth },
  });
  await Income.updateMany(
    { role: "entry", seriesId: template.seriesId },
    { $set: { recurring: false } },
  );
}

export async function updateIncomeRecord(id, data) {
  const existing = await Income.findById(id);
  if (!existing || existing.role === "template") return null;

  const occurrenceMonth = monthKey(data.date);
  let seriesId = existing.seriesId || "";
  const template = seriesId ? await Income.findOne({ _id: seriesId, role: "template" }) : null;

  if (template) {
    if (occurrenceMonth !== existing.occurrenceMonth) {
      await assertMonthAvailable(seriesId, occurrenceMonth, existing._id);
      const skipped = new Set(template.skippedMonths || []);
      skipped.add(existing.occurrenceMonth);
      skipped.delete(occurrenceMonth);
      template.skippedMonths = [...skipped];
    }

    if (existing.occurrenceMonth === template.occurrenceMonth && data.recurring) {
      await assertUniqueSeries(data, template._id);
      template.clientName = data.clientName;
      template.title = data.title;
      template.category = data.category;
      template.amount = data.amount;
      template.date = data.date;
      template.description = data.description;
      template.occurrenceMonth = occurrenceMonth;
    }
    if (data.recurring) await resumeSeries(template);
    else await stopSeries(template, occurrenceMonth);
  } else if (data.recurring) {
    await assertUniqueSeries(data);
    const created = await Income.create({
      ...data,
      role: "template",
      seriesId: "",
      occurrenceMonth,
      skippedMonths: [],
    });
    created.seriesId = String(created._id);
    await created.save();
    seriesId = created.seriesId;
  }

  existing.clientName = data.clientName;
  existing.title = data.title;
  existing.category = data.category;
  existing.amount = data.amount;
  existing.date = data.date;
  existing.recurring = data.recurring;
  existing.description = data.description;
  existing.status = data.status;
  existing.role = "entry";
  existing.seriesId = seriesId;
  existing.occurrenceMonth = occurrenceMonth;
  await existing.save();
  return existing;
}

export async function removeIncomeRecord(id) {
  const existing = await Income.findById(id);
  if (!existing || existing.role === "template") return false;
  const seriesId = existing.seriesId;
  const occurrenceMonth = existing.occurrenceMonth || monthKey(existing.date);
  await Income.deleteOne({ _id: existing._id });
  if (!seriesId) return true;

  const remaining = await Income.countDocuments({ role: "entry", seriesId });
  if (remaining === 0) {
    await Income.deleteOne({ _id: seriesId, role: "template" });
  } else {
    await Income.updateOne(
      { _id: seriesId, role: "template" },
      { $addToSet: { skippedMonths: occurrenceMonth } },
    );
  }
  return true;
}
