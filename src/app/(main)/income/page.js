"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  useCreateIncomeMutation,
  useDeleteIncomeMutation,
  useGetIncomeQuery,
  useUpdateIncomeMutation,
} from "@/features/income/incomeApi";
import { apiErrorMessage, formatDisplayDate, localDateKey } from "@/lib/format";
import ConfirmDialog from "@/components/ConfirmDialog";
import { INCOME_CATEGORIES } from "@/features/income/categories";

const EMPTY_LIST = [];
const PAGE_SIZES = [5, 10, 15, 25];
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

const controlClassName =
  "h-9 rounded-md border border-theme-border bg-card px-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary";

const fieldClassName =
  "w-full rounded-xl border border-theme-border bg-background px-3 py-2.5 text-sm text-foreground outline-none transition placeholder:text-muted/70 focus:border-primary focus:bg-card focus:ring-2 focus:ring-primary/30";

const emptyForm = {
  clientName: "",
  title: "",
  category: "",
  amount: "",
  date: "",
  recurring: "no",
  status: "received",
  description: "",
};

function money(amount) {
  return new Intl.NumberFormat("en-PK", {
    style: "currency",
    currency: "PKR",
    minimumFractionDigits: 2,
  }).format(Number(amount) || 0);
}

function categoryLabel(value) {
  return INCOME_CATEGORIES.find((item) => item.value === value)?.label || "—";
}

export default function IncomePage() {
  const today = localDateKey();
  const [month, setMonth] = useState(today.slice(5, 7));
  const [year, setYear] = useState(today.slice(0, 4));
  const monthKey = `${year}-${month}`;
  const { data, isLoading, isError, error } = useGetIncomeQuery(monthKey);
  const records = data ?? EMPTY_LIST;
  const [createIncome, { isLoading: creating }] = useCreateIncomeMutation();
  const [updateIncome, { isLoading: updating }] = useUpdateIncomeMutation();
  const [deleteIncome, { isLoading: deleting }] = useDeleteIncomeMutation();
  const [query, setQuery] = useState("");
  const [date, setDate] = useState("");
  const [category, setCategory] = useState("");
  const [status, setStatus] = useState("");
  const [pageSize, setPageSize] = useState(5);
  const [page, setPage] = useState(1);
  const [dialog, setDialog] = useState(null);
  const [formError, setFormError] = useState("");
  const [pendingDelete, setPendingDelete] = useState(null);
  const [deleteError, setDeleteError] = useState("");

  const monthLabel = MONTHS.find((item) => item.value === month)?.label || "";
  const defaultYears = useMemo(() => {
    const current = Number(today.slice(0, 4));
    return Array.from({ length: 6 }, (_, index) => current + index);
  }, [today]);

  const monthRecords = useMemo(
    () => records.filter((record) => String(record.date || "").startsWith(monthKey)),
    [records, monthKey],
  );

  const receivedTotal = useMemo(
    () =>
      monthRecords.reduce(
        (sum, record) => (record.status === "pending" ? sum : sum + (Number(record.amount) || 0)),
        0,
      ),
    [monthRecords],
  );
  const pendingTotal = useMemo(
    () =>
      monthRecords.reduce(
        (sum, record) => (record.status === "pending" ? sum + (Number(record.amount) || 0) : sum),
        0,
      ),
    [monthRecords],
  );

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    return monthRecords.filter((record) => {
      const matchesQuery =
        !term ||
        [
          record.clientName,
          record.title,
          record.description,
          categoryLabel(record.category),
          record.status === "pending" ? "pending" : "received",
        ]
          .join(" ")
          .toLowerCase()
          .includes(term);
      const matchesDate = !date || record.date === date;
      const matchesCategory = !category || record.category === category;
      const recordStatus = record.status === "pending" ? "pending" : "received";
      const matchesStatus = !status || recordStatus === status;
      return matchesQuery && matchesDate && matchesCategory && matchesStatus;
    });
  }, [monthRecords, query, date, category, status]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));

  useEffect(() => {
    if (page > pageCount) setPage(pageCount);
  }, [page, pageCount]);

  const startIndex = filtered.length === 0 ? 0 : (page - 1) * pageSize;
  const pageRows = filtered.slice(startIndex, startIndex + pageSize);
  const showingFrom = filtered.length === 0 ? 0 : startIndex + 1;
  const showingTo = startIndex + pageRows.length;
  const saving = creating || updating;

  function updateFilter(setter) {
    return (event) => {
      setter(event.target.value);
      setPage(1);
    };
  }

  function openCreate() {
    setFormError("");
    const dateInMonth = today.startsWith(monthKey) ? today : `${monthKey}-01`;
    setDialog({ mode: "create", values: { ...emptyForm, date: dateInMonth } });
  }

  function openEdit(record) {
    setFormError("");
    setDialog({
      mode: "edit",
      id: record.id,
      values: {
        clientName: record.clientName,
        title: record.title,
        category: record.category || "",
        amount: String(record.amount),
        date: record.date,
        recurring: record.recurring ? "yes" : "no",
        status: record.status === "pending" ? "pending" : "received",
        description: record.description || "",
      },
    });
  }

  async function handleSubmit(values) {
    setFormError("");
    const payload = {
      clientName: values.clientName,
      title: values.title,
      category: values.category,
      amount: values.amount,
      date: values.date,
      recurring: values.recurring === "yes",
      status: values.status === "pending" ? "pending" : "received",
      description: values.description,
    };
    try {
      if (dialog?.mode === "edit") {
        await updateIncome({ id: dialog.id, ...payload }).unwrap();
      } else {
        await createIncome(payload).unwrap();
      }
      setDialog(null);
    } catch (saveError) {
      setFormError(apiErrorMessage(saveError, "Could not save income"));
    }
  }

  async function confirmDelete() {
    if (!pendingDelete) return;
    setDeleteError("");
    try {
      await deleteIncome(pendingDelete.id).unwrap();
      setPendingDelete(null);
    } catch (failure) {
      setDeleteError(apiErrorMessage(failure, "Could not delete income"));
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <header>
        <nav className="mb-3 flex items-center gap-1.5 text-sm text-muted" aria-label="Breadcrumb">
          <Link href="/dashboard" className="font-medium text-primary hover:text-primary-hover">
            Dashboard
          </Link>
          <ChevronIcon />
          <span>Account</span>
          <ChevronIcon />
          <span className="text-foreground">Income</span>
        </nav>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">Income</h1>
            <p className="mt-1 text-sm text-muted">Record money received from clients.</p>
          </div>
          <button
            type="button"
            onClick={openCreate}
            className="inline-flex shrink-0 items-center rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white transition hover:bg-primary-hover"
          >
            Add Income
          </button>
        </div>
      </header>

      <div className="grid gap-3 sm:grid-cols-3">
        <SummaryCard
          label="Total income"
          period={`${monthLabel} ${year}`}
          value={isLoading ? "—" : money(receivedTotal)}
          tone="text-success"
          note="Received amounts only"
        />
        <SummaryCard
          label="Received"
          period={`${monthLabel} ${year}`}
          value={isLoading ? "—" : money(receivedTotal)}
          tone="text-success"
          note="Marked received"
        />
        <SummaryCard
          label="Pending"
          period={`${monthLabel} ${year}`}
          value={isLoading ? "—" : money(pendingTotal)}
          tone="text-amber-700"
          note="Not counted in total income"
        />
      </div>

      <section className="overflow-hidden rounded-xl border border-theme-border bg-card shadow-sm">
        <div className="flex flex-col gap-3 border-b border-theme-border px-4 py-3.5 lg:flex-row lg:items-center lg:justify-between">
          <label className="flex items-center gap-2 text-sm text-muted">
            Show
            <select
              value={pageSize}
              onChange={(event) => {
                setPageSize(Number(event.target.value));
                setPage(1);
              }}
              className={controlClassName}
              aria-label="Entries per page"
            >
              {PAGE_SIZES.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
            entries
          </label>
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
            <select
              value={month}
              onChange={updateFilter(setMonth)}
              className={controlClassName}
              aria-label="Month"
            >
              {MONTHS.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
            <YearField
              value={year}
              years={defaultYears}
              onChange={(next) => {
                setYear(next);
                setPage(1);
              }}
            />
            <input
              type="date"
              value={date}
              onChange={updateFilter(setDate)}
              aria-label="Date"
              className={controlClassName}
            />
            <select
              value={category}
              onChange={updateFilter(setCategory)}
              className={controlClassName}
              aria-label="Category"
            >
              <option value="">All categories</option>
              {INCOME_CATEGORIES.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
            <select
              value={status}
              onChange={updateFilter(setStatus)}
              className={controlClassName}
              aria-label="Status"
            >
              <option value="">All statuses</option>
              <option value="received">Received</option>
              <option value="pending">Pending</option>
            </select>
            <input
              value={query}
              onChange={updateFilter(setQuery)}
              placeholder="Search..."
              aria-label="Search income"
              className={`${controlClassName} w-full sm:w-52`}
            />
          </div>
        </div>

        {isLoading ? <p className="p-6 text-sm text-muted">Loading income…</p> : null}
        {isError ? (
          <p className="p-6 text-sm text-absent" role="alert">
            {apiErrorMessage(error, "Could not load income")}
          </p>
        ) : null}
        {!isLoading && !isError && records.length === 0 ? (
          <p className="p-6 text-sm text-muted">No income recorded yet.</p>
        ) : null}
        {!isLoading && !isError && records.length > 0 && monthRecords.length === 0 ? (
          <p className="p-6 text-sm text-muted">
            No income for {monthLabel} {year}.
          </p>
        ) : null}
        {!isLoading && !isError && monthRecords.length > 0 && filtered.length === 0 ? (
          <p className="p-6 text-sm text-muted">No income matches these filters.</p>
        ) : null}

        {pageRows.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1040px] text-left text-sm">
              <thead className="text-xs tracking-wide text-muted uppercase">
                <tr className="border-b border-theme-border">
                  <th className="px-4 py-3 font-semibold">S.No</th>
                  <th className="px-4 py-3 font-semibold">Client name</th>
                  <th className="px-4 py-3 font-semibold">Title</th>
                  <th className="px-4 py-3 font-semibold">Category</th>
                  <th className="px-4 py-3 font-semibold">Amount</th>
                  <th className="px-4 py-3 font-semibold">Date</th>
                  <th className="px-4 py-3 font-semibold">Recurring</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {pageRows.map((record, index) => (
                  <tr key={record.id} className="border-b border-theme-border last:border-b-0">
                    <td className="px-4 py-3 text-muted">{startIndex + index + 1}</td>
                    <td className="px-4 py-3 font-medium text-foreground">{record.clientName}</td>
                    <td className="px-4 py-3 text-foreground">{record.title}</td>
                    <td className="px-4 py-3 text-foreground">{categoryLabel(record.category)}</td>
                    <td className="px-4 py-3 font-medium text-foreground">{money(record.amount)}</td>
                    <td className="px-4 py-3 text-foreground">{formatDisplayDate(record.date)}</td>
                    <td className="px-4 py-3">
                      <span
                        className={
                          record.recurring
                            ? "inline-flex rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary"
                            : "inline-flex rounded-full bg-muted/10 px-2.5 py-1 text-xs font-medium text-muted"
                        }
                      >
                        {record.recurring ? "Yes" : "No"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <StatusPill status={record.status} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/income/${record.id}`}
                          aria-label={`View ${record.title}`}
                          title="View"
                          className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-primary text-white transition hover:bg-primary-hover"
                        >
                          <EyeIcon />
                        </Link>
                        <button
                          type="button"
                          onClick={() => openEdit(record)}
                          aria-label={`Edit ${record.title}`}
                          title="Edit"
                          className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-primary bg-card text-primary transition hover:bg-primary/10"
                        >
                          <PencilIcon />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setDeleteError("");
                            setPendingDelete(record);
                          }}
                          className="rounded-md px-2.5 py-1.5 text-xs font-medium text-absent"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}

        <div className="flex flex-col gap-3 border-t border-theme-border px-4 py-3.5 text-sm text-muted sm:flex-row sm:items-center sm:justify-between">
          <p>
            Showing {showingFrom} to {showingTo} of {filtered.length} entries
          </p>
          <div className="flex items-center gap-1">
            <PagerButton disabled={page <= 1} onClick={() => setPage((current) => current - 1)}>
              Previous
            </PagerButton>
            {Array.from({ length: pageCount }, (_, index) => index + 1).map((number) => (
              <button
                key={number}
                type="button"
                onClick={() => setPage(number)}
                aria-current={number === page ? "page" : undefined}
                className={
                  number === page
                    ? "h-8 min-w-8 rounded-md bg-primary px-2.5 text-sm font-medium text-white"
                    : "h-8 min-w-8 rounded-md px-2.5 text-sm font-medium text-foreground hover:bg-sidebar"
                }
              >
                {number}
              </button>
            ))}
            <PagerButton
              disabled={page >= pageCount}
              onClick={() => setPage((current) => current + 1)}
            >
              Next
            </PagerButton>
          </div>
        </div>
      </section>

      {pendingDelete ? (
        <ConfirmDialog
          title={`Delete income from ${pendingDelete.clientName}?`}
          message={
            pendingDelete.seriesId
              ? "This removes this month only. Other months of this income stay saved."
              : "This removes the income record. This cannot be undone."
          }
          error={deleteError}
          pending={deleting}
          onCancel={() => {
            if (!deleting) setPendingDelete(null);
          }}
          onConfirm={confirmDelete}
        />
      ) : null}

      {dialog ? (
        <IncomeDialog
          key={`${dialog.mode}-${dialog.id || "new"}`}
          title={dialog.mode === "edit" ? "Edit income" : "Add income"}
          initialValues={dialog.values}
          pending={saving}
          error={formError}
          onClose={() => {
            if (!saving) setDialog(null);
          }}
          onSubmit={handleSubmit}
        />
      ) : null}
    </div>
  );
}

function SummaryCard({ label, period, value, tone, note }) {
  return (
    <article className="rounded-xl border border-theme-border bg-card px-5 py-4 shadow-sm">
      <p className="text-xs font-semibold tracking-wide text-muted uppercase">{label}</p>
      <p className="mt-1 text-sm text-muted">{period}</p>
      <p className={`mt-1 text-3xl font-semibold ${tone}`}>{value}</p>
      <p className="mt-1 text-xs text-muted">{note}</p>
    </article>
  );
}

function StatusPill({ status }) {
  const pending = status === "pending";
  return (
    <span
      className={
        pending
          ? "inline-flex rounded-full bg-amber-500/10 px-2.5 py-1 text-xs font-medium text-amber-700"
          : "inline-flex rounded-full bg-success/10 px-2.5 py-1 text-xs font-medium text-success"
      }
    >
      {pending ? "Pending" : "Received"}
    </span>
  );
}

function IncomeDialog({ title, initialValues, pending, error, onClose, onSubmit }) {
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
      clientName: form.get("clientName"),
      title: form.get("title"),
      category: form.get("category"),
      amount: form.get("amount"),
      date: form.get("date"),
      recurring: form.get("recurring"),
      status: form.get("status"),
      description: form.get("description"),
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center">
      <button
        type="button"
        aria-label="Close income form"
        className="absolute inset-0 bg-foreground/40"
        onClick={onClose}
      />
      <form
        onSubmit={handleSubmit}
        role="dialog"
        aria-modal="true"
        aria-labelledby="income-dialog-title"
        className="relative flex max-h-[90vh] w-full max-w-lg flex-col overflow-y-auto rounded-2xl border border-theme-border bg-card p-6 shadow-sm"
      >
        <h2 id="income-dialog-title" className="text-lg font-semibold text-foreground">
          {title}
        </h2>
        <p className="mb-5 text-sm text-muted">
          Recurring income repeats every month from this date, including future years, until Recurring is set to No. Each month keeps its own status.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Client name" required>
            <input
              name="clientName"
              required
              placeholder="Northwind Studio"
              defaultValue={initialValues.clientName}
              className={fieldClassName}
            />
          </Field>
          <Field label="Title" required>
            <input
              name="title"
              required
              placeholder="Website retainer"
              defaultValue={initialValues.title}
              className={fieldClassName}
            />
          </Field>
          <Field label="Category" required>
            <select
              name="category"
              required
              defaultValue={initialValues.category}
              className={fieldClassName}
            >
              <option value="">Select category</option>
              {INCOME_CATEGORIES.map((item) => (
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
              placeholder="0.00"
              defaultValue={initialValues.amount}
              className={fieldClassName}
            />
          </Field>
          <Field label="Date" required>
            <input
              name="date"
              type="date"
              required
              defaultValue={initialValues.date}
              className={fieldClassName}
            />
          </Field>
          <Field label="Recurring" required>
            <select
              name="recurring"
              defaultValue={initialValues.recurring}
              className={fieldClassName}
            >
              <option value="no">No</option>
              <option value="yes">Yes</option>
            </select>
          </Field>
          <Field label="Status" required>
            <select
              name="status"
              defaultValue={initialValues.status || "received"}
              className={fieldClassName}
            >
              <option value="received">Received</option>
              <option value="pending">Pending</option>
            </select>
          </Field>
          <Field label="Description" className="sm:col-span-2">
            <textarea
              name="description"
              rows={3}
              maxLength={500}
              placeholder="Optional note"
              defaultValue={initialValues.description}
              className={`${fieldClassName} resize-y`}
            />
          </Field>
        </div>
        {error ? (
          <p className="mt-4 rounded-xl border border-absent/30 bg-card px-4 py-3 text-sm text-absent" role="alert">
            {error}
          </p>
        ) : null}
        <div className="mt-5 flex flex-wrap items-center justify-end gap-3">
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
            {pending ? "Saving…" : "Save income"}
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

  useEffect(() => {
    function onPointer(event) {
      if (!rootRef.current?.contains(event.target)) setOpen(false);
    }
    document.addEventListener("mousedown", onPointer);
    return () => document.removeEventListener("mousedown", onPointer);
  }, []);

  const suggestions = useMemo(() => suggestionYears(text, value, years), [text, value, years]);

  function commit(next) {
    const yearText = String(next);
    setText(yearText);
    onChange(yearText);
    setOpen(false);
  }

  function commitText() {
    const term = text.trim();
    if (isYear(term)) {
      commit(Number(term));
      return;
    }
    setText(value);
    setOpen(false);
  }

  return (
    <div ref={rootRef} className="relative">
      <input
        value={text}
        aria-label="Year"
        role="combobox"
        aria-expanded={open}
        aria-autocomplete="list"
        inputMode="numeric"
        onMouseDown={() => setOpen(true)}
        onFocus={() => setOpen(true)}
        onChange={(event) => {
          setText(event.target.value.replace(/\D/g, "").slice(0, 4));
          setOpen(true);
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            if (suggestions.length === 1) commit(suggestions[0]);
            else commitText();
          }
          if (event.key === "Escape") {
            setText(value);
            setOpen(false);
          }
        }}
        onBlur={(event) => {
          if (rootRef.current?.contains(event.relatedTarget)) return;
          commitText();
        }}
        className={`${controlClassName} w-28`}
      />
      {open ? (
        <ul
          role="listbox"
          aria-label="Years"
          className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-md border border-theme-border bg-card py-1 shadow-sm"
        >
          {suggestions.map((item) => (
            <li key={item}>
              <button
                type="button"
                role="option"
                aria-selected={String(item) === value}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => commit(item)}
                className={
                  String(item) === value
                    ? "w-full bg-primary px-3 py-1.5 text-left text-sm font-medium text-white"
                    : "w-full px-3 py-1.5 text-left text-sm text-foreground hover:bg-sidebar"
                }
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
  const chosen = Number(selected);
  if (!editing && Number.isInteger(chosen) && !matches.includes(chosen)) matches.push(chosen);
  if (isYear(term) && !matches.includes(Number(term))) matches.push(Number(term));
  return matches.sort((left, right) => left - right);
}

function isYear(value) {
  if (!/^\d{4}$/.test(value)) return false;
  const year = Number(value);
  return year >= 1000 && year <= 9999;
}

function PagerButton({ children, disabled, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="rounded-md px-2.5 py-1.5 text-sm font-medium text-foreground transition hover:bg-sidebar disabled:cursor-not-allowed disabled:opacity-40"
    >
      {children}
    </button>
  );
}

function ChevronIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 text-muted" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="m9 6 6 6-6 6" />
    </svg>
  );
}

function EyeIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function PencilIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 20h9" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4 11.5-11.5z" />
    </svg>
  );
}
