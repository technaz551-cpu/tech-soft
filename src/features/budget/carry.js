export function budgetMonthKey(year, month) {
  const yearText = String(year || "").trim();
  const monthText = String(month || "").trim().padStart(2, "0");
  if (!/^\d{4}$/.test(yearText) || !/^(0[1-9]|1[0-2])$/.test(monthText)) return "";
  return `${yearText}-${monthText}`;
}

export function expenseMonthKey(date) {
  if (date instanceof Date && !Number.isNaN(date.getTime())) {
    return budgetMonthKey(date.getFullYear(), date.getMonth() + 1);
  }
  const match = String(date || "").trim().match(/^(\d{4})-(\d{1,2})/);
  if (!match) return "";
  return budgetMonthKey(match[1], match[2]);
}

export function normalizeCategory(value) {
  return String(value || "").trim().toLowerCase();
}

export function previousPeriod(year, month) {
  const yearNumber = Number(year);
  const monthNumber = Number(month);
  if (!Number.isInteger(yearNumber) || monthNumber < 1 || monthNumber > 12) return null;
  const date = new Date(yearNumber, monthNumber - 2, 1);
  return {
    year: String(date.getFullYear()),
    month: String(date.getMonth() + 1).padStart(2, "0"),
  };
}

export function nextPeriod(year, month) {
  const yearNumber = Number(year);
  const monthNumber = Number(month);
  if (!Number.isInteger(yearNumber) || monthNumber < 1 || monthNumber > 12) return null;
  const date = new Date(yearNumber, monthNumber, 1);
  return {
    year: String(date.getFullYear()),
    month: String(date.getMonth() + 1).padStart(2, "0"),
  };
}

export function previousMonthRemaining(records, year, month) {
  const previous = previousPeriod(year, month);
  if (!previous) return 0;
  return records.reduce((sum, record) => {
    if (budgetMonthKey(record.year, record.month) !== `${previous.year}-${previous.month}`) return sum;
    return sum + (Number(record.remaining) || 0);
  }, 0);
}
