"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { useGetAttendanceQuery } from "@/features/attendance/attendanceApi";
import {
  useDeleteEmployeeMutation,
  useGetEmployeeQuery,
} from "@/features/employees/employeesApi";
import { apiErrorMessage, formatDisplayDate } from "@/lib/format";

export default function EmployeeDetailPage() {
  const params = useParams();
  const id = params.id;
  const router = useRouter();
  const { data: employee, isLoading, isError, error } = useGetEmployeeQuery(id, {
    skip: !id,
  });
  const { data: attendance } = useGetAttendanceQuery(
    { employeeId: id },
    { skip: !id },
  );
  const [deleteEmployee, { isLoading: deleting }] = useDeleteEmployeeMutation();
  const [deleteError, setDeleteError] = useState("");

  async function handleDelete() {
    if (!employee) return;
    const confirmed = window.confirm(`Delete ${employee.fullName}?`);
    if (!confirmed) return;
    try {
      await deleteEmployee(id).unwrap();
      router.push("/employees");
      router.refresh();
    } catch (deleteFailure) {
      setDeleteError(apiErrorMessage(deleteFailure, "Could not delete employee"));
    }
  }

  if (isLoading) {
    return <p className="text-sm text-muted">Loading employee…</p>;
  }

  if (isError || !employee) {
    return (
      <section className="rounded-xl border border-theme-border bg-card p-6 shadow-sm">
        <p className="text-sm text-absent" role="alert">
          {apiErrorMessage(error, "Employee not found")}
        </p>
        <Link href="/employees" className="mt-4 inline-block text-sm font-medium text-primary">
          Back to employees
        </Link>
      </section>
    );
  }

  const history = attendance?.records || [];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm text-muted">
            <Link href="/employees" className="font-medium text-primary">
              Employees
            </Link>
            <span> / {employee.fullName}</span>
          </p>
          <h2 className="mt-1 text-2xl font-semibold text-foreground">
            {employee.fullName}
          </h2>
          <p className="text-sm text-muted">
            {employee.designation || "No designation"}
            {employee.department ? ` · ${employee.department}` : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/employees/${employee.id}/edit`}
            aria-label={`Edit ${employee.fullName}`}
            title="Edit employee"
            className="inline-flex items-center gap-2 rounded-lg border border-theme-border bg-card px-3 py-2 text-sm font-medium text-primary transition hover:bg-sidebar"
          >
            <EyeIcon />
            Edit
          </Link>
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting}
            className="rounded-lg border border-absent px-4 py-2 text-sm font-medium text-absent disabled:opacity-60"
          >
            {deleting ? "Deleting…" : "Delete employee"}
          </button>
        </div>
      </div>

      {deleteError ? (
        <p className="text-sm text-absent" role="alert">
          {deleteError}
        </p>
      ) : null}

      <section className="rounded-xl border border-theme-border bg-card p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-foreground">Profile</h3>
        <p className="mb-4 text-sm text-muted">Employment and contact details.</p>
        <dl className="grid gap-4 sm:grid-cols-2">
          <Detail label="Email" value={employee.email} />
          <Detail label="Phone" value={employee.phone || "—"} />
          <Detail label="Designation" value={employee.designation || "—"} />
          <Detail label="Department" value={employee.department || "—"} />
          <Detail label="Salary" value={String(employee.salary ?? 0)} />
          <Detail label="Joining date" value={formatDisplayDate(employee.joiningDate)} />
          <Detail
            label="Status"
            value={employee.status === "active" ? "Active" : "Inactive"}
            tone={employee.status === "active" ? "text-success" : "text-muted"}
          />
        </dl>
      </section>

      <section className="rounded-xl border border-theme-border bg-card p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-foreground">Recent attendance</h3>
        <p className="mb-4 text-sm text-muted">Latest marked days for this employee.</p>
        {history.length === 0 ? (
          <p className="text-sm text-muted">No attendance marked yet.</p>
        ) : (
          <ul className="divide-y divide-theme-border">
            {history.slice(0, 14).map((record) => (
              <li key={record.id} className="flex items-center justify-between py-2 text-sm">
                <span className="text-foreground">{formatDisplayDate(record.date)}</span>
                <span
                  className={
                    record.status === "present"
                      ? "font-medium text-success"
                      : "font-medium text-absent"
                  }
                >
                  {record.status === "present" ? "Present" : "Absent"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Detail({ label, value, tone = "text-foreground" }) {
  return (
    <div>
      <dt className="text-xs font-semibold tracking-wide text-muted uppercase">{label}</dt>
      <dd className={`mt-1 text-sm font-medium ${tone}`}>{value}</dd>
    </div>
  );
}

function EyeIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"
      />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}
