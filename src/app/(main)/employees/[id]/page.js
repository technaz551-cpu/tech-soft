"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { useGetAttendanceQuery } from "@/features/attendance/attendanceApi";
import {
  useDeleteEmployeeMutation,
  useGetEmployeeQuery,
} from "@/features/employees/employeesApi";
import ConfirmDialog from "@/components/ConfirmDialog";
import { apiErrorMessage, formatDisplayDate } from "@/lib/format";

const ATTENDANCE_META = [
  { status: "present", label: "Present", tone: "text-success", pill: "bg-success/10 text-success" },
  { status: "absent", label: "Absent", tone: "text-absent", pill: "bg-absent/10 text-absent" },
  { status: "leave", label: "Leave", tone: "text-amber-700", pill: "bg-amber-500/10 text-amber-700" },
  { status: "half-day", label: "Half Day", tone: "text-sky-700", pill: "bg-sky-500/10 text-sky-700" },
];

export default function EmployeeDetailPage() {
  const params = useParams();
  const id = params.id;
  const router = useRouter();
  const { data: employee, isLoading, isError, error } = useGetEmployeeQuery(id, {
    skip: !id,
  });
  const { data: attendance, isLoading: loadingAttendance } = useGetAttendanceQuery(
    { employeeId: id },
    { skip: !id },
  );
  const [deleteEmployee, { isLoading: deleting }] = useDeleteEmployeeMutation();
  const [deleteError, setDeleteError] = useState("");
  const [confirming, setConfirming] = useState(false);

  async function confirmDelete() {
    if (!employee) return;
    try {
      await deleteEmployee(id).unwrap();
      router.push("/employees");
      router.refresh();
    } catch (deleteFailure) {
      setDeleteError(apiErrorMessage(deleteFailure, "Could not delete employee"));
      setConfirming(false);
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
  const recent = history.slice(0, 14);
  const counts = Object.fromEntries(
    ATTENDANCE_META.map((item) => [
      item.status,
      history.filter((record) => record.status === item.status).length,
    ]),
  );

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted">
        <Link href="/employees" className="font-medium text-primary">
          Employees
        </Link>
        <span> / {employee.fullName}</span>
      </p>

      <section className="rounded-xl border border-theme-border bg-card p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-4">
            <Avatar name={employee.fullName} src={employee.profileImage} />
            <div className="min-w-0">
              <h2 className="truncate text-2xl font-semibold text-foreground">{employee.fullName}</h2>
              <p className="mt-1 text-sm text-muted">{employee.designation || "No designation"}</p>
              <div className="mt-2">
                <StatusPill status={employee.status} />
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href={`/employees/${employee.id}/edit`}
              aria-label={`Edit ${employee.fullName}`}
              title="Edit employee"
              className="inline-flex items-center gap-2 rounded-lg border border-theme-border bg-card px-3 py-2 text-sm font-medium text-primary transition hover:bg-sidebar"
            >
              <PencilIcon />
              Edit
            </Link>
            <button
              type="button"
              onClick={() => {
                setDeleteError("");
                setConfirming(true);
              }}
              className="rounded-lg border border-absent px-4 py-2 text-sm font-medium text-absent"
            >
              Delete employee
            </button>
          </div>
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Attendance summary</h3>
          <p className="text-sm text-muted">Marked days for this employee.</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {ATTENDANCE_META.map((item) => (
            <article
              key={item.status}
              className="rounded-xl border border-theme-border bg-card px-4 py-3 shadow-sm"
            >
              <p className="text-xs font-semibold tracking-wide text-muted uppercase">{item.label}</p>
              <p className={`mt-1 text-2xl font-semibold ${item.tone}`}>
                {loadingAttendance ? "—" : counts[item.status]}
              </p>
            </article>
          ))}
        </div>
      </section>

      {deleteError ? (
        <p className="text-sm text-absent" role="alert">
          {deleteError}
        </p>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <InfoCard title="Personal information" subtitle="Contact and identity details.">
          <Detail label="Email" value={employee.email} />
          <Detail label="Phone" value={employee.phone || "—"} />
          <Detail label="Gender" value={formatGender(employee.gender)} />
          <Detail label="Date of birth" value={formatDisplayDate(employee.dateOfBirth)} />
          <Detail label="Address" value={employee.address || "—"} className="sm:col-span-2" />
        </InfoCard>
        <InfoCard title="Job information" subtitle="Role and employment details.">
          <Detail label="Designation" value={employee.designation || "—"} />
          <Detail label="Department" value={employee.department || "—"} />
          <Detail label="Joining date" value={formatDisplayDate(employee.joiningDate)} />
          <Detail
            label="Status"
            value={employee.status === "active" ? "Active" : "Inactive"}
            tone={employee.status === "active" ? "text-success" : "text-muted"}
          />
          <Detail label="Current salary" value={formatMoney(employee.currentSalary)} />
          <Detail label="Increment salary" value={formatMoney(employee.incrementSalary)} />
          <Detail label="Increment date" value={formatDisplayDate(employee.incrementDate)} />
          <Detail
            label="Updated salary"
            value={formatMoney(employee.updatedSalary)}
            tone="text-primary"
          />
        </InfoCard>
      </div>

      <section className="overflow-hidden rounded-xl border border-theme-border bg-card shadow-sm">
        <div className="border-b border-theme-border px-6 py-4">
          <h3 className="text-lg font-semibold text-foreground">Recent attendance</h3>
          <p className="text-sm text-muted">Latest marked days for this employee.</p>
        </div>
        {loadingAttendance ? <p className="p-6 text-sm text-muted">Loading attendance…</p> : null}
        {!loadingAttendance && recent.length === 0 ? (
          <p className="p-6 text-sm text-muted">No attendance marked yet.</p>
        ) : null}
        {recent.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead className="text-xs tracking-wide text-muted uppercase">
                <tr className="border-b border-theme-border">
                  <th className="px-6 py-3 font-semibold">Date</th>
                  <th className="px-6 py-3 font-semibold">Status</th>
                  <th className="px-6 py-3 font-semibold">Note</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((record) => {
                  const meta = ATTENDANCE_META.find((item) => item.status === record.status);
                  return (
                    <tr key={record.id} className="border-b border-theme-border last:border-b-0">
                      <td className="px-6 py-3 text-foreground">{formatDisplayDate(record.date)}</td>
                      <td className="px-6 py-3">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
                            meta?.pill || "bg-sidebar text-muted"
                          }`}
                        >
                          {meta?.label || record.status}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-muted">{record.note || "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : null}
      </section>

      {confirming ? (
        <ConfirmDialog
          title={`Delete ${employee.fullName}?`}
          message="This removes the employee and their attendance. This cannot be undone."
          error={deleteError}
          pending={deleting}
          onCancel={() => {
            if (!deleting) setConfirming(false);
          }}
          onConfirm={confirmDelete}
        />
      ) : null}
    </div>
  );
}

function Avatar({ name, src }) {
  if (src) {
    return (
      <img
        src={src}
        alt=""
        className="h-20 w-20 shrink-0 rounded-full border border-theme-border object-cover"
      />
    );
  }
  return (
    <span className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full border border-theme-border bg-primary/10 text-lg font-semibold text-primary">
      {initials(name)}
    </span>
  );
}

function initials(name) {
  const parts = String(name || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  const letters = parts.slice(0, 2).map((part) => part[0]?.toUpperCase() || "");
  return letters.join("") || "—";
}

function StatusPill({ status }) {
  const active = status === "active";
  return (
    <span
      className={
        active
          ? "inline-flex rounded-full bg-success/10 px-2.5 py-1 text-xs font-medium text-success"
          : "inline-flex rounded-full bg-muted/10 px-2.5 py-1 text-xs font-medium text-muted"
      }
    >
      {active ? "Active" : "Inactive"}
    </span>
  );
}

function InfoCard({ title, subtitle, children }) {
  return (
    <section className="rounded-xl border border-theme-border bg-card p-6 shadow-sm">
      <h3 className="text-lg font-semibold text-foreground">{title}</h3>
      <p className="mb-4 text-sm text-muted">{subtitle}</p>
      <dl className="grid gap-4 sm:grid-cols-2">{children}</dl>
    </section>
  );
}

function formatMoney(amount) {
  return new Intl.NumberFormat("en-PK", {
    style: "currency",
    currency: "PKR",
    minimumFractionDigits: 2,
  }).format(Number(amount) || 0);
}

function formatGender(gender) {
  if (gender === "male") return "Male";
  if (gender === "female") return "Female";
  if (gender === "other") return "Other";
  return "—";
}

function Detail({ label, value, tone = "text-foreground", className = "" }) {
  return (
    <div className={className}>
      <dt className="text-xs font-semibold tracking-wide text-muted uppercase">{label}</dt>
      <dd className={`mt-1 text-sm font-medium whitespace-pre-wrap ${tone}`}>{value}</dd>
    </div>
  );
}

function PencilIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      aria-hidden="true"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 20h9" />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4 11.5-11.5z"
      />
    </svg>
  );
}
