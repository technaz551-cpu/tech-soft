import mongoose from "mongoose";

const DATE_KEY = /^\d{4}-\d{2}-\d{2}$/;
const IMAGE_PREFIX = /^data:image\/(jpeg|jpg|png|webp|gif);base64,/i;
const MAX_IMAGE_LENGTH = 2_000_000;
const GENDERS = ["male", "female", "other"];

const employeeSchema = new mongoose.Schema(
  {
    profileImage: { type: String, default: "" },
    fullName: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true, unique: true },
    phone: { type: String, default: "", trim: true },
    gender: { type: String, enum: ["", "male", "female", "other"], default: "" },
    dateOfBirth: { type: String, default: "" },
    address: { type: String, default: "", trim: true },
    designation: { type: String, default: "", trim: true },
    department: { type: String, default: "", trim: true },
    joiningDate: { type: String, default: "" },
    currentSalary: { type: Number, default: 0, min: 0 },
    incrementSalary: { type: Number, default: 0, min: 0 },
    incrementDate: { type: String, default: "" },
    updatedSalary: { type: Number, default: 0, min: 0 },
    status: { type: String, enum: ["active", "inactive"], default: "active" },
  },
  { timestamps: true },
);

if (mongoose.models.Employee) {
  mongoose.deleteModel("Employee");
}

export const Employee = mongoose.model("Employee", employeeSchema);

let salaryRemoved = false;

export async function removeLegacySalary() {
  if (salaryRemoved) return;
  try {
    await Employee.collection.updateMany(
      { salary: { $exists: true } },
      { $unset: { salary: "" } },
    );
    salaryRemoved = true;
  } catch {
    salaryRemoved = false;
  }
}

export function serializeEmployee(doc) {
  const employee = doc.toObject ? doc.toObject() : doc;
  return {
    id: String(employee._id),
    profileImage: employee.profileImage || "",
    fullName: employee.fullName,
    email: employee.email,
    phone: employee.phone || "",
    gender: employee.gender || "",
    dateOfBirth: employee.dateOfBirth || "",
    address: employee.address || "",
    designation: employee.designation || "",
    department: employee.department || "",
    joiningDate: employee.joiningDate || "",
    currentSalary: moneyAmount(employee.currentSalary),
    incrementSalary: moneyAmount(employee.incrementSalary),
    incrementDate: employee.incrementDate || "",
    updatedSalary: moneyAmount(employee.updatedSalary),
    status: employee.status,
    createdAt: employee.createdAt
      ? new Date(employee.createdAt).toISOString()
      : null,
    updatedAt: employee.updatedAt
      ? new Date(employee.updatedAt).toISOString()
      : null,
  };
}

function moneyAmount(value) {
  const amount = Number(value);
  return Number.isFinite(amount) ? amount : 0;
}

function parseMoney(value, label) {
  const raw = String(value ?? "").trim();
  if (!raw) return 0;
  const amount = Number(raw);
  if (!Number.isFinite(amount) || amount < 0) {
    throw Object.assign(new Error(`${label} must be zero or greater`), { status: 400 });
  }
  return Math.round(amount * 100) / 100;
}

function parseDate(value, label) {
  const date = String(value || "").trim();
  if (date && !DATE_KEY.test(date)) {
    throw Object.assign(new Error(`${label} must be YYYY-MM-DD`), { status: 400 });
  }
  return date;
}

function parseProfileImage(value) {
  const image = typeof value === "string" ? value.trim() : "";
  if (!image) return "";
  if (!IMAGE_PREFIX.test(image) || image.length > MAX_IMAGE_LENGTH) {
    throw Object.assign(
      new Error("Profile photo must be a JPG, PNG, WEBP, or GIF under 1.5 MB"),
      { status: 400 },
    );
  }
  return image;
}

export function parseEmployeeInput(body) {
  const fullName = String(body?.fullName || "").trim();
  const email = String(body?.email || "").trim().toLowerCase();
  const phone = String(body?.phone || "").trim();
  const gender = String(body?.gender || "").trim().toLowerCase();
  const designation = String(body?.designation || "").trim();
  const department = String(body?.department || "").trim();
  const address = String(body?.address || "").trim();
  const status = body?.status === "inactive" ? "inactive" : "active";
  const currentSalary = parseMoney(body?.currentSalary, "Current salary");
  const incrementSalary = parseMoney(body?.incrementSalary, "Increment salary");

  if (!fullName) {
    throw Object.assign(new Error("Name is required"), { status: 400 });
  }
  if (!email.includes("@")) {
    throw Object.assign(new Error("A valid email is required"), { status: 400 });
  }
  if (gender && !GENDERS.includes(gender)) {
    throw Object.assign(new Error("Gender must be male, female, or other"), { status: 400 });
  }
  if (address.length > 400) {
    throw Object.assign(new Error("Address must be 400 characters or fewer"), { status: 400 });
  }

  return {
    profileImage: parseProfileImage(body?.profileImage),
    fullName,
    email,
    phone,
    gender,
    dateOfBirth: parseDate(body?.dateOfBirth, "Date of birth"),
    address,
    designation,
    department,
    joiningDate: parseDate(body?.joiningDate, "Joining date"),
    currentSalary,
    incrementSalary,
    incrementDate: parseDate(body?.incrementDate, "Increment date"),
    updatedSalary: Math.round((currentSalary + incrementSalary) * 100) / 100,
    status,
  };
}
