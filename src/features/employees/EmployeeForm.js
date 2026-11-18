"use client";

import { useState } from "react";

const fieldClassName =
  "w-full rounded-xl border border-theme-border bg-background px-3 py-2.5 text-sm text-foreground outline-none transition placeholder:text-muted/70 focus:border-primary focus:bg-card focus:ring-2 focus:ring-primary/30";

const MAX_PHOTO_BYTES = 1_500_000;

export const emptyEmployeeForm = {
  profileImage: "",
  fullName: "",
  email: "",
  phone: "",
  gender: "",
  dateOfBirth: "",
  address: "",
  designation: "",
  department: "",
  joiningDate: "",
  currentSalary: "",
  incrementSalary: "",
  incrementDate: "",
  status: "active",
};

export function employeeToForm(employee) {
  return {
    profileImage: employee.profileImage || "",
    fullName: employee.fullName || "",
    email: employee.email || "",
    phone: employee.phone || "",
    gender: employee.gender || "",
    dateOfBirth: employee.dateOfBirth || "",
    address: employee.address || "",
    designation: employee.designation || "",
    department: employee.department || "",
    joiningDate: employee.joiningDate || "",
    currentSalary: amountInput(employee.currentSalary),
    incrementSalary: amountInput(employee.incrementSalary),
    incrementDate: employee.incrementDate || "",
    status: employee.status || "active",
  };
}

function amountInput(value) {
  const amount = Number(value);
  return Number.isFinite(amount) && amount > 0 ? String(amount) : "";
}

function amountTotal(current, increment) {
  const left = current === "" ? 0 : Number(current);
  const right = increment === "" ? 0 : Number(increment);
  if (!Number.isFinite(left) || !Number.isFinite(right) || left < 0 || right < 0) return null;
  return Math.round((left + right) * 100) / 100;
}

function formatMoney(amount) {
  return new Intl.NumberFormat("en-PK", {
    style: "currency",
    currency: "PKR",
    minimumFractionDigits: 2,
  }).format(amount);
}

export default function EmployeeForm({
  initialValues,
  submitLabel,
  pending,
  error,
  onSubmit,
  onCancel,
}) {
  const [preview, setPreview] = useState(initialValues.profileImage || "");
  const [photoError, setPhotoError] = useState("");
  const [currentSalary, setCurrentSalary] = useState(initialValues.currentSalary || "");
  const [incrementSalary, setIncrementSalary] = useState(initialValues.incrementSalary || "");
  const updatedSalary = amountTotal(currentSalary, incrementSalary);

  function handlePhoto(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!/^image\/(jpeg|jpg|png|webp|gif)$/.test(file.type)) {
      setPhotoError("Use a JPG, PNG, WEBP, or GIF photo.");
      return;
    }
    if (file.size > MAX_PHOTO_BYTES) {
      setPhotoError("Photo must be smaller than 1.5 MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setPreview(typeof reader.result === "string" ? reader.result : "");
      setPhotoError("");
    };
    reader.onerror = () => setPhotoError("Could not read that photo.");
    reader.readAsDataURL(file);
  }

  function handleSubmit(event) {
    event.preventDefault();
    if (photoError) return;
    const form = new FormData(event.currentTarget);
    onSubmit({
      profileImage: preview,
      fullName: form.get("fullName"),
      email: form.get("email"),
      phone: form.get("phone"),
      gender: form.get("gender"),
      dateOfBirth: form.get("dateOfBirth"),
      address: form.get("address"),
      designation: form.get("designation"),
      department: form.get("department"),
      joiningDate: form.get("joiningDate"),
      currentSalary,
      incrementSalary,
      incrementDate: form.get("incrementDate"),
      status: form.get("status"),
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <section className="rounded-2xl border border-theme-border bg-card p-6 shadow-sm">
        <h2 className="text-base font-semibold text-foreground">Personal details</h2>
        <p className="mb-5 text-sm text-muted">How this person can be contacted.</p>
        <div className="grid gap-5 md:grid-cols-2">
          <div className="md:col-span-2">
            <ProfileImageField
              preview={preview}
              onChange={handlePhoto}
              onClear={() => {
                setPreview("");
                setPhotoError("");
              }}
              error={photoError}
            />
          </div>
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
          <Field label="Phone">
            <input
              name="phone"
              placeholder="03xx xxxxxxx"
              defaultValue={initialValues.phone}
              className={fieldClassName}
            />
          </Field>
          <Field label="Gender">
            <select
              name="gender"
              defaultValue={initialValues.gender}
              className={fieldClassName}
            >
              <option value="">Select gender</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
          </Field>
          <Field label="Date of birth">
            <input
              name="dateOfBirth"
              type="date"
              defaultValue={initialValues.dateOfBirth}
              className={fieldClassName}
            />
          </Field>
          <Field label="Address" className="md:col-span-2">
            <textarea
              name="address"
              rows={3}
              maxLength={400}
              placeholder="Street, city"
              defaultValue={initialValues.address}
              className={`${fieldClassName} resize-y`}
            />
          </Field>
        </div>
      </section>

      <section className="rounded-2xl border border-theme-border bg-card p-6 shadow-sm">
        <h2 className="text-base font-semibold text-foreground">Job details</h2>
        <p className="mb-5 text-sm text-muted">Role, department, and employment status.</p>
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
          <Field label="Current salary">
            <input
              name="currentSalary"
              type="number"
              min="0"
              step="0.01"
              inputMode="decimal"
              placeholder="0.00"
              value={currentSalary}
              onChange={(event) => setCurrentSalary(event.target.value)}
              className={fieldClassName}
            />
          </Field>
          <Field label="Increment salary">
            <input
              name="incrementSalary"
              type="number"
              min="0"
              step="0.01"
              inputMode="decimal"
              placeholder="0.00"
              value={incrementSalary}
              onChange={(event) => setIncrementSalary(event.target.value)}
              className={fieldClassName}
            />
          </Field>
          <Field label="Increment date">
            <input
              name="incrementDate"
              type="date"
              defaultValue={initialValues.incrementDate}
              className={fieldClassName}
            />
          </Field>
          <Field label="Updated salary">
            <input
              readOnly
              tabIndex={-1}
              aria-label="Updated salary"
              value={updatedSalary == null ? "" : formatMoney(updatedSalary)}
              className={`${fieldClassName} cursor-default bg-sidebar`}
            />
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

function ProfileImageField({ preview, onChange, onClear, error }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-sm font-medium text-foreground">Profile image</span>
      <div className="flex items-center gap-4">
        <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full border border-theme-border bg-background">
          {preview ? (
            <img src={preview} alt="" className="h-full w-full object-cover" />
          ) : (
            <span className="text-xs text-muted">Photo</span>
          )}
        </div>
        <div className="flex min-w-0 flex-col gap-2">
          <div className="flex flex-wrap gap-2">
            <label className="cursor-pointer rounded-xl bg-primary px-4 py-2 text-sm font-medium text-white transition hover:bg-primary-hover">
              {preview ? "Change photo" : "Upload photo"}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="sr-only"
                onChange={onChange}
              />
            </label>
            {preview ? (
              <button
                type="button"
                onClick={onClear}
                className="rounded-xl border border-theme-border bg-card px-4 py-2 text-sm font-medium text-foreground transition hover:bg-sidebar"
              >
                Remove
              </button>
            ) : null}
          </div>
          <p className="text-xs text-muted">JPG, PNG, WEBP, or GIF. Maximum 1.5 MB.</p>
          {error ? <p className="text-xs text-absent">{error}</p> : null}
        </div>
      </div>
    </div>
  );
}

function Field({ label, required, className = "", children }) {
  return (
    <label className={`flex flex-col gap-1.5 ${className}`}>
      <span className="text-sm font-medium text-foreground">
        {label}
        {required ? <span className="text-absent"> *</span> : null}
      </span>
      {children}
    </label>
  );
}
