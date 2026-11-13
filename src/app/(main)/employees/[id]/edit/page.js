"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import EmployeeForm, { employeeToForm } from "@/features/employees/EmployeeForm";
import {
  useGetEmployeeQuery,
  useUpdateEmployeeMutation,
} from "@/features/employees/employeesApi";
import { apiErrorMessage } from "@/lib/format";

export default function EditEmployeePage() {
  const params = useParams();
  const id = params.id;
  const router = useRouter();
  const { data: employee, isLoading, isError, error } = useGetEmployeeQuery(id, {
    skip: !id,
  });
  const [updateEmployee, { isLoading: saving }] = useUpdateEmployeeMutation();
  const [formError, setFormError] = useState("");

  async function handleUpdate(values) {
    setFormError("");
    try {
      await updateEmployee({ id, ...values }).unwrap();
      router.push(`/employees/${id}`);
    } catch (updateError) {
      setFormError(apiErrorMessage(updateError, "Could not update employee"));
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

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4">
      <p className="text-sm text-muted">
        <Link href="/employees" className="font-medium text-primary">
          Employees
        </Link>
        <span> / </span>
        <Link href={`/employees/${employee.id}`} className="font-medium text-primary">
          {employee.fullName}
        </Link>
        <span> / Edit</span>
      </p>
      <EmployeeForm
        key={`${employee.id}-${employee.updatedAt}`}
        initialValues={employeeToForm(employee)}
        submitLabel="Save changes"
        pending={saving}
        error={formError}
        onSubmit={handleUpdate}
        onCancel={() => router.push(`/employees/${employee.id}`)}
      />
    </div>
  );
}
