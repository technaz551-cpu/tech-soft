"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import ConfirmDialog from "@/components/ConfirmDialog";
import { useDeleteAttendanceMutation, useGetAttendanceQuery, useSaveAttendanceMutation } from "@/features/attendance/attendanceApi";
import { useGetEmployeesQuery } from "@/features/employees/employeesApi";
import { apiErrorMessage, formatDisplayDate, localDateKey } from "@/lib/format";

const EMPTY_LIST = [];
const PAGE_SIZES = [5, 10, 15, 25];
const STATUSES = ["present", "absent", "leave", "half-day"];

const STATUS_META = {
  present: {
    label: "Present",
    text: "text-success",
    solid: "bg-success text-white",
    soft: "border-success/40 bg-success/10 text-success",
  },
  absent: {
    label: "Absent",
    text: "text-absent",
    solid: "bg-absent text-white",
    soft: "border-absent/40 bg-absent/10 text-absent",
  },
  leave: {
    label: "Leave",
    text: "text-amber-700",
    solid: "bg-amber-500 text-white",
    soft: "border-amber-500/40 bg-amber-500/10 text-amber-700",
  },
  "half-day": {
    label: "Half Day",
    text: "text-sky-700",
    solid: "bg-sky-500 text-white",
    soft: "border-sky-500/40 bg-sky-500/10 text-sky-700",
  },
};

function blankEntry() {
  return { status: "", note: "" };
}

export default function AttendancePage() {
  const today = localDateKey();
  const [date, setDate] = useState(today);
  const [query, setQuery] = useState("");
  const [pageSize, setPageSize] = useState(5);
  const [page, setPage] = useState(1);
  const {
    data: employeeData,
    isLoading: loadingEmployees,
    isError: employeesFailed,
    error: employeesError,
  } = useGetEmployeesQuery();
  const {
    data: attendance,
    isLoading: loadingAttendance,
    isFetching,
    isError: attendanceFailed,
    error: attendanceError,
  } = useGetAttendanceQuery({ date });
  const employees = employeeData ?? EMPTY_LIST;
  const records = attendance?.records ?? EMPTY_LIST;
  const [saveAttendance, { isLoading: saving }] = useSaveAttendanceMutation();
  const [deleteAttendance, { isLoading: deleting }] = useDeleteAttendanceMutation();
  const [draft, setDraft] = useState({});
  const [selected, setSelected] = useState({});
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [viewing, setViewing] = useState(null);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [deleteError, setDeleteError] = useState("");

  const draftKey = JSON.stringify(
    employees.map((employee) => {
      const record = records.find((item) => item.employeeId === employee.id);
      return [employee.id, record?.status || "", record?.note || ""];
    }),
  );

  const serverDraft = useMemo(() => {
    const next = {};
    for (const [id, status, note] of JSON.parse(draftKey)) {
      next[id] = { status, note };
    }
    return next;
  }, [draftKey]);

  useEffect(() => {
    setDraft(serverDraft);
    setSelected({});
  }, [draftKey, serverDraft]);

  useEffect(() => {
    setMessage("");
    setError("");
  }, [date]);

  const visible = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return employees;
    return employees.filter((employee) =>
      [employee.fullName, employee.email, employee.department, employee.designation]
        .join(" ")
        .toLowerCase()
        .includes(term),
    );
  }, [employees, query]);

  const pageCount = Math.max(1, Math.ceil(visible.length / pageSize));

  useEffect(() => {
    if (page > pageCount) setPage(pageCount);
  }, [page, pageCount]);

  const startIndex = visible.length === 0 ? 0 : (page - 1) * pageSize;
  const pageRows = visible.slice(startIndex, startIndex + pageSize);
  const showingFrom = visible.length === 0 ? 0 : startIndex + 1;
  const showingTo = startIndex + pageRows.length;

  const selectedIds = employees
    .map((employee) => employee.id)
    .filter((id) => selected[id]);

  function entryFor(id) {
    return draft[id] || serverDraft[id] || blankEntry();
  }

  function savedFor(id) {
    return serverDraft[id] || blankEntry();
  }

  function savedRecord(id) {
    return records.find((item) => item.employeeId === id) || null;
  }

  function isChanged(id) {
    const current = entryFor(id);
    const saved = savedFor(id);
    return current.status !== saved.status || current.note !== saved.note;
  }

  const counts = {
    present: employees.filter((employee) => entryFor(employee.id).status === "present").length,
    absent: employees.filter((employee) => entryFor(employee.id).status === "absent").length,
    leave: employees.filter((employee) => entryFor(employee.id).status === "leave").length,
    "half-day": employees.filter((employee) => entryFor(employee.id).status === "half-day").length,
  };
  const dirty = employees.some((employee) => isChanged(employee.id));

  function setStatus(id, status) {
    setDraft((current) => ({
      ...current,
      [id]: { ...entryFor(id), ...current[id], status },
    }));
  }

  function setNote(id, note) {
    setDraft((current) => ({
      ...current,
      [id]: { ...entryFor(id), ...current[id], note },
    }));
  }

  function applyStatus(ids, status) {
    setDraft((current) => {
      const next = { ...current };
      for (const id of ids) {
        next[id] = { ...(next[id] || entryFor(id)), status };
      }
      return next;
    });
  }

  function toggleAll(checked) {
    const next = {};
    if (checked) {
      for (const employee of employees) next[employee.id] = true;
    }
    setSelected(next);
  }

  async function persist(entries, successText) {
    setError("");
    setMessage("");
    if (entries.length === 0) {
      setError("Choose a status before saving.");
      return;
    }
    try {
      await saveAttendance({ date, entries }).unwrap();
      setMessage(successText);
    } catch (saveError) {
      setError(apiErrorMessage(saveError, "Could not save attendance"));
    }
  }

  function toEntry(employee) {
    const current = entryFor(employee.id);
    return {
      employeeId: employee.id,
      status: current.status,
      note: current.note || "",
    };
  }

  async function saveAll() {
    const entries = employees
      .filter((employee) => isChanged(employee.id) && STATUSES.includes(entryFor(employee.id).status))
      .map(toEntry);
    await persist(entries, "Attendance saved.");
  }

  async function saveOne(employee) {
    const current = entryFor(employee.id);
    if (!STATUSES.includes(current.status)) {
      setError("Choose a status before saving.");
      setMessage("");
      return;
    }
    await persist([toEntry(employee)], `${employee.fullName} updated.`);
  }

  async function confirmDelete() {
    if (!pendingDelete) return;
    setDeleteError("");
    try {
      await deleteAttendance(pendingDelete.id).unwrap();
      setMessage(`${pendingDelete.name}'s attendance removed.`);
      setPendingDelete(null);
    } catch (failure) {
      setDeleteError(apiErrorMessage(failure, "Could not delete attendance"));
    }
  }

  const loading = loadingEmployees || loadingAttendance;
  const allSelected = employees.length > 0 && selectedIds.length === employees.length;

  return (
    <div className="flex flex-col gap-5">
      <header>
        <nav className="mb-3 flex items-center gap-1.5 text-sm text-muted" aria-label="Breadcrumb">
          <Link href="/dashboard" className="font-medium text-primary hover:text-primary-hover">
            Dashboard
          </Link>
          <ChevronIcon />
          <span>Payroll</span>
          <ChevronIcon />
          <span className="text-foreground">Attendance</span>
        </nav>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">Attendance</h1>
            <p className="mt-1 text-sm text-muted">
              Pick a date, mark people in bulk, then save or update a row
            </p>
          </div>
          <button
            type="button"
            onClick={saveAll}
            disabled={saving || !dirty}
            className="inline-flex shrink-0 items-center rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white transition hover:bg-primary-hover disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save attendance"}
          </button>
        </div>
      </header>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {STATUSES.map((status) => (
          <Summary
            key={status}
            label={STATUS_META[status].label}
            value={counts[status]}
            tone={STATUS_META[status].text}
          />
        ))}
      </section>

      <section className="flex flex-col gap-3 rounded-xl border border-theme-border bg-card p-4 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <label className="flex flex-col gap-1.5 text-sm font-medium text-foreground">
              Show
              <span className="flex items-center gap-2 text-muted">
                <select
                  value={pageSize}
                  onChange={(event) => {
                    setPageSize(Number(event.target.value));
                    setPage(1);
                  }}
                  aria-label="Entries per page"
                  className="rounded-lg border border-theme-border bg-card px-3 py-2 text-foreground outline-none focus:ring-2 focus:ring-primary"
                >
                  {PAGE_SIZES.map((size) => (
                    <option key={size} value={size}>
                      {size}
                    </option>
                  ))}
                </select>
                entries
              </span>
            </label>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <label className="flex min-w-56 flex-col gap-1.5 text-sm font-medium text-foreground">
                Search
                <input
                  value={query}
                  onChange={(event) => {
                    setQuery(event.target.value);
                    setPage(1);
                  }}
                  placeholder="Search employees..."
                  aria-label="Search employees"
                  className="rounded-lg border border-theme-border px-3 py-2 outline-none focus:ring-2 focus:ring-primary"
                />
              </label>
              <label className="flex flex-col gap-1.5 text-sm font-medium text-foreground">
                Date
                <span className="flex items-center gap-2">
                  <input
                    type="date"
                    value={date}
                    onChange={(event) => {
                      setDate(event.target.value);
                      setPage(1);
                    }}
                    className="rounded-lg border border-theme-border px-3 py-2 outline-none focus:ring-2 focus:ring-primary"
                  />
                  {date === today ? (
                    <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
                      Today
                    </span>
                  ) : null}
                </span>
              </label>
            </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {STATUSES.map((status) => (
            <button
              key={`all-${status}`}
              type="button"
              onClick={() => applyStatus(employees.map((employee) => employee.id), status)}
              className={`rounded-lg px-3 py-2 text-sm font-medium ${STATUS_META[status].solid}`}
            >
              Mark all {STATUS_META[status].label.toLowerCase()}
            </button>
          ))}
          {STATUSES.map((status) => (
            <button
              key={`selected-${status}`}
              type="button"
              disabled={selectedIds.length === 0}
              onClick={() => applyStatus(selectedIds, status)}
              className={`rounded-lg border bg-card px-3 py-2 text-sm font-medium disabled:opacity-50 ${STATUS_META[status].soft}`}
            >
              Selected {STATUS_META[status].label.toLowerCase()}
            </button>
          ))}
        </div>
      </section>

      {message ? <p className="text-sm font-medium text-success">{message}</p> : null}
      {error ? (
        <p className="text-sm text-absent" role="alert">
          {error}
        </p>
      ) : null}
      {employeesFailed ? (
        <p className="text-sm text-absent" role="alert">
          {apiErrorMessage(employeesError, "Could not load employees")}
        </p>
      ) : null}
      {attendanceFailed ? (
        <p className="text-sm text-absent" role="alert">
          {apiErrorMessage(attendanceError, "Could not load attendance")}
        </p>
      ) : null}
      {isFetching && !loading ? (
        <p className="text-xs text-muted">Refreshing this date…</p>
      ) : null}

      <section className="overflow-hidden rounded-xl border border-theme-border bg-card shadow-sm">
        {loading ? <p className="p-6 text-sm text-muted">Loading attendance…</p> : null}
        {!loading && employees.length === 0 ? (
          <p className="p-6 text-sm text-muted">
            Add employees before marking attendance.{" "}
            <Link href="/employees" className="font-medium text-primary">
              Go to employees
            </Link>
          </p>
        ) : null}
        {!loading && employees.length > 0 && visible.length === 0 ? (
          <p className="p-6 text-sm text-muted">No employees match this search.</p>
        ) : null}
        {visible.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-left text-sm">
              <thead className="bg-sidebar text-xs tracking-wide text-muted uppercase">
                <tr>
                  <th className="px-4 py-3">
                    <input
                      type="checkbox"
                      aria-label="Select all employees"
                      checked={allSelected}
                      onChange={(event) => toggleAll(event.target.checked)}
                    />
                  </th>
                  <th className="px-4 py-3 font-semibold">Employee</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Note</th>
                  <th className="px-4 py-3 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {pageRows.map((employee) => {
                  const current = entryFor(employee.id);
                  const changed = isChanged(employee.id);
                  const saved = savedRecord(employee.id);
                  return (
                    <tr key={employee.id} className="border-t border-theme-border">
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          aria-label={`Select ${employee.fullName}`}
                          checked={Boolean(selected[employee.id])}
                          onChange={(event) =>
                            setSelected((currentSelected) => ({
                              ...currentSelected,
                              [employee.id]: event.target.checked,
                            }))
                          }
                        />
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-foreground">{employee.fullName}</p>
                        <p className="text-xs text-muted">
                          {employee.department || employee.designation || employee.email}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <select
                          value={current.status}
                          onChange={(event) => setStatus(employee.id, event.target.value)}
                          aria-label={`Status for ${employee.fullName}`}
                          className={`rounded-lg border px-3 py-2 outline-none focus:ring-2 focus:ring-primary ${
                            current.status
                              ? STATUS_META[current.status].soft
                              : "border-theme-border bg-card text-foreground"
                          }`}
                        >
                          <option value="">Not marked</option>
                          {STATUSES.map((status) => (
                            <option key={status} value={status}>
                              {STATUS_META[status].label}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-3">
                        <input
                          value={current.note}
                          onChange={(event) => setNote(employee.id, event.target.value)}
                          placeholder="Optional note"
                          aria-label={`Note for ${employee.fullName}`}
                          maxLength={300}
                          className="w-full min-w-40 rounded-lg border border-theme-border bg-card px-3 py-2 text-foreground outline-none focus:ring-2 focus:ring-primary"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {saved ? (
                            <button
                              type="button"
                              onClick={() =>
                                setViewing({
                                  name: employee.fullName,
                                  date: saved.date,
                                  status: saved.status,
                                  note: saved.note,
                                })
                              }
                              className="rounded-lg border border-theme-border bg-card px-3 py-1.5 text-xs font-medium text-primary"
                            >
                              View
                            </button>
                          ) : null}
                          <button
                            type="button"
                            disabled={!changed || !current.status || saving}
                            onClick={() => saveOne(employee)}
                            className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-white disabled:opacity-40"
                          >
                            Update
                          </button>
                          {saved ? (
                            <button
                              type="button"
                              onClick={() => {
                                setDeleteError("");
                                setPendingDelete({
                                  id: saved.id,
                                  name: employee.fullName,
                                  date: saved.date,
                                });
                              }}
                              className="rounded-md px-2.5 py-1.5 text-xs font-medium text-absent"
                            >
                              Delete
                            </button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                })}
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

      {viewing ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center">
          <button
            type="button"
            aria-label="Close attendance details"
            className="absolute inset-0 bg-foreground/40"
            onClick={() => setViewing(null)}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="attendance-view-title"
            className="relative w-full max-w-md rounded-2xl border border-theme-border bg-card p-6 shadow-sm"
          >
            <h2 id="attendance-view-title" className="text-lg font-semibold text-foreground">
              {viewing.name}
            </h2>
            <p className="mt-1 text-sm text-muted">Saved attendance for this date.</p>
            <dl className="mt-5 grid gap-4 sm:grid-cols-2">
              <div>
                <dt className="text-xs font-semibold tracking-wide text-muted uppercase">Date</dt>
                <dd className="mt-1 text-sm font-medium text-foreground">{formatDisplayDate(viewing.date)}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold tracking-wide text-muted uppercase">Status</dt>
                <dd className={`mt-1 text-sm font-medium ${STATUS_META[viewing.status]?.text || "text-foreground"}`}>
                  {STATUS_META[viewing.status]?.label || "—"}
                </dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-xs font-semibold tracking-wide text-muted uppercase">Note</dt>
                <dd className="mt-1 text-sm font-medium whitespace-pre-wrap text-foreground">{viewing.note || "—"}</dd>
              </div>
            </dl>
            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={() => setViewing(null)}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition hover:bg-primary-hover"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {pendingDelete ? (
        <ConfirmDialog
          title={`Delete attendance for ${pendingDelete.name}?`}
          message={`This removes the saved attendance for ${formatDisplayDate(pendingDelete.date)}. This cannot be undone.`}
          error={deleteError}
          pending={deleting}
          onCancel={() => {
            if (!deleting) setPendingDelete(null);
          }}
          onConfirm={confirmDelete}
        />
      ) : null}
    </div>
  );
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

function Summary({ label, value, tone }) {
  return (
    <article className="rounded-xl border border-theme-border bg-card px-4 py-3 shadow-sm">
      <p className="text-xs font-semibold tracking-wide text-muted uppercase">{label}</p>
      <p className={`mt-1 text-2xl font-semibold ${tone}`}>{value}</p>
    </article>
  );
}
