"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import ConfirmDialog from "@/components/ConfirmDialog";
import { EXPENSE_CATEGORIES } from "@/features/expenses/options";
import {
  useDeleteBudgetMutation,
  useGetBudgetByIdQuery,
  useUpdateBudgetMutation,
} from "@/features/budget/budgetApi";
import { apiErrorMessage, localDateKey } from "@/lib/format";

const MONTHS = [
  { value: "01", label: "January" },
  { value: "02", label: "February" },
  { value: "03", label: "March" },
  { value: "04", label: "April" },
  { value: "05", label: "May" },
  { value: "06", label: "June" },
  { value: "07", label: "July" },
  { value: "08", label: "August" },
  { value: "09", label: "September" },
  { value: "10", label: "October" },
  { value: "11", label: "November" },
  { value: "12", label: "December" },
];

const fieldClassName =
  "w-full rounded-xl border border-theme-border bg-background px-3 py-2.5 text-sm text-foreground outline-none transition placeholder:text-muted/70 focus:border-primary focus:bg-card focus:ring-2 focus:ring-primary/30";

const controlClassName =
  "h-9 rounded-md border border-theme-border bg-card px-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary";

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

function monthName(value) {
  return MONTHS.find((item) => item.value === value)?.label || "—";
}

export default function BudgetDetailPage() {
  const params = useParams();
  const id = params.id;
  const router = useRouter();
  const { data: record, isLoading, isError, error } = useGetBudgetByIdQuery(id, { skip: !id });
  const [updateBudget, { isLoading: saving }] = useUpdateBudgetMutation();
  const [deleteBudget, { isLoading: deleting }] = useDeleteBudgetMutation();
  const [editing, setEditing] = useState(false);
  const [formError, setFormError] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const today = localDateKey();
  const defaultYears = useMemo(() => {
    const current = Number(today.slice(0, 4));
    return Array.from({ length: 6 }, (_, index) => current + index);
  }, [today]);

  async function handleSubmit(values) {
    setFormError("");
    try {
      await updateBudget({
        id,
        category: values.category,
        amount: values.amount,
        month: values.month,
        year: values.year,
        description: values.description,
      }).unwrap();
      setEditing(false);
    } catch (saveError) {
      setFormError(apiErrorMessage(saveError, "Could not save budget"));
    }
  }

  async function confirmDelete() {
    try {
      await deleteBudget(id).unwrap();
      router.push("/budget");
      router.refresh();
    } catch (failure) {
      setDeleteError(apiErrorMessage(failure, "Could not delete budget"));
      setConfirming(false);
    }
  }

  if (isLoading) {
    return <p className="text-sm text-muted">Loading budget…</p>;
  }

  if (isError || !record) {
    return (
      <section className="rounded-xl border border-theme-border bg-card p-6 shadow-sm">
        <p className="text-sm text-absent" role="alert">
          {apiErrorMessage(error, "Budget not found")}
        </p>
        <Link href="/budget" className="mt-4 inline-block text-sm font-medium text-primary">
          Back to budget
        </Link>
      </section>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted">
        <Link href="/budget" className="font-medium text-primary">
          Budget
        </Link>
        <span>
          {" "}
          / {categoryLabel(record.category)} {monthName(record.month)} {record.year}
        </span>
      </p>

      <section className="rounded-xl border border-theme-border bg-card p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <h2 className="truncate text-2xl font-semibold text-foreground">
              {categoryLabel(record.category)}
            </h2>
            <p className="mt-1 text-sm text-muted">
              {monthName(record.month)} {record.year}
            </p>
            <p className={`mt-2 text-2xl font-semibold ${record.remaining < 0 ? "text-absent" : "text-success"}`}>
              {money(record.remaining)} left
            </p>
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
        <h3 className="text-lg font-semibold text-foreground">Budget details</h3>
        <p className="mb-4 text-sm text-muted">Limit and spending for this category and month.</p>
        <dl className="grid gap-4 sm:grid-cols-2">
          <Detail label="Category" value={categoryLabel(record.category)} />
          <Detail label="Month" value={monthName(record.month)} />
          <Detail label="Year" value={record.year} />
          <Detail label="Budget amount" value={money(record.amount)} />
          <Detail label="Spent amount" value={money(record.spent)} />
          <Detail label="Remaining amount" value={money(record.remaining)} />
          <Detail label="Description" value={record.description || "—"} className="sm:col-span-2" />
        </dl>
      </section>

      {confirming ? (
        <ConfirmDialog
          title={`Delete the ${categoryLabel(record.category)} budget?`}
          message="This removes the budget for this category and month. This cannot be undone."
          error={deleteError}
          pending={deleting}
          onCancel={() => {
            if (!deleting) setConfirming(false);
          }}
          onConfirm={confirmDelete}
        />
      ) : null}

      {editing ? (
        <BudgetEditDialog
          record={record}
          years={defaultYears}
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

function BudgetEditDialog({ record, years, pending, error, onClose, onSubmit }) {
  const [year, setYear] = useState(record.year);

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
      category: form.get("category"),
      amount: form.get("amount"),
      month: form.get("month"),
      year,
      description: form.get("description"),
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center">
      <button type="button" aria-label="Close budget form" className="absolute inset-0 bg-foreground/40" onClick={onClose} />
      <form
        onSubmit={handleSubmit}
        role="dialog"
        aria-modal="true"
        aria-labelledby="budget-edit-title"
        className="relative flex max-h-[90vh] w-full max-w-lg flex-col overflow-y-auto rounded-2xl border border-theme-border bg-card p-6 shadow-sm"
      >
        <h2 id="budget-edit-title" className="text-lg font-semibold text-foreground">
          Edit budget
        </h2>
        <p className="mb-5 text-sm text-muted">Category limit for one month. Spent comes from expenses.</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Category" required>
            <select name="category" required defaultValue={record.category} className={fieldClassName}>
              {EXPENSE_CATEGORIES.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Budget amount" required>
            <input name="amount" type="number" required min="0.01" step="0.01" defaultValue={record.amount} className={fieldClassName} />
          </Field>
          <Field label="Month" required>
            <select name="month" required defaultValue={record.month} className={fieldClassName}>
              {MONTHS.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Year" required>
            <YearField value={year} years={years} onChange={setYear} />
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
            {pending ? "Saving…" : "Save budget"}
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

function YearField({ value, years, onChange }) {
  const rootRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [text, setText] = useState(value);

  useEffect(() => {
    setText(value);
  }, [value]);

  const suggestions = suggestionYears(text, value, years);

  function commit(next) {
    const yearText = String(next);
    setText(yearText);
    onChange(yearText);
    setOpen(false);
  }

  return (
    <div ref={rootRef} className="relative">
      <input
        value={text}
        aria-label="Year"
        onFocus={() => setOpen(true)}
        onChange={(event) => {
          setText(event.target.value.replace(/\D/g, "").slice(0, 4));
          setOpen(true);
        }}
        onBlur={() => {
          if (isYear(text.trim())) onChange(text.trim());
          else setText(value);
          setOpen(false);
        }}
        className={`${controlClassName} w-full`}
      />
      {open ? (
        <ul className="absolute z-20 mt-1 max-h-40 w-full overflow-auto rounded-md border border-theme-border bg-card py-1 shadow-sm">
          {suggestions.map((item) => (
            <li key={item}>
              <button
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => commit(item)}
                className="w-full px-3 py-1.5 text-left text-sm text-foreground hover:bg-sidebar"
              >
                {item}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function suggestionYears(text, selected, defaults) {
  const term = text.trim();
  const editing = term !== String(selected);
  const matches = editing ? defaults.filter((year) => String(year).startsWith(term)) : [...defaults];
  if (isYear(term) && !matches.includes(Number(term))) matches.push(Number(term));
  return matches.sort((left, right) => left - right);
}

function isYear(value) {
  return /^\d{4}$/.test(value) && Number(value) >= 1000 && Number(value) <= 9999;
}

function PencilIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 20h9" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4 11.5-11.5z" />
    </svg>
  );
}
