"use client";

import Link from "next/link";
import { useGetAttendanceQuery } from "@/features/attendance/attendanceApi";
import { useGetEmployeesQuery } from "@/features/employees/employeesApi";
import { localDateKey } from "@/lib/format";

export default function DashboardPage() {
  const today = localDateKey();
  const { data: employees, isLoading, isError, error } = useGetEmployeesQuery();
  const list = employees ?? [];
  const { data: attendance } = useGetAttendanceQuery({ date: today });
  const records = attendance?.records || [];
  const present = records.filter((record) => record.status === "present").length;
  const absent = records.filter((record) => record.status === "absent").length;
  const active = list.filter((employee) => employee.status === "active").length;
  const latest = [...list]
    .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))
    .slice(0, 5);

  return (
    <div className="flex flex-col gap-6">
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Employees" value={isLoading ? "…" : list.length} hint="All staff records" />
        <Stat label="Active" value={isLoading ? "…" : active} hint="Currently employed" />
        <Stat label="Present today" value={present} hint="Marked present" tone="text-success" />
        <Stat label="Absent today" value={absent} hint="Marked absent" tone="text-absent" />
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <article className="rounded-xl border border-theme-border bg-card p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-foreground">Payroll</h2>
          <p className="mt-1 text-sm text-muted">
            Keep employee records current, then mark today&apos;s attendance.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link
              href="/employees"
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover"
            >
              Manage employees
            </Link>
            <Link
              href="/attendance"
              className="rounded-lg border border-theme-border px-4 py-2 text-sm font-medium text-foreground hover:bg-sidebar"
            >
              Open attendance
            </Link>
          </div>
        </article>
        <article className="rounded-xl border border-theme-border bg-card p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-foreground">Latest employees</h2>
          <p className="mt-1 mb-4 text-sm text-muted">Newest people added to the team.</p>
          {isError ? (
            <p className="text-sm text-absent" role="alert">
              {error?.data?.error || "Could not load employees"}
            </p>
          ) : null}
          {isLoading ? (
            <p className="text-sm text-muted">Loading employees…</p>
          ) : null}
          {!isLoading && !isError && latest.length === 0 ? (
            <p className="text-sm text-muted">No employees added yet.</p>
          ) : null}
          {!isLoading && latest.length > 0 ? (
            <ul className="divide-y divide-theme-border">
              {latest.map((employee) => (
                <li key={employee.id} className="flex items-center justify-between py-2 text-sm">
                  <span>
                    <span className="font-medium text-foreground">{employee.fullName}</span>
                    <span className="block text-xs text-muted">
                      {employee.designation || employee.department || employee.email}
                    </span>
                  </span>
                  <Link href={`/employees/${employee.id}`} className="font-medium text-primary">
                    Details
                  </Link>
                </li>
              ))}
            </ul>
          ) : null}
        </article>
      </section>
    </div>
  );
}

function Stat({ label, value, hint, tone = "text-foreground" }) {
  return (
    <article className="rounded-xl border border-theme-border bg-card p-5 shadow-sm">
      <p className="text-xs font-semibold tracking-wide text-muted uppercase">{label}</p>
      <p className={`mt-2 text-3xl font-semibold ${tone}`}>{value}</p>
      <p className="mt-1 text-sm text-muted">{hint}</p>
    </article>
  );
}
