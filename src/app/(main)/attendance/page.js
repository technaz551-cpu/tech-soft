"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useGetAttendanceQuery, useSaveAttendanceMutation } from "@/features/attendance/attendanceApi";
import { useGetEmployeesQuery } from "@/features/employees/employeesApi";
import { apiErrorMessage, localDateKey } from "@/lib/format";

const EMPTY_LIST = [];

export default function AttendancePage() {
  const [date, setDate] = useState(localDateKey);
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
  const [draft, setDraft] = useState({});
  const [selected, setSelected] = useState({});
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const draftKey = employees
    .map((employee) => {
      const record = records.find((item) => item.employeeId === employee.id);
      return `${employee.id}:${record?.status || ""}`;
    })
    .join("|");

  const serverDraft = useMemo(() => {
    const next = {};
    if (!draftKey) return next;
    for (const part of draftKey.split("|")) {
      const splitAt = part.lastIndexOf(":");
      next[part.slice(0, splitAt)] = part.slice(splitAt + 1);
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

  const selectedIds = employees
    .map((employee) => employee.id)
    .filter((id) => selected[id]);
  const presentCount = employees.filter((employee) => draft[employee.id] === "present").length;
  const absentCount = employees.filter((employee) => draft[employee.id] === "absent").length;
  const dirty = employees.some(
    (employee) => (draft[employee.id] || "") !== (serverDraft[employee.id] || ""),
  );

  function setStatus(id, status) {
    setDraft((current) => ({ ...current, [id]: status }));
  }

  function applyStatus(ids, status) {
    setDraft((current) => {
      const next = { ...current };
      for (const id of ids) next[id] = status;
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
      setError("Choose present or absent before saving.");
      return;
    }
    try {
      await saveAttendance({ date, entries }).unwrap();
      setMessage(successText);
    } catch (saveError) {
      setError(apiErrorMessage(saveError, "Could not save attendance"));
    }
  }

  async function saveAll() {
    const entries = employees
      .filter((employee) => draft[employee.id] === "present" || draft[employee.id] === "absent")
      .filter((employee) => draft[employee.id] !== serverDraft[employee.id])
      .map((employee) => ({ employeeId: employee.id, status: draft[employee.id] }));
    await persist(entries, "Attendance saved.");
  }

  async function saveOne(employee) {
    const status = draft[employee.id];
    await persist(
      [{ employeeId: employee.id, status }],
      `${employee.fullName} updated.`,
    );
  }

  const loading = loadingEmployees || loadingAttendance;

  return (
    <div className="flex flex-col gap-4">
      <section className="grid gap-3 rounded-xl border border-theme-border bg-card p-4 shadow-sm lg:grid-cols-[180px_1fr] lg:items-end">
        <label className="flex flex-col gap-1.5 text-sm font-medium text-foreground">
          Date
          <input
            type="date"
            value={date}
            onChange={(event) => setDate(event.target.value)}
            className="rounded-lg border border-theme-border px-3 py-2 outline-none focus:ring-2 focus:ring-primary"
          />
        </label>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => applyStatus(employees.map((employee) => employee.id), "present")}
            className="rounded-lg bg-success px-3 py-2 text-sm font-medium text-white"
          >
            Mark all present
          </button>
          <button
            type="button"
            onClick={() => applyStatus(employees.map((employee) => employee.id), "absent")}
            className="rounded-lg bg-absent px-3 py-2 text-sm font-medium text-white"
          >
            Mark all absent
          </button>
          <button
            type="button"
            disabled={selectedIds.length === 0}
            onClick={() => applyStatus(selectedIds, "present")}
            className="rounded-lg border border-theme-border px-3 py-2 text-sm font-medium text-success disabled:opacity-50"
          >
            Selected present
          </button>
          <button
            type="button"
            disabled={selectedIds.length === 0}
            onClick={() => applyStatus(selectedIds, "absent")}
            className="rounded-lg border border-theme-border px-3 py-2 text-sm font-medium text-absent disabled:opacity-50"
          >
            Selected absent
          </button>
          <button
            type="button"
            onClick={saveAll}
            disabled={saving || !dirty}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition hover:bg-primary-hover disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save attendance"}
          </button>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-3">
        <Summary label="Present" value={presentCount} tone="text-success" />
        <Summary label="Absent" value={absentCount} tone="text-absent" />
        <Summary
          label="Not marked"
          value={employees.length - presentCount - absentCount}
          tone="text-muted"
        />
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
        {employees.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] text-left text-sm">
              <thead className="bg-sidebar text-xs tracking-wide text-muted uppercase">
                <tr>
                  <th className="px-4 py-3">
                    <input
                      type="checkbox"
                      aria-label="Select all employees"
                      checked={selectedIds.length === employees.length && employees.length > 0}
                      onChange={(event) => toggleAll(event.target.checked)}
                    />
                  </th>
                  <th className="px-4 py-3 font-semibold">Employee</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Update</th>
                </tr>
              </thead>
              <tbody>
                {employees.map((employee) => {
                  const status = draft[employee.id] || "";
                  const changed = status !== (serverDraft[employee.id] || "");
                  return (
                    <tr key={employee.id} className="border-t border-theme-border">
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          aria-label={`Select ${employee.fullName}`}
                          checked={Boolean(selected[employee.id])}
                          onChange={(event) =>
                            setSelected((current) => ({
                              ...current,
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
                          value={status}
                          onChange={(event) => setStatus(employee.id, event.target.value)}
                          className="rounded-lg border border-theme-border bg-card px-3 py-2 text-foreground outline-none focus:ring-2 focus:ring-primary"
                        >
                          <option value="">Not marked</option>
                          <option value="present">Present</option>
                          <option value="absent">Absent</option>
                        </select>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          disabled={!changed || !status || saving}
                          onClick={() => saveOne(employee)}
                          className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-white disabled:opacity-40"
                        >
                          Update
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : null}
      </section>
    </div>
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
