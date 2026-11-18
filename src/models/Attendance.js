import mongoose from "mongoose";

export const ATTENDANCE_STATUSES = ["present", "absent", "leave", "half-day"];
const MAX_NOTE_LENGTH = 300;

const attendanceSchema = new mongoose.Schema(
  {
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      required: true,
    },
    date: { type: String, required: true },
    status: { type: String, enum: ATTENDANCE_STATUSES, required: true },
    note: { type: String, default: "", trim: true, maxlength: MAX_NOTE_LENGTH },
  },
  { timestamps: true },
);

attendanceSchema.index({ employee: 1, date: 1 }, { unique: true });

if (mongoose.models.Attendance) {
  mongoose.deleteModel("Attendance");
}

export const Attendance = mongoose.model("Attendance", attendanceSchema);

export function serializeAttendance(doc) {
  const record = doc.toObject ? doc.toObject() : doc;
  return {
    id: String(record._id),
    employeeId: String(record.employee),
    date: record.date,
    status: record.status,
    note: record.note || "",
  };
}

export function isDateKey(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(value || ""));
}

export function parseAttendanceEntry(entry) {
  const employeeId = String(entry?.employeeId || "");
  const status = String(entry?.status || "");
  const note = String(entry?.note || "").trim();

  if (!mongoose.Types.ObjectId.isValid(employeeId)) {
    throw Object.assign(new Error("One of the employees is invalid"), { status: 400 });
  }
  if (!ATTENDANCE_STATUSES.includes(status)) {
    throw Object.assign(
      new Error("Status must be present, absent, leave, or half day"),
      { status: 400 },
    );
  }
  if (note.length > MAX_NOTE_LENGTH) {
    throw Object.assign(new Error("Note must be 300 characters or fewer"), { status: 400 });
  }

  return { employeeId, status, note };
}
