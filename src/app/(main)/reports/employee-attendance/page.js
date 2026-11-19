"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useGetAttendanceQuery } from "@/features/attendance/attendanceApi";
import { useGetEmployeesQuery } from "@/features/employees/employeesApi";
import { apiErrorMessage, localDateKey } from "@/lib/format";

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

const STATUS_CARDS = [
  { key: "present", label: "Present", tone: "text-success" },
  { key: "absent", label: "Absent", tone: "text-absent" },
  { key: "leave", label: "Leave", tone: "text-amber-700" },
  { key: "half-day", label: "Half day", tone: "text-sky-700" },
];

const controlClassName =
  "h-9 rounded-md border border-theme-border bg-card px-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary";

function monthName(value) {
  return MONTHS.find((item) => item.value === value)?.label || "";
}

function attendanceRate(counts) {
  const marked = counts.present + counts.absent + counts.leave + counts["half-day"];
  if (marked === 0) return null;
  return Math.round(((counts.present + counts["half-day"] * 0.5) / marked) * 100);
}

function emptyCounts() {
  return { present: 0, absent: 0, leave: 0, "half-day": 0 };
}

export default function EmployeeAttendanceReportPage() {
  const today = localDateKey();
  const [month, setMonth] = useState(today.slice(5, 7));
  const [year, setYear] = useState(today.slice(0, 4));
  const [query, setQuery] = useState("");
  const [pageSize, setPageSize] = useState(5);
  const [page, setPage] = useState(1);
  const monthKey = `${year}-${month}`;
  const monthLabel = monthName(month);
  const defaultYears = useMemo(() => {
    const current = Number(today.slice(0, 4));
    return Array.from({ length: 6 }, (_, index) => current + index);
  }, [today]);

  const {
    data: employeeData,
    isLoading: loadingEmployees,
    isError: employeesFailed,
    error: employeesError,
  } = useGetEmployeesQuery();
  const {
    data: attendance,
    isLoading: loadingAttendance,
    isError: attendanceFailed,
    error: attendanceError,
  } = useGetAttendanceQuery({ month: monthKey });

  const employees = employeeData ?? EMPTY_LIST;
  const records = attendance?.records ?? EMPTY_LIST;
  const loading = loadingEmployees || loadingAttendance;

  const rows = useMemo(() => {
    return employees
      .map((employee) => {
        const counts = emptyCounts();
        records.forEach((record) => {
          if (record.employeeId !== employee.id || !Object.hasOwn(counts, record.status)) return;
          counts[record.status] += 1;
        });
        return {
          id: employee.id,
          name: employee.fullName,
          department: employee.department || "",
          designation: employee.designation || "",
          counts,
          percentage: attendanceRate(counts),
        };
      })
      .sort((left, right) => left.name.localeCompare(right.name));
  }, [employees, records]);

  const visible = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter((row) =>
      [row.name, row.department, row.designation].join(" ").toLowerCase().includes(term),
    );
  }, [rows, query]);

  const pageCount = Math.max(1, Math.ceil(visible.length / pageSize));

  useEffect(() => {
    if (page > pageCount) setPage(pageCount);
  }, [page, pageCount]);

  const startIndex = visible.length === 0 ? 0 : (page - 1) * pageSize;
  const pageRows = visible.slice(startIndex, startIndex + pageSize);
  const showingFrom = visible.length === 0 ? 0 : startIndex + 1;
  const showingTo = startIndex + pageRows.length;

  const totals = useMemo(() => {
    const counts = emptyCounts();
    rows.forEach((row) => {
      STATUS_CARDS.forEach((item) => {
        counts[item.key] += row.counts[item.key];
      });
    });
    const rated = rows.map((row) => row.percentage).filter((value) => value !== null);
    const average =
      rated.length === 0 ? null : Math.round(rated.reduce((sum, value) => sum + value, 0) / rated.length);
    return { counts, average };
  }, [rows]);

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
          <span className="text-foreground">Employee Attendance</span>
        </nav>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Employee Attendance</h1>
        <p className="mt-1 text-sm text-muted">
          Monthly attendance for the team. A present day counts fully and a half day counts as half.
        </p>
      </header>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <SummaryCard
          label="Average attendance"
          period={`${monthLabel} ${year}`}
          value={loading ? "—" : totals.average === null ? "—" : `${totals.average}%`}
          tone="text-primary"
          note="Across employees with marked days"
        />
        <SummaryCard
          label="Employees"
          period={`${monthLabel} ${year}`}
          value={loading ? "—" : String(rows.length)}
          tone="text-foreground"
          note="People included in this report"
        />
        {STATUS_CARDS.map((item) => (
          <SummaryCard
            key={item.key}
            label={item.label}
            period={`${monthLabel} ${year}`}
            value={loading ? "—" : String(totals.counts[item.key])}
            tone={item.tone}
            note="Marked days this month"
          />
        ))}
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
              onChange={(event) => {
                setMonth(event.target.value);
                setPage(1);
              }}
              className={controlClassName}
              aria-label="Month"
            >
              {MONTHS.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
            <div className="w-28">
              <YearField
                value={year}
                years={defaultYears}
                onChange={(next) => {
                  setYear(next);
                  setPage(1);
                }}
              />
            </div>
            <input
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setPage(1);
              }}
              placeholder="Search..."
              aria-label="Search employees"
              className={`${controlClassName} w-full sm:w-52`}
            />
          </div>
        </div>

        {loading ? <p className="p-6 text-sm text-muted">Loading attendance…</p> : null}
        {employeesFailed ? (
          <p className="p-6 text-sm text-absent" role="alert">
            {apiErrorMessage(employeesError, "Could not load employees")}
          </p>
        ) : null}
        {attendanceFailed ? (
          <p className="p-6 text-sm text-absent" role="alert">
            {apiErrorMessage(attendanceError, "Could not load attendance")}
          </p>
        ) : null}
        {!loading && !employeesFailed && rows.length === 0 ? (
          <p className="p-6 text-sm text-muted">
            No employees yet.{" "}
            <Link href="/employees" className="font-medium text-primary">
              Add an employee
            </Link>
          </p>
        ) : null}
        {!loading && rows.length > 0 && visible.length === 0 ? (
          <p className="p-6 text-sm text-muted">No employees match this search.</p>
        ) : null}

        {visible.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-left text-sm">
              <thead className="text-xs tracking-wide text-muted uppercase">
                <tr className="border-b border-theme-border">
                  <th className="px-4 py-3 font-semibold">S.No</th>
                  <th className="px-4 py-3 font-semibold">Employee</th>
                  <th className="px-4 py-3 font-semibold">Department</th>
                  <th className="px-4 py-3 font-semibold">Present</th>
                  <th className="px-4 py-3 font-semibold">Absent</th>
                  <th className="px-4 py-3 font-semibold">Leave</th>
                  <th className="px-4 py-3 font-semibold">Half day</th>
                  <th className="px-4 py-3 font-semibold">Attendance</th>
                </tr>
              </thead>
              <tbody>
                {pageRows.map((row, index) => (
                  <tr key={row.id} className="border-b border-theme-border last:border-b-0">
                    <td className="px-4 py-3 text-muted">{startIndex + index + 1}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                          {initials(row.name)}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate font-medium text-foreground">{row.name}</p>
                          <p className="truncate text-xs text-muted">{row.designation || "No designation"}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-foreground">{row.department || "—"}</td>
                    <td className="px-4 py-3 font-medium text-success">{row.counts.present}</td>
                    <td className="px-4 py-3 font-medium text-absent">{row.counts.absent}</td>
                    <td className="px-4 py-3 font-medium text-amber-700">{row.counts.leave}</td>
                    <td className="px-4 py-3 font-medium text-sky-700">{row.counts["half-day"]}</td>
                    <td className="px-4 py-3">
                      <Percentage value={row.percentage} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}

        <div className="flex flex-col gap-3 border-t border-theme-border px-4 py-3.5 text-sm text-muted sm:flex-row sm:items-center sm:justify-between">
          <p>
            Showing {showingFrom} to {showingTo} of {visible.length} entries
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

function Percentage({ value }) {
  if (value === null) {
    return <span className="text-sm text-muted">—</span>;
  }
  return (
    <div className="flex items-center gap-3">
      <div className="h-2 w-24 overflow-hidden rounded-full bg-sidebar">
        <div className="h-full rounded-full bg-primary" style={{ width: `${value}%` }} />
      </div>
      <span className="text-sm font-medium text-foreground">{value}%</span>
    </div>
  );
}

function initials(name) {
  const letters = String(name || "")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "");
  return letters.join("") || "—";
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
