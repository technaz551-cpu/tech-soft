"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useGetAttendanceQuery } from "@/features/attendance/attendanceApi";
import { previousMonthRemaining } from "@/features/budget/carry";
import { useGetBudgetsQuery } from "@/features/budget/budgetApi";
import { useGetEmployeesQuery } from "@/features/employees/employeesApi";
import { useGetExpensesQuery } from "@/features/expenses/expensesApi";
import { useGetIncomeQuery } from "@/features/income/incomeApi";
import { apiErrorMessage, formatDisplayDate, localDateKey } from "@/lib/format";

const EMPTY_LIST = [];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MONTH_OPTIONS = [
  { value: "01", label: "January" },
  { value: "02", label: "February" },
  { value: "03", label: "March" },
  { value: "04", label: "April" },
  { value: "05", label: "May" },
  { value: "06", label: "June" },
  { value: "07", label: "July" },
  { value: "08", label: "August" },
  { value: "09", label: "September" },
  { value: "10", label: "October" },
  { value: "11", label: "November" },
  { value: "12", label: "December" },
];

const controlClassName =
  "h-8 rounded-lg border border-theme-border bg-card px-2.5 text-xs font-medium text-foreground outline-none focus:ring-2 focus:ring-primary";

export default function DashboardPage() {
  const today = localDateKey();
  const currentYear = today.slice(0, 4);
  const currentMonth = today.slice(5, 7);
  const [chartYear, setChartYear] = useState(currentYear);
  const [attendanceMonth, setAttendanceMonth] = useState(currentMonth);

  const employeesQuery = useGetEmployeesQuery();
  const incomeQuery = useGetIncomeQuery();
  const expensesQuery = useGetExpensesQuery();
  const budgetsQuery = useGetBudgetsQuery();
  const todayAttendance = useGetAttendanceQuery({ date: today });
  const monthAttendance = useGetAttendanceQuery({ month: `${currentYear}-${attendanceMonth}` });

  const employees = employeesQuery.data ?? EMPTY_LIST;
  const income = incomeQuery.data ?? EMPTY_LIST;
  const expenses = expensesQuery.data ?? EMPTY_LIST;
  const budgets = budgetsQuery.data ?? EMPTY_LIST;
  const todayRecords = todayAttendance.data?.records ?? EMPTY_LIST;
  const monthRecords = monthAttendance.data?.records ?? EMPTY_LIST;

  const previousMonth = useMemo(() => shiftMonth(currentYear, currentMonth, -1), [currentYear, currentMonth]);
  const stats = useMemo(() => {
    const received = sumIncome(income, `${currentYear}-${currentMonth}`, "received");
    const previousReceived = sumIncome(income, previousMonth.key, "received");
    const pending = sumIncome(income, `${currentYear}-${currentMonth}`, "pending");
    const spent = sumExpenses(expenses, `${currentYear}-${currentMonth}`);
    const previousSpent = sumExpenses(expenses, previousMonth.key);
    const present = todayRecords.filter((record) => record.status === "present").length;
    const joined = employees.filter((employee) => String(employee.joiningDate || "").startsWith(`${currentYear}-${currentMonth}`)).length;
    const remaining = remainingBudget(budgets, currentYear, currentMonth);
    const previousRemaining = remainingBudget(budgets, previousMonth.year, previousMonth.month);
    return {
      employees: employees.length,
      joined,
      present,
      presentRate: employees.length ? Math.round((present / employees.length) * 100) : null,
      received,
      receivedChange: percentChange(received, previousReceived),
      pending,
      spent,
      spentChange: percentChange(spent, previousSpent),
      remaining,
      remainingChange: percentChange(remaining, previousRemaining),
    };
  }, [employees, income, expenses, budgets, todayRecords, currentYear, currentMonth, previousMonth]);

  const chartYears = useMemo(() => {
    const years = new Set([Number(currentYear), Number(chartYear)]);
    [...income, ...expenses].forEach((record) => {
      const year = Number(String(record.date || "").slice(0, 4));
      if (year >= 1000 && year <= 9999) years.add(year);
    });
    return [...years].sort((left, right) => left - right);
  }, [income, expenses, currentYear, chartYear]);

  const incomeSeries = useMemo(() => monthlyIncome(income, chartYear), [income, chartYear]);
  const expenseSeries = useMemo(() => monthlyExpenses(expenses, chartYear), [expenses, chartYear]);
  const attendanceCounts = useMemo(() => countAttendance(monthRecords), [monthRecords]);

  const recentEmployees = useMemo(
    () => [...employees].sort((left, right) => String(right.createdAt).localeCompare(String(left.createdAt))).slice(0, 5),
    [employees],
  );
  const transactions = useMemo(() => recentTransactions(income, expenses, today), [income, expenses, today]);

  const failed = [employeesQuery, incomeQuery, expensesQuery, budgetsQuery, todayAttendance, monthAttendance].find(
    (query) => query.isError,
  );

  return (
    <div className="flex flex-col gap-5">
      {failed ? (
        <p className="text-sm text-absent" role="alert">
          {apiErrorMessage(failed.error, "Could not load the dashboard")}
        </p>
      ) : null}

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        <SummaryCard
          label="Employees"
          value={employeesQuery.isLoading ? "—" : stats.employees}
          hint={employeesQuery.isLoading ? "Loading" : `+ ${stats.joined} new`}
          hintTone="text-success"
          icon={<UsersIcon />}
        />
        <SummaryCard
          label="Present today"
          value={todayAttendance.isLoading ? "—" : stats.present}
          hint={stats.presentRate === null ? "No employees" : `${stats.presentRate}%`}
          hintTone="text-success"
          icon={<CheckIcon />}
        />
        <SummaryCard
          label="Total income"
          value={incomeQuery.isLoading ? "—" : money(stats.received)}
          hint={changeText(stats.receivedChange, "Received this month")}
          hintTone={changeTone(stats.receivedChange)}
          icon={<WalletIcon />}
        />
        <SummaryCard
          label="Total expenses"
          value={expensesQuery.isLoading ? "—" : money(stats.spent)}
          hint={changeText(stats.spentChange, "Spent this month")}
          hintTone={changeTone(stats.spentChange)}
          icon={<ReceiptIcon />}
        />
        <SummaryCard
          label="Pending income"
          value={incomeQuery.isLoading ? "—" : money(stats.pending)}
          hint="View"
          href="/income"
          icon={<ClockIcon />}
        />
        <SummaryCard
          label="Remaining budget"
          value={budgetsQuery.isLoading ? "—" : money(stats.remaining)}
          hint={changeText(stats.remainingChange, "This month")}
          hintTone={changeTone(stats.remainingChange)}
          icon={<BudgetIcon />}
        />
      </section>

      <section className="grid gap-4 xl:grid-cols-5">
        <article className="rounded-xl border border-theme-border bg-card p-5 shadow-sm xl:col-span-3">
          <div className="flex items-center justify-between gap-3">
            <h2 className="flex items-center gap-2 text-base font-semibold text-foreground">
              <ChartIcon />
              Income vs expenses
            </h2>
            <select
              value={chartYear}
              onChange={(event) => setChartYear(event.target.value)}
              aria-label="Chart year"
              className={controlClassName}
            >
              {chartYears.map((year) => (
                <option key={year} value={year}>
                  {year === Number(currentYear) ? "This year" : year}
                </option>
              ))}
            </select>
          </div>
          <div className="mt-3 flex items-center gap-4 text-xs text-muted">
            <LegendDot className="bg-primary" label="Income" />
            <LegendDot className="bg-amber-500" label="Expenses" />
          </div>
          {incomeQuery.isLoading || expensesQuery.isLoading ? (
            <p className="py-16 text-sm text-muted">Loading chart…</p>
          ) : (
            <TrendChart income={incomeSeries} expenses={expenseSeries} />
          )}
        </article>

        <article className="rounded-xl border border-theme-border bg-card p-5 shadow-sm xl:col-span-2">
          <div className="flex items-center justify-between gap-3">
            <h2 className="flex items-center gap-2 text-base font-semibold text-foreground">
              <ClockIcon />
              Attendance overview
            </h2>
            <select
              value={attendanceMonth}
              onChange={(event) => setAttendanceMonth(event.target.value)}
              aria-label="Attendance month"
              className={controlClassName}
            >
              {MONTH_OPTIONS.map((month) => (
                <option key={month.value} value={month.value}>
                  {month.value === currentMonth ? "This month" : month.label}
                </option>
              ))}
            </select>
          </div>
          {monthAttendance.isLoading ? (
            <p className="py-16 text-sm text-muted">Loading attendance…</p>
          ) : (
            <AttendanceChart counts={attendanceCounts} />
          )}
        </article>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <article className="overflow-hidden rounded-xl border border-theme-border bg-card shadow-sm">
          <div className="flex items-center justify-between gap-3 px-5 py-4">
            <h2 className="flex items-center gap-2 text-base font-semibold text-foreground">
              <UsersIcon />
              Recent employees
            </h2>
            <Link href="/employees" className="text-sm font-medium text-primary hover:text-primary-hover">
              View all
            </Link>
          </div>
          {employeesQuery.isLoading ? <p className="px-5 pb-5 text-sm text-muted">Loading employees…</p> : null}
          {!employeesQuery.isLoading && recentEmployees.length === 0 ? (
            <p className="px-5 pb-5 text-sm text-muted">No employees added yet.</p>
          ) : null}
          {recentEmployees.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-left text-sm">
                <thead className="text-xs tracking-wide text-muted uppercase">
                  <tr className="border-t border-theme-border">
                    <th className="px-5 py-3 font-semibold">#</th>
                    <th className="px-4 py-3 font-semibold">Name</th>
                    <th className="px-4 py-3 font-semibold">Email</th>
                    <th className="px-4 py-3 font-semibold">Department</th>
                    <th className="px-5 py-3 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {recentEmployees.map((employee, index) => (
                    <tr key={employee.id} className="border-t border-theme-border">
                      <td className="px-5 py-3 text-muted">{index + 1}</td>
                      <td className="px-4 py-3">
                        <Link href={`/employees/${employee.id}`} className="flex items-center gap-2 font-medium text-foreground">
                          <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-sidebar text-xs font-semibold text-primary">
                            {initials(employee.fullName)}
                          </span>
                          {employee.fullName}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-muted">{employee.email}</td>
                      <td className="px-4 py-3 text-foreground">{employee.department || "—"}</td>
                      <td className="px-5 py-3">
                        <StatusPill tone={employee.status === "active" ? "success" : "muted"} label={employee.status === "active" ? "Active" : "Inactive"} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </article>

        <article className="overflow-hidden rounded-xl border border-theme-border bg-card shadow-sm">
          <div className="flex items-center justify-between gap-3 px-5 py-4">
            <h2 className="flex items-center gap-2 text-base font-semibold text-foreground">
              <ReceiptIcon />
              Recent transactions
            </h2>
            <Link href="/income" className="text-sm font-medium text-primary hover:text-primary-hover">
              View all
            </Link>
          </div>
          {incomeQuery.isLoading || expensesQuery.isLoading ? (
            <p className="px-5 pb-5 text-sm text-muted">Loading transactions…</p>
          ) : null}
          {!incomeQuery.isLoading && !expensesQuery.isLoading && transactions.length === 0 ? (
            <p className="px-5 pb-5 text-sm text-muted">No income or expenses recorded yet.</p>
          ) : null}
          {transactions.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px] text-left text-sm">
                <thead className="text-xs tracking-wide text-muted uppercase">
                  <tr className="border-t border-theme-border">
                    <th className="px-5 py-3 font-semibold">#</th>
                    <th className="px-4 py-3 font-semibold">Type</th>
                    <th className="px-4 py-3 font-semibold">Title</th>
                    <th className="px-4 py-3 font-semibold">Amount</th>
                    <th className="px-5 py-3 font-semibold">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((item, index) => (
                    <tr key={`${item.type}-${item.id}`} className="border-t border-theme-border">
                      <td className="px-5 py-3 text-muted">{index + 1}</td>
                      <td className="px-4 py-3">
                        <StatusPill tone={item.type === "Income" ? "success" : "expense"} label={item.type} />
                      </td>
                      <td className="px-4 py-3 font-medium text-foreground">{item.title}</td>
                      <td className="px-4 py-3 text-foreground">{money(item.amount)}</td>
                      <td className="px-5 py-3 text-muted">{formatDisplayDate(item.date)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </article>
      </section>

      <section className="flex flex-col gap-3 rounded-xl border border-theme-border bg-sidebar/70 px-5 py-4 shadow-sm lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-3">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-primary text-white">
            <BoltIcon />
          </span>
          <div>
            <h2 className="text-base font-semibold text-foreground">Quick actions</h2>
            <p className="text-sm text-muted">Manage your data quickly</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <ActionLink href="/employees/new" icon={<UsersIcon />} primary>
            Add employee
          </ActionLink>
          <ActionLink href="/attendance" icon={<CalendarIcon />}>
            Mark attendance
          </ActionLink>
          <ActionLink href="/income" icon={<WalletIcon />}>
            Add income
          </ActionLink>
          <ActionLink href="/expenses" icon={<ReceiptIcon />}>
            Add expense
          </ActionLink>
        </div>
      </section>
    </div>
  );
}

function SummaryCard({ label, value, hint, hintTone = "text-primary", href, icon }) {
  const note = href ? (
    <Link href={href} className="font-medium text-primary hover:text-primary-hover">
      {hint}
    </Link>
  ) : (
    <span className={hintTone}>{hint}</span>
  );
  return (
    <article className="rounded-xl border border-theme-border bg-card px-4 py-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm text-muted">{label}</p>
        <span className="text-primary">{icon}</span>
      </div>
      <p className="mt-2 text-2xl font-semibold text-foreground">{value}</p>
      <p className="mt-1 text-xs">{note}</p>
    </article>
  );
}

function TrendChart({ income, expenses }) {
  const width = 640;
  const height = 230;
  const pad = { left: 36, right: 8, top: 16, bottom: 28 };
  const max = Math.max(1, ...income, ...expenses);
  const innerWidth = width - pad.left - pad.right;
  const innerHeight = height - pad.top - pad.bottom;
  const x = (index) => pad.left + (index * innerWidth) / 11;
  const y = (value) => pad.top + (1 - value / max) * innerHeight;
  const path = (values) => values.map((value, index) => `${index === 0 ? "M" : "L"}${x(index).toFixed(1)},${y(value).toFixed(1)}`).join(" ");

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="mt-2 h-56 w-full" role="img" aria-label="Income and expenses by month">
      {[0, 0.5, 1].map((step) => {
        const value = max * (1 - step);
        const yPos = y(value);
        return (
          <g key={step}>
            <line x1={pad.left} x2={width - pad.right} y1={yPos} y2={yPos} stroke="#DDD6FE" strokeWidth="1" />
            <text x={0} y={yPos + 4} className="fill-muted" fontSize="11">
              {compactNumber(value)}
            </text>
          </g>
        );
      })}
      <path d={`${path(income)} L${x(11)},${y(0)} L${x(0)},${y(0)} Z`} fill="#8B5CF6" opacity="0.12" />
      <path d={path(income)} fill="none" stroke="#8B5CF6" strokeWidth="2.5" strokeLinejoin="round" />
      <path d={path(expenses)} fill="none" stroke="#F59E0B" strokeWidth="2.5" strokeLinejoin="round" />
      {income.map((value, index) => (
        <circle key={`income-${MONTHS[index]}`} cx={x(index)} cy={y(value)} r="3" fill="#8B5CF6" />
      ))}
      {expenses.map((value, index) => (
        <circle key={`expense-${MONTHS[index]}`} cx={x(index)} cy={y(value)} r="3" fill="#F59E0B" />
      ))}
      {MONTHS.map((month, index) => (
        <text key={month} x={x(index)} y={height - 6} textAnchor="middle" className="fill-muted" fontSize="11">
          {month}
        </text>
      ))}
    </svg>
  );
}

function AttendanceChart({ counts }) {
  const segments = [
    { key: "present", label: "Present", value: counts.present, color: "#8B5CF6" },
    { key: "absent", label: "Absent", value: counts.absent, color: "#F59E0B" },
    { key: "leave", label: "Leave", value: counts.leave, color: "#38BDF8" },
    { key: "half-day", label: "Half day", value: counts["half-day"], color: "#22C55E" },
  ];
  const total = segments.reduce((sum, segment) => sum + segment.value, 0);
  const rate = total ? Math.round((counts.present / total) * 100) : 0;
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <div className="mt-6 flex flex-col items-center gap-6 sm:flex-row sm:justify-center">
      <svg viewBox="0 0 120 120" className="h-40 w-40" role="img" aria-label={`${rate} percent present`}>
        <circle cx="60" cy="60" r={radius} fill="none" stroke="#EDE9FE" strokeWidth="14" />
        {total
          ? segments.map((segment) => {
              const length = (segment.value / total) * circumference;
              const dash = `${length} ${circumference - length}`;
              const element = (
                <circle
                  key={segment.key}
                  cx="60"
                  cy="60"
                  r={radius}
                  fill="none"
                  stroke={segment.color}
                  strokeWidth="14"
                  strokeDasharray={dash}
                  strokeDashoffset={-offset}
                  transform="rotate(-90 60 60)"
                />
              );
              offset += length;
              return element;
            })
          : null}
        <text x="60" y="56" textAnchor="middle" className="fill-foreground" fontSize="18" fontWeight="700">
          {rate}%
        </text>
        <text x="60" y="74" textAnchor="middle" className="fill-muted" fontSize="11">
          Present
        </text>
      </svg>
      <ul className="space-y-2 text-sm">
        {segments.map((segment) => (
          <li key={segment.key} className="flex items-center justify-between gap-8">
            <span className="flex items-center gap-2 text-muted">
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: segment.color }} />
              {segment.label}
            </span>
            <span className="font-medium text-foreground">{segment.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ActionLink({ href, children, icon, primary = false }) {
  return (
    <Link
      href={href}
      className={
        primary
          ? "inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover"
          : "inline-flex items-center gap-2 rounded-full border border-theme-border bg-card px-4 py-2 text-sm font-medium text-foreground hover:bg-sidebar"
      }
    >
      {icon}
      {children}
    </Link>
  );
}

function StatusPill({ label, tone = "success" }) {
  const tones = {
    success: "bg-success/10 text-success",
    expense: "bg-amber-500/10 text-amber-700",
    muted: "bg-muted/10 text-muted",
  };
  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${tones[tone] || tones.success}`}>
      {label}
    </span>
  );
}

function LegendDot({ className, label }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`h-2.5 w-2.5 rounded-full ${className}`} />
      {label}
    </span>
  );
}

function sumIncome(records, monthKey, kind) {
  return records.reduce((sum, record) => {
    if (!String(record.date || "").startsWith(monthKey)) return sum;
    const pending = record.status === "pending";
    if (kind === "pending" && !pending) return sum;
    if (kind === "received" && pending) return sum;
    return sum + (Number(record.amount) || 0);
  }, 0);
}

function sumExpenses(records, monthKey) {
  return records.reduce((sum, record) => {
    if (!String(record.date || "").startsWith(monthKey)) return sum;
    return sum + (Number(record.amount) || 0);
  }, 0);
}

function monthlyIncome(records, year) {
  const series = Array(12).fill(0);
  records.forEach((record) => {
    if (!String(record.date || "").startsWith(`${year}-`) || record.status === "pending") return;
    const index = Number(String(record.date).slice(5, 7)) - 1;
    if (index >= 0 && index < 12) series[index] += Number(record.amount) || 0;
  });
  return series;
}

function monthlyExpenses(records, year) {
  const series = Array(12).fill(0);
  records.forEach((record) => {
    if (!String(record.date || "").startsWith(`${year}-`)) return;
    const index = Number(String(record.date).slice(5, 7)) - 1;
    if (index >= 0 && index < 12) series[index] += Number(record.amount) || 0;
  });
  return series;
}

function remainingBudget(records, year, month) {
  const monthBudget = records.reduce((sum, record) => {
    if (record.year !== String(year) || record.month !== month) return sum;
    return sum + (Number(record.amount) || 0);
  }, 0);
  const carry = previousMonthRemaining(records, year, month);
  const spent = records.reduce((sum, record) => {
    if (record.year !== String(year) || record.month !== month) return sum;
    return sum + (Number(record.spent) || 0);
  }, 0);
  return monthBudget + carry - spent;
}

function countAttendance(records) {
  return records.reduce(
    (counts, record) => {
      if (counts[record.status] !== undefined) counts[record.status] += 1;
      return counts;
    },
    { present: 0, absent: 0, leave: 0, "half-day": 0 },
  );
}

function recentTransactions(income, expenses, today) {
  return [
    ...income.map((record) => ({
      id: record.id,
      type: "Income",
      title: record.title,
      amount: record.amount,
      date: record.date,
    })),
    ...expenses.map((record) => ({
      id: record.id,
      type: "Expense",
      title: record.title,
      amount: record.amount,
      date: record.date,
    })),
  ]
    .filter((item) => item.date && item.date <= today)
    .sort((left, right) => String(right.date).localeCompare(String(left.date)))
    .slice(0, 5);
}

function shiftMonth(year, month, delta) {
  const date = new Date(Number(year), Number(month) - 1 + delta, 1);
  return {
    year: String(date.getFullYear()),
    month: String(date.getMonth() + 1).padStart(2, "0"),
    key: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`,
  };
}

function percentChange(current, previous) {
  if (!previous) return null;
  return Math.round(((current - previous) / Math.abs(previous)) * 100);
}

function changeText(change, fallback) {
  if (change === null) return fallback;
  const arrow = change >= 0 ? "↑" : "↓";
  return `${arrow} ${Math.abs(change)}%`;
}

function changeTone(change) {
  if (change === null || change >= 0) return "text-success";
  return "text-absent";
}

function money(amount) {
  const value = Number(amount) || 0;
  const whole = Number.isInteger(value);
  return new Intl.NumberFormat("en-PK", {
    style: "currency",
    currency: "PKR",
    minimumFractionDigits: whole ? 0 : 2,
    maximumFractionDigits: whole ? 0 : 2,
  }).format(value);
}

function compactNumber(value) {
  if (value >= 1000) return `${Math.round(value / 100) / 10}k`;
  return String(Math.round(value));
}

function initials(name) {
  return String(name || "")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function UsersIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path strokeLinecap="round" d="M16 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2" />
      <circle cx="9.5" cy="7" r="3" />
      <path strokeLinecap="round" d="M20 8v6M17 11h6" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path strokeLinecap="round" strokeLinejoin="round" d="m8 12 2.5 2.5L16 9" />
    </svg>
  );
}

function WalletIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path strokeLinecap="round" d="M3 8h16a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <path strokeLinecap="round" d="M3 8V7a2 2 0 0 1 2-2h12" />
      <circle cx="16" cy="13" r="1" />
    </svg>
  );
}

function ReceiptIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M7 3h10v18l-2-1.5L13 21l-2-1.5L9 21l-2-1.5L5 21V3z" />
      <path strokeLinecap="round" d="M9 8h6M9 12h6" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path strokeLinecap="round" d="M12 7v6l4 2" />
    </svg>
  );
}

function BudgetIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path strokeLinecap="round" d="M12 7v10M9 10c0-1 1.3-2 3-2s3 1 3 2-1.3 2-3 2-3 1-3 2 1.3 2 3 2 3-1 3-2" />
    </svg>
  );
}

function ChartIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 19V5M4 19h16M8 15l3-4 3 2 5-6" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <rect x="4" y="5" width="16" height="15" rx="2" />
      <path strokeLinecap="round" d="M8 3v4M16 3v4M4 10h16" />
    </svg>
  );
}

function BoltIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="m13 2-8 12h7l-1 8 8-12h-7z" />
    </svg>
  );
}
