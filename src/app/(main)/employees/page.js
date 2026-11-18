"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import ConfirmDialog from "@/components/ConfirmDialog";
import {
  useDeleteEmployeeMutation,
  useGetEmployeesQuery,
} from "@/features/employees/employeesApi";
import { apiErrorMessage, formatDisplayDate } from "@/lib/format";

const controlClassName =
  "h-9 rounded-md border border-theme-border bg-card px-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary";

const PAGE_SIZES = [5, 10, 25, 50];

export default function EmployeesPage() {
  const { data: employees = [], isLoading, isError, error } = useGetEmployeesQuery();
  const [deleteEmployee, { isLoading: deleting }] = useDeleteEmployeeMutation();
  const [query, setQuery] = useState("");
  const [department, setDepartment] = useState("");
  const [status, setStatus] = useState("");
  const [pageSize, setPageSize] = useState(5);
  const [page, setPage] = useState(1);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [deleteError, setDeleteError] = useState("");

  const departments = useMemo(() => {
    return [...new Set(employees.map((employee) => employee.department).filter(Boolean))].sort();
  }, [employees]);

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    return employees.filter((employee) => {
      const matchesQuery =
        !term ||
        [employee.fullName, employee.email, employee.department, employee.designation]
          .join(" ")
          .toLowerCase()
          .includes(term);
      const matchesDepartment = !department || employee.department === department;
      const matchesStatus = !status || employee.status === status;
      return matchesQuery && matchesDepartment && matchesStatus;
    });
  }, [employees, query, department, status]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));

  useEffect(() => {
    if (page > pageCount) setPage(pageCount);
  }, [page, pageCount]);

  const startIndex = filtered.length === 0 ? 0 : (page - 1) * pageSize;
  const pageRows = filtered.slice(startIndex, startIndex + pageSize);
  const showingFrom = filtered.length === 0 ? 0 : startIndex + 1;
  const showingTo = startIndex + pageRows.length;

  function updateFilter(setter) {
    return (event) => {
      setter(event.target.value);
      setPage(1);
    };
  }

  async function confirmDelete() {
    if (!pendingDelete) return;
    setDeleteError("");
    try {
      await deleteEmployee(pendingDelete.id).unwrap();
      setPendingDelete(null);
    } catch (failure) {
      setDeleteError(apiErrorMessage(failure, "Could not delete employee"));
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
          <span>Payroll</span>
          <ChevronIcon />
          <span className="text-foreground">Employees</span>
        </nav>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">Employees</h1>
            <p className="mt-1 text-sm text-muted">
              Add, update, and remove staff records
            </p>
          </div>
          <Link
            href="/employees/new"
            className="inline-flex shrink-0 items-center rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white transition hover:bg-primary-hover"
          >
            Add Employee
          </Link>
        </div>
      </header>

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
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <select
              value={department}
              onChange={updateFilter(setDepartment)}
              className={controlClassName}
              aria-label="Department"
            >
              <option value="">All departments</option>
              {departments.map((name) => (
                <option key={name} value={name}>
                  {name}
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
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
            <input
              value={query}
              onChange={updateFilter(setQuery)}
              placeholder="Search..."
              aria-label="Search employees"
              className={`${controlClassName} w-full sm:w-52`}
            />
          </div>
        </div>

        {isLoading ? <p className="p-6 text-sm text-muted">Loading employees…</p> : null}
        {isError ? (
          <p className="p-6 text-sm text-absent" role="alert">
            {apiErrorMessage(error, "Could not load employees")}
          </p>
        ) : null}
        {!isLoading && !isError && filtered.length === 0 ? (
          <p className="p-6 text-sm text-muted">No employees match these filters.</p>
        ) : null}

        {pageRows.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-left text-sm">
              <thead className="text-xs tracking-wide text-muted uppercase">
                <tr className="border-b border-theme-border">
                  <th className="px-4 py-3 font-semibold">Sno.</th>
                  <th className="px-4 py-3 font-semibold">Name</th>
                  <th className="px-4 py-3 font-semibold">Department</th>
                  <th className="px-4 py-3 font-semibold">Designation</th>
                  <th className="px-4 py-3 font-semibold">Joining date</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Action</th>
                </tr>
              </thead>
              <tbody>
                {pageRows.map((employee, index) => (
                  <tr key={employee.id} className="border-b border-theme-border last:border-b-0">
                    <td className="px-4 py-3 text-muted">{startIndex + index + 1}</td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-foreground">{employee.fullName}</p>
                      <p className="text-xs text-muted">{employee.email}</p>
                    </td>
                    <td className="px-4 py-3 text-foreground">{employee.department || "—"}</td>
                    <td className="px-4 py-3 text-foreground">{employee.designation || "—"}</td>
                    <td className="px-4 py-3 text-foreground">
                      {formatDisplayDate(employee.joiningDate)}
                    </td>
                    <td className="px-4 py-3">
                      <StatusPill status={employee.status} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/employees/${employee.id}`}
                          aria-label={`View ${employee.fullName}`}
                          title="View"
                          className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-primary text-white transition hover:bg-primary-hover"
                        >
                          <EyeIcon />
                        </Link>
                        <Link
                          href={`/employees/${employee.id}/edit`}
                          aria-label={`Edit ${employee.fullName}`}
                          title="Edit"
                          className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-primary bg-card text-primary transition hover:bg-primary/10"
                        >
                          <PencilIcon />
                        </Link>
                        <button
                          type="button"
                          onClick={() => {
                            setDeleteError("");
                            setPendingDelete(employee);
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
          title={`Delete ${pendingDelete.fullName}?`}
          message="This removes the employee and their attendance. This cannot be undone."
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

function ChevronIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 text-muted" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="m9 6 6 6-6 6" />
    </svg>
  );
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
