import mongoose from "mongoose";

const employeeSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true, unique: true },
    phone: { type: String, default: "", trim: true },
    designation: { type: String, default: "", trim: true },
    department: { type: String, default: "", trim: true },
    salary: { type: Number, default: 0, min: 0 },
    joiningDate: { type: String, default: "" },
    status: { type: String, enum: ["active", "inactive"], default: "active" },
  },
  { timestamps: true },
);

export const Employee =
  mongoose.models.Employee || mongoose.model("Employee", employeeSchema);

export function serializeEmployee(doc) {
  const employee = doc.toObject ? doc.toObject() : doc;
  return {
    id: String(employee._id),
    fullName: employee.fullName,
    email: employee.email,
    phone: employee.phone || "",
    designation: employee.designation || "",
    department: employee.department || "",
    salary: employee.salary ?? 0,
    joiningDate: employee.joiningDate || "",
    status: employee.status,
    createdAt: employee.createdAt
      ? new Date(employee.createdAt).toISOString()
      : null,
    updatedAt: employee.updatedAt
      ? new Date(employee.updatedAt).toISOString()
      : null,
  };
}

export function parseEmployeeInput(body) {
  const fullName = String(body?.fullName || "").trim();
  const email = String(body?.email || "").trim().toLowerCase();
  const phone = String(body?.phone || "").trim();
  const designation = String(body?.designation || "").trim();
  const department = String(body?.department || "").trim();
  const joiningDate = String(body?.joiningDate || "").trim();
  const status = body?.status === "inactive" ? "inactive" : "active";
  const salaryValue = body?.salary === "" || body?.salary == null ? 0 : Number(body.salary);

  if (!fullName) {
    throw Object.assign(new Error("Name is required"), { status: 400 });
  }
  if (!email.includes("@")) {
    throw Object.assign(new Error("A valid email is required"), { status: 400 });
  }
  if (!Number.isFinite(salaryValue) || salaryValue < 0) {
    throw Object.assign(new Error("Salary must be a positive number"), { status: 400 });
  }
  if (joiningDate && !/^\d{4}-\d{2}-\d{2}$/.test(joiningDate)) {
    throw Object.assign(new Error("Joining date must be YYYY-MM-DD"), { status: 400 });
  }

  return {
    fullName,
    email,
    phone,
    designation,
    department,
    salary: salaryValue,
    joiningDate,
    status,
  };
}
