"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import ConfirmDialog from "@/components/ConfirmDialog";
import { EXPENSE_CATEGORIES, PAYMENT_METHODS } from "@/features/expenses/options";
import {
  useDeleteExpenseMutation,
  useGetExpenseByIdQuery,
  useUpdateExpenseMutation,
} from "@/features/expenses/expensesApi";
import { apiErrorMessage, formatDisplayDate } from "@/lib/format";

const fieldClassName =
  "w-full rounded-xl border border-theme-border bg-background px-3 py-2.5 text-sm text-foreground outline-none transition placeholder:text-muted/70 focus:border-primary focus:bg-card focus:ring-2 focus:ring-primary/30";

function money(amount) {
  return new Intl.NumberFormat("en-PK", {
    style: "currency",
    currency: "PKR",
    minimumFractionDigits: 2,
  }).format(Number(amount) || 0);
}

function categoryLabel(value) {
  return EXPENSE_CATEGORIES.find((item) => item.value === value)?.label || "—";
}

function paymentLabel(value) {
  return PAYMENT_METHODS.find((item) => item.value === value)?.label || "—";
}

export default function ExpenseDetailPage() {
  const params = useParams();
  const id = params.id;
  const router = useRouter();
  const { data: record, isLoading, isError, error } = useGetExpenseByIdQuery(id, { skip: !id });
  const [updateExpense, { isLoading: saving }] = useUpdateExpenseMutation();
  const [deleteExpense, { isLoading: deleting }] = useDeleteExpenseMutation();
  const [editing, setEditing] = useState(false);
  const [formError, setFormError] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  async function handleSubmit(values) {
    setFormError("");
    try {
      await updateExpense({
        id,
        title: values.title,
        category: values.category,
        amount: values.amount,
        date: values.date,
        paymentMethod: values.paymentMethod,
        description: values.description,
      }).unwrap();
      setEditing(false);
    } catch (saveError) {
      setFormError(apiErrorMessage(saveError, "Could not save expense"));
    }
  }

  async function confirmDelete() {
    try {
      await deleteExpense(id).unwrap();
      router.push("/expenses");
      router.refresh();
    } catch (failure) {
      setDeleteError(apiErrorMessage(failure, "Could not delete expense"));
      setConfirming(false);
    }
  }

  if (isLoading) {
    return <p className="text-sm text-muted">Loading expense…</p>;
  }

  if (isError || !record) {
    return (
      <section className="rounded-xl border border-theme-border bg-card p-6 shadow-sm">
        <p className="text-sm text-absent" role="alert">
          {apiErrorMessage(error, "Expense record not found")}
        </p>
        <Link href="/expenses" className="mt-4 inline-block text-sm font-medium text-primary">
          Back to expenses
        </Link>
      </section>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted">
        <Link href="/expenses" className="font-medium text-primary">
          Expenses
        </Link>
        <span> / {record.title}</span>
      </p>

      <section className="rounded-xl border border-theme-border bg-card p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <h2 className="truncate text-2xl font-semibold text-foreground">{record.title}</h2>
            <p className="mt-1 text-sm text-muted">{categoryLabel(record.category)}</p>
            <p className="mt-2 text-2xl font-semibold text-absent">{money(record.amount)}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setFormError("");
                setEditing(true);
              }}
              className="inline-flex items-center gap-2 rounded-lg border border-theme-border bg-card px-3 py-2 text-sm font-medium text-primary transition hover:bg-sidebar"
            >
              <PencilIcon />
              Edit
            </button>
            <button
              type="button"
              onClick={() => {
                setDeleteError("");
                setConfirming(true);
              }}
              className="rounded-lg border border-absent px-4 py-2 text-sm font-medium text-absent"
            >
              Delete
            </button>
          </div>
        </div>
      </section>

      {deleteError ? (
        <p className="text-sm text-absent" role="alert">
          {deleteError}
        </p>
      ) : null}

      <section className="rounded-xl border border-theme-border bg-card p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-foreground">Expense details</h3>
        <p className="mb-4 text-sm text-muted">Everything saved for this record.</p>
        <dl className="grid gap-4 sm:grid-cols-2">
          <Detail label="Title" value={record.title} />
          <Detail label="Category" value={categoryLabel(record.category)} />
          <Detail label="Amount" value={money(record.amount)} />
          <Detail label="Date" value={formatDisplayDate(record.date)} />
          <Detail label="Payment method" value={paymentLabel(record.paymentMethod)} />
          <Detail label="Description" value={record.description || "—"} className="sm:col-span-2" />
        </dl>
      </section>

      {confirming ? (
        <ConfirmDialog
          title={`Delete ${record.title}?`}
          message="This removes the expense record. This cannot be undone."
          error={deleteError}
          pending={deleting}
          onCancel={() => {
            if (!deleting) setConfirming(false);
          }}
          onConfirm={confirmDelete}
        />
      ) : null}

      {editing ? (
        <ExpenseEditDialog
          record={record}
          pending={saving}
          error={formError}
          onClose={() => {
            if (!saving) setEditing(false);
          }}
          onSubmit={handleSubmit}
        />
      ) : null}
    </div>
  );
}

function Detail({ label, value, className = "" }) {
  return (
    <div className={className}>
      <dt className="text-xs font-semibold tracking-wide text-muted uppercase">{label}</dt>
      <dd className="mt-1 text-sm font-medium whitespace-pre-wrap text-foreground">{value}</dd>
    </div>
  );
}

function ExpenseEditDialog({ record, pending, error, onClose, onSubmit }) {
  useEffect(() => {
    function onKey(event) {
      if (event.key === "Escape" && !pending) onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, pending]);

  function handleSubmit(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    onSubmit({
      title: form.get("title"),
      category: form.get("category"),
      amount: form.get("amount"),
      date: form.get("date"),
      paymentMethod: form.get("paymentMethod"),
      description: form.get("description"),
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center">
      <button type="button" aria-label="Close expense form" className="absolute inset-0 bg-foreground/40" onClick={onClose} />
      <form
        onSubmit={handleSubmit}
        role="dialog"
        aria-modal="true"
        aria-labelledby="expense-edit-title"
        className="relative flex max-h-[90vh] w-full max-w-lg flex-col overflow-y-auto rounded-2xl border border-theme-border bg-card p-6 shadow-sm"
      >
        <h2 id="expense-edit-title" className="text-lg font-semibold text-foreground">
          Edit expense
        </h2>
        <p className="mb-5 text-sm text-muted">Title, amount, and how this expense was paid.</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Title" required className="sm:col-span-2">
            <input name="title" required defaultValue={record.title} className={fieldClassName} />
          </Field>
          <Field label="Category" required>
            <select name="category" required defaultValue={record.category || ""} className={fieldClassName}>
              <option value="">Select category</option>
              {EXPENSE_CATEGORIES.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Amount" required>
            <input
              name="amount"
              type="number"
              required
              min="0.01"
              step="0.01"
              defaultValue={record.amount}
              className={fieldClassName}
            />
          </Field>
          <Field label="Date" required>
            <input name="date" type="date" required defaultValue={record.date} className={fieldClassName} />
          </Field>
          <Field label="Payment method" required>
            <select name="paymentMethod" required defaultValue={record.paymentMethod || ""} className={fieldClassName}>
              <option value="">Select method</option>
              {PAYMENT_METHODS.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Description" className="sm:col-span-2">
            <textarea
              name="description"
              rows={3}
              maxLength={500}
              defaultValue={record.description || ""}
              className={`${fieldClassName} resize-y`}
            />
          </Field>
        </div>
        {error ? (
          <p className="mt-4 rounded-xl border border-absent/30 bg-card px-4 py-3 text-sm text-absent" role="alert">
            {error}
          </p>
        ) : null}
        <div className="mt-5 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={pending}
            className="rounded-xl border border-theme-border bg-card px-4 py-2.5 text-sm font-medium text-foreground transition hover:bg-sidebar disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={pending}
            className="rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-white transition hover:bg-primary-hover disabled:opacity-60"
          >
            {pending ? "Saving…" : "Save expense"}
          </button>
        </div>
      </form>
    </div>
  );
}

function Field({ label, required, className = "", children }) {
  return (
    <label className={`flex flex-col gap-1.5 ${className}`}>
      <span className="text-sm font-medium text-foreground">
        {label}
        {required ? <span className="text-absent"> *</span> : null}
      </span>
      {children}
    </label>
  );
}

function PencilIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 20h9" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4 11.5-11.5z" />
    </svg>
  );
}
