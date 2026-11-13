const fieldClassName =
  "w-full rounded-xl border border-theme-border bg-background px-3 py-2.5 text-sm text-foreground outline-none transition placeholder:text-muted/70 focus:border-primary focus:bg-card focus:ring-2 focus:ring-primary/30";

export const emptyEmployeeForm = {
  fullName: "",
  email: "",
  phone: "",
  designation: "",
  department: "",
  salary: "",
  joiningDate: "",
  status: "active",
};

export function employeeToForm(employee) {
  return {
    fullName: employee.fullName || "",
    email: employee.email || "",
    phone: employee.phone || "",
    designation: employee.designation || "",
    department: employee.department || "",
    salary: employee.salary ? String(employee.salary) : "",
    joiningDate: employee.joiningDate || "",
    status: employee.status || "active",
  };
}

export default function EmployeeForm({
  initialValues,
  submitLabel,
  pending,
  error,
  onSubmit,
  onCancel,
}) {
  function handleSubmit(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    onSubmit({
      fullName: form.get("fullName"),
      email: form.get("email"),
      phone: form.get("phone"),
      designation: form.get("designation"),
      department: form.get("department"),
      salary: form.get("salary"),
      joiningDate: form.get("joiningDate"),
      status: form.get("status"),
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <section className="rounded-2xl border border-theme-border bg-card p-6 shadow-sm">
        <h2 className="text-base font-semibold text-foreground">Personal details</h2>
        <p className="mb-5 text-sm text-muted">
          How this person can be contacted.
        </p>
        <div className="grid gap-5 md:grid-cols-2">
          <Field label="Full name" required>
            <input
              name="fullName"
              required
              placeholder="Ayesha Khan"
              defaultValue={initialValues.fullName}
              className={fieldClassName}
            />
          </Field>
          <Field label="Email" required>
            <input
              name="email"
              type="email"
              required
              placeholder="name@technaz.com"
              defaultValue={initialValues.email}
              className={fieldClassName}
            />
          </Field>
          <Field label="Phone" hint="Optional">
            <input
              name="phone"
              placeholder="03xx xxxxxxx"
              defaultValue={initialValues.phone}
              className={fieldClassName}
            />
          </Field>
        </div>
      </section>

      <section className="rounded-2xl border border-theme-border bg-card p-6 shadow-sm">
        <h2 className="text-base font-semibold text-foreground">Job details</h2>
        <p className="mb-5 text-sm text-muted">
          Role, department, pay, and employment status.
        </p>
        <div className="grid gap-5 md:grid-cols-2">
          <Field label="Designation">
            <input
              name="designation"
              placeholder="Accountant"
              defaultValue={initialValues.designation}
              className={fieldClassName}
            />
          </Field>
          <Field label="Department">
            <input
              name="department"
              placeholder="Accounts"
              defaultValue={initialValues.department}
              className={fieldClassName}
            />
          </Field>
          <Field label="Salary" hint="Monthly amount">
            <input
              name="salary"
              type="number"
              min="0"
              step="1"
              placeholder="0"
              defaultValue={initialValues.salary}
              className={fieldClassName}
            />
          </Field>
          <Field label="Joining date">
            <input
              name="joiningDate"
              type="date"
              defaultValue={initialValues.joiningDate}
              className={fieldClassName}
            />
          </Field>
          <Field label="Status">
            <select
              name="status"
              defaultValue={initialValues.status}
              className={fieldClassName}
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </Field>
        </div>
      </section>

      {error ? (
        <p className="rounded-xl border border-absent/30 bg-card px-4 py-3 text-sm text-absent" role="alert">
          {error}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center justify-end gap-3">
        {onCancel ? (
          <button
            type="button"
            onClick={onCancel}
            className="rounded-xl border border-theme-border bg-card px-4 py-2.5 text-sm font-medium text-foreground transition hover:bg-sidebar"
          >
            Cancel
          </button>
        ) : null}
        <button
          type="submit"
          disabled={pending}
          className="rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-white transition hover:bg-primary-hover disabled:opacity-60"
        >
          {pending ? "Saving…" : submitLabel}
        </button>
      </div>
    </form>
  );
}

function Field({ label, hint, required, children }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="flex items-center justify-between gap-2 text-sm font-medium text-foreground">
        <span>
          {label}
          {required ? <span className="text-absent"> *</span> : null}
        </span>
        {hint ? <span className="text-xs font-normal text-muted">{hint}</span> : null}
      </span>
      {children}
    </label>
  );
}
