"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import EmployeeForm, { emptyEmployeeForm } from "@/features/employees/EmployeeForm";
import { useCreateEmployeeMutation } from "@/features/employees/employeesApi";
import { apiErrorMessage } from "@/lib/format";

export default function NewEmployeePage() {
  const router = useRouter();
  const [createEmployee, { isLoading }] = useCreateEmployeeMutation();
  const [formError, setFormError] = useState("");

  async function handleCreate(values) {
    setFormError("");
    try {
      const employee = await createEmployee(values).unwrap();
      router.push(`/employees/${employee.id}`);
    } catch (error) {
      setFormError(apiErrorMessage(error, "Could not add employee"));
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4">
      <p className="text-sm text-muted">
        <Link href="/employees" className="font-medium text-primary">
          Employees
        </Link>
        <span> / New</span>
      </p>
      <EmployeeForm
        initialValues={emptyEmployeeForm}
        submitLabel="Create employee"
        pending={isLoading}
        error={formError}
        onSubmit={handleCreate}
        onCancel={() => router.push("/employees")}
      />
    </div>
  );
}
