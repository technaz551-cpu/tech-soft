import mongoose from "mongoose";

const attendanceSchema = new mongoose.Schema(
  {
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      required: true,
    },
    date: { type: String, required: true },
    status: { type: String, enum: ["present", "absent"], required: true },
  },
  { timestamps: true },
);

attendanceSchema.index({ employee: 1, date: 1 }, { unique: true });

export const Attendance =
  mongoose.models.Attendance || mongoose.model("Attendance", attendanceSchema);

export function serializeAttendance(doc) {
  const record = doc.toObject ? doc.toObject() : doc;
  return {
    id: String(record._id),
    employeeId: String(record.employee),
    date: record.date,
    status: record.status,
  };
}

export function isDateKey(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(value || ""));
}
