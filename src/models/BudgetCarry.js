import mongoose from "mongoose";

const budgetCarrySchema = new mongoose.Schema(
  {
    year: { type: String, required: true, unique: true },
    sourceYear: { type: String, required: true },
    month: { type: String, unique: true, sparse: true },
    sourceMonth: { type: String },
    amount: { type: Number, required: true },
  },
  { timestamps: true },
);

if (mongoose.models.BudgetCarry) {
  mongoose.deleteModel("BudgetCarry");
}

export const BudgetCarry = mongoose.model("BudgetCarry", budgetCarrySchema);
