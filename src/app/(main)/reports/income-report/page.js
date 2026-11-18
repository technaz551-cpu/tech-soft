"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { INCOME_CATEGORIES } from "@/features/income/categories";
import { useGetIncomeQuery } from "@/features/income/incomeApi";
import { apiErrorMessage, formatDisplayDate, localDateKey } from "@/lib/format";

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

function money(amount) {
  return new Intl.NumberFormat("en-PK", {
    style: "currency",
    currency: "PKR",
    minimumFractionDigits: 2,
  }).format(Number(amount) || 0);
}

function monthName(value) {
  return MONTHS.find((item) => item.value === value)?.label || "";
}

function categoryLabel(value) {
  return INCOME_CATEGORIES.find((item) => item.value === value)?.label || "—";
}

function isPending(record) {
  return record.status === "pending";
}

function recordStatus(record) {
  return isPending(record) ? "pending" : "received";
}

function matchesReportFilters(record, category, status) {
  const matchesCategory = !category || record.category === category;
  const matchesStatus = !status || recordStatus(record) === status;
  return matchesCategory && matchesStatus;
}

function recordsYears(records) {
  return records.map((record) => Number(String(record.date || "").slice(0, 4)));
}

function sumByStatus(records) {
  return records.reduce(
    (totals, record) => {
      const amount = Number(record.amount) || 0;
      if (isPending(record)) totals.pending += amount;
      else totals.received += amount;
      return totals;
    },
    { received: 0, pending: 0 },
  );
}

function mergeRecords(first, second) {
  const merged = new Map();
  first.forEach((record) => merged.set(record.id, record));
  second.forEach((record) => merged.set(record.id, record));
  return [...merged.values()];
}

export default function IncomeReportPage() {
  const today = localDateKey();
  const currentMonth = today.slice(5, 7);
  const currentYear = today.slice(0, 4);
  const [month, setMonth] = useState(currentMonth);
  const [year, setYear] = useState(currentYear);
  const [category, setCategory] = useState("");
  const [status, setStatus] = useState("");
  const [recordsMonth, setRecordsMonth] = useState(currentMonth);
  const [recordsYear, setRecordsYear] = useState(currentYear);
  const [recordsCategory, setRecordsCategory] = useState("");
  const [recordsStatus, setRecordsStatus] = useState("");
  const [query, setQuery] = useState("");
  const [pageSize, setPageSize] = useState(5);
  const [page, setPage] = useState(1);
  const monthKey = `${year}-${month}`;
  const recordsMonthKey = `${recordsYear}-${recordsMonth}`;
  const monthLabel = monthName(month);
  const recordsMonthLabel = monthName(recordsMonth);

  const summaryQuery = useGetIncomeQuery(monthKey);
  const recordsQuery = useGetIncomeQuery(recordsMonthKey);
  const records = useMemo(
    () => mergeRecords(summaryQuery.data ?? EMPTY_LIST, recordsQuery.data ?? EMPTY_LIST),
    [summaryQuery.data, recordsQuery.data],
  );

  const defaultYears = useMemo(() => {
    const current = Number(currentYear);
    const selected = [Number(year), Number(recordsYear)];
    const fromRecords = recordsYears(records);
    return [...new Set([current, ...selected, ...fromRecords].filter((value) => isYear(String(value))))].sort(
      (left, right) => left - right,
    );
  }, [records, currentYear, year, recordsYear]);

  const summaryMonthRecords = useMemo(
    () => records.filter((record) => String(record.date || "").startsWith(monthKey)),
    [records, monthKey],
  );
  const monthRecords = useMemo(
    () =>
      summaryMonthRecords
        .filter((record) => matchesReportFilters(record, category, status))
        .sort((left, right) => String(right.date).localeCompare(String(left.date))),
    [summaryMonthRecords, category, status],
  );
  const monthTotals = useMemo(() => sumByStatus(monthRecords), [monthRecords]);

  const yearSummary = useMemo(
    () =>
      MONTHS.map((item) => {
        const key = `${year}-${item.value}`;
        const rows = records.filter(
          (record) => String(record.date || "").startsWith(key) && matchesReportFilters(record, category, status),
        );
        return { ...item, key, count: rows.length, ...sumByStatus(rows) };
      }),
    [records, year, category, status],
  );

  const categories = useMemo(() => {
    const grouped = new Map();
    monthRecords.forEach((record) => {
      const key = record.category || "";
      const current = grouped.get(key) || { category: key, received: 0, pending: 0, count: 0 };
      const amount = Number(record.amount) || 0;
      if (isPending(record)) current.pending += amount;
      else current.received += amount;
      current.count += 1;
      grouped.set(key, current);
    });
    return [...grouped.values()].sort((left, right) => right.received - left.received || right.pending - left.pending);
  }, [monthRecords]);

  const recordsInMonth = useMemo(
    () => records.filter((record) => String(record.date || "").startsWith(recordsMonthKey)),
    [records, recordsMonthKey],
  );
  const recordsForTable = useMemo(
    () =>
      recordsInMonth
        .filter((record) => matchesReportFilters(record, recordsCategory, recordsStatus))
        .sort((left, right) => String(right.date).localeCompare(String(left.date))),
    [recordsInMonth, recordsCategory, recordsStatus],
  );
  const filteredRecords = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return recordsForTable;
    return recordsForTable.filter((record) =>
      [
        record.clientName,
        record.title,
        record.description,
        categoryLabel(record.category),
        recordStatus(record),
        record.recurring ? "yes" : "no",
      ]
        .join(" ")
        .toLowerCase()
        .includes(term),
    );
  }, [recordsForTable, query]);

  const pageCount = Math.max(1, Math.ceil(filteredRecords.length / pageSize));

  useEffect(() => {
    if (page > pageCount) setPage(pageCount);
  }, [page, pageCount]);

  const startIndex = filteredRecords.length === 0 ? 0 : (page - 1) * pageSize;
  const pageRows = filteredRecords.slice(startIndex, startIndex + pageSize);
  const showingFrom = filteredRecords.length === 0 ? 0 : startIndex + 1;
  const showingTo = startIndex + pageRows.length;

  function resetPage(setter) {
    return (event) => {
      setter(event.target.value);
      setPage(1);
    };
  }

  return (
    <div className="flex flex-col gap-5">
      <header>
        <nav className="mb-3 flex items-center gap-1.5 text-sm text-muted" aria-label="Breadcrumb">
          <Link href="/dashboard" className="font-medium text-primary hover:text-primary-hover">
            Dashboard
          </Link>
          <ChevronIcon />
          <span>Reports</span>
          <ChevronIcon />
          <span className="text-foreground">Income Report</span>
        </nav>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Income Report</h1>
        <p className="mt-1 text-sm text-muted">
          Received and pending income for the selected month, with a yearly summary and category breakdown.
        </p>
      </header>

      <div className="grid gap-3 sm:grid-cols-2">
        <SummaryCard
          label="Total received"
          period={`${monthLabel} ${year}`}
          value={summaryQuery.isLoading ? "—" : money(monthTotals.received)}
          tone="text-success"
          note="Collected income for this month"
        />
        <SummaryCard
          label="Total pending"
          period={`${monthLabel} ${year}`}
          value={summaryQuery.isLoading ? "—" : money(monthTotals.pending)}
          tone="text-amber-700"
          note="Not included in received"
        />
      </div>

      <section className="overflow-hidden rounded-xl border border-theme-border bg-card shadow-sm">
        <div className="flex flex-col gap-3 border-b border-theme-border px-4 py-3.5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-base font-semibold text-foreground">Monthly income summary</h2>
            <p className="text-sm text-muted">{year}</p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
            <FilterFields
              month={month}
              year={year}
              years={defaultYears}
              category={category}
              status={status}
              yearLabel="Year"
              onMonth={setMonth}
              onYear={setYear}
              onCategory={setCategory}
              onStatus={setStatus}
            />
          </div>
        </div>
        {summaryQuery.isLoading ? <p className="p-6 text-sm text-muted">Loading income…</p> : null}
        {summaryQuery.isError ? (
          <p className="p-6 text-sm text-absent" role="alert">
            {apiErrorMessage(summaryQuery.error, "Could not load income")}
          </p>
        ) : null}
        {!summaryQuery.isLoading && !summaryQuery.isError ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="text-xs tracking-wide text-muted uppercase">
                <tr className="border-b border-theme-border">
                  <th className="px-4 py-3 font-semibold">Month</th>
                  <th className="px-4 py-3 font-semibold">Records</th>
                  <th className="px-4 py-3 font-semibold">Received</th>
                  <th className="px-4 py-3 font-semibold">Pending</th>
                </tr>
              </thead>
              <tbody>
                {yearSummary.map((item) => (
                  <tr
                    key={item.key}
                    className={
                      item.value === month
                        ? "border-b border-theme-border bg-sidebar/70 last:border-b-0"
                        : "border-b border-theme-border last:border-b-0"
                    }
                  >
                    <td className="px-4 py-3 font-medium text-foreground">
                      {item.label}
                      {item.value === month ? <span className="ml-2 text-xs font-medium text-primary">Selected</span> : null}
                    </td>
                    <td className="px-4 py-3 text-foreground">{item.count}</td>
                    <td className="px-4 py-3 font-medium text-success">{money(item.received)}</td>
                    <td className="px-4 py-3 font-medium text-amber-700">{money(item.pending)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </section>

      <section className="overflow-hidden rounded-xl border border-theme-border bg-card shadow-sm">
        <div className="border-b border-theme-border px-4 py-3.5">
          <h2 className="text-base font-semibold text-foreground">Category-wise income</h2>
          <p className="text-sm text-muted">
            {monthLabel} {year}
          </p>
        </div>
        {summaryQuery.isLoading ? <p className="p-6 text-sm text-muted">Loading income…</p> : null}
        {!summaryQuery.isLoading && !summaryQuery.isError && categories.length === 0 ? (
          <p className="p-6 text-sm text-muted">
            {summaryMonthRecords.length > 0 ? "No income matches these filters." : `No income for ${monthLabel} ${year}.`}
          </p>
        ) : null}
        {!summaryQuery.isLoading && categories.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="text-xs tracking-wide text-muted uppercase">
                <tr className="border-b border-theme-border">
                  <th className="px-4 py-3 font-semibold">Category</th>
                  <th className="px-4 py-3 font-semibold">Records</th>
                  <th className="px-4 py-3 font-semibold">Received</th>
                  <th className="px-4 py-3 font-semibold">Pending</th>
                  <th className="px-4 py-3 font-semibold">Share of received</th>
                </tr>
              </thead>
              <tbody>
                {categories.map((item) => {
                  const share = monthTotals.received > 0 ? Math.round((item.received / monthTotals.received) * 100) : 0;
                  return (
                    <tr key={item.category || "none"} className="border-b border-theme-border last:border-b-0">
                      <td className="px-4 py-3 font-medium text-foreground">{categoryLabel(item.category)}</td>
                      <td className="px-4 py-3 text-foreground">{item.count}</td>
                      <td className="px-4 py-3 font-medium text-success">{money(item.received)}</td>
                      <td className="px-4 py-3 font-medium text-amber-700">{money(item.pending)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="h-2 w-24 overflow-hidden rounded-full bg-sidebar">
                            <div className="h-full rounded-full bg-primary" style={{ width: `${share}%` }} />
                          </div>
                          <span className="text-sm font-medium text-foreground">{share}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : null}
      </section>

      <section className="overflow-hidden rounded-xl border border-theme-border bg-card shadow-sm">
        <div className="flex flex-col gap-3 border-b border-theme-border px-4 py-3.5">
          <div>
            <h2 className="text-base font-semibold text-foreground">Income records</h2>
            <p className="text-sm text-muted">
              {recordsMonthLabel} {recordsYear}
            </p>
          </div>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <label className="flex items-center gap-2 text-sm text-muted">
              Show
              <select
                value={pageSize}
                onChange={resetPage(setPageSize)}
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
              <FilterFields
                month={recordsMonth}
                year={recordsYear}
                years={defaultYears}
                category={recordsCategory}
                status={recordsStatus}
                yearLabel="Records year"
                onMonth={(value) => {
                  setRecordsMonth(value);
                  setPage(1);
                }}
                onYear={(value) => {
                  setRecordsYear(value);
                  setPage(1);
                }}
                onCategory={(value) => {
                  setRecordsCategory(value);
                  setPage(1);
                }}
                onStatus={(value) => {
                  setRecordsStatus(value);
                  setPage(1);
                }}
              />
              <input
                value={query}
                onChange={resetPage(setQuery)}
                placeholder="Search..."
                aria-label="Search income"
                className={`${controlClassName} w-full sm:w-52`}
              />
            </div>
          </div>
        </div>
        {recordsQuery.isLoading ? <p className="p-6 text-sm text-muted">Loading income…</p> : null}
        {recordsQuery.isError ? (
          <p className="p-6 text-sm text-absent" role="alert">
            {apiErrorMessage(recordsQuery.error, "Could not load income")}
          </p>
        ) : null}
        {!recordsQuery.isLoading && !recordsQuery.isError && recordsForTable.length === 0 ? (
          <p className="p-6 text-sm text-muted">
            {recordsInMonth.length > 0
              ? "No income matches these filters."
              : `No income for ${recordsMonthLabel} ${recordsYear}.`}
          </p>
        ) : null}
        {!recordsQuery.isLoading && !recordsQuery.isError && recordsForTable.length > 0 && filteredRecords.length === 0 ? (
          <p className="p-6 text-sm text-muted">No income matches these filters.</p>
        ) : null}
        {pageRows.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-left text-sm">
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
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
        <div className="flex flex-col gap-3 border-t border-theme-border px-4 py-3.5 text-sm text-muted sm:flex-row sm:items-center sm:justify-between">
          <p>
            Showing {showingFrom} to {showingTo} of {filteredRecords.length} entries
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
            <PagerButton disabled={page >= pageCount} onClick={() => setPage((current) => current + 1)}>
              Next
            </PagerButton>
          </div>
        </div>
      </section>
    </div>
  );
}

function FilterFields({ month, year, years, category, status, yearLabel, onMonth, onYear, onCategory, onStatus }) {
  return (
    <>
      <select value={month} onChange={(event) => onMonth(event.target.value)} className={controlClassName} aria-label="Month">
        {MONTHS.map((item) => (
          <option key={item.value} value={item.value}>
            {item.label}
          </option>
        ))}
      </select>
      <div className="w-28">
        <YearField value={year} years={years} label={yearLabel} onChange={onYear} />
      </div>
      <select value={category} onChange={(event) => onCategory(event.target.value)} className={controlClassName} aria-label="Category">
        <option value="">All categories</option>
        {INCOME_CATEGORIES.map((item) => (
          <option key={item.value} value={item.value}>
            {item.label}
          </option>
        ))}
      </select>
      <select value={status} onChange={(event) => onStatus(event.target.value)} className={controlClassName} aria-label="Status">
        <option value="">All statuses</option>
        <option value="received">Received</option>
        <option value="pending">Pending</option>
      </select>
    </>
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

function YearField({ value, years, onChange, label = "Year" }) {
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
        aria-label={label}
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
        className={`${controlClassName} w-full`}
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
  const matches = editing ? defaults.filter((item) => String(item).startsWith(term)) : [...defaults];
  const chosen = Number(selected);
  if (!editing && Number.isInteger(chosen) && !matches.includes(chosen)) matches.push(chosen);
  if (isYear(term) && !matches.includes(Number(term))) matches.push(Number(term));
  return matches.sort((left, right) => left - right);
}

function isYear(value) {
  if (!/^\d{4}$/.test(String(value))) return false;
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
