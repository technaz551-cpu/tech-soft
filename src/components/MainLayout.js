"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

const MENU = [
  {
    kind: "page",
    label: "Dashboard",
    href: "/dashboard",
    icon: "M3 10.5 12 3l9 7.5V21a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z",
  },
  {
    kind: "menu",
    id: "payroll",
    label: "Payroll",
    icon: "M16 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2M9.5 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M20 8v6M17 11h6",
    items: [
      { label: "Employees", href: "/employees" },
      { label: "Attendance", href: "/attendance" },
    ],
  },
  {
    kind: "menu",
    id: "account",
    label: "Account",
    icon: "M4 7h16v12H4zM4 11h16M8 15h4",
    items: [
      { label: "Income", href: "/income" },
      { label: "Expenses", href: "/expenses" },
      { label: "Budget", href: "/budget" },
      { label: "Out", href: "/out" },
    ],
  },
  {
    kind: "menu",
    id: "reports",
    label: "Reports",
    icon: "M4 19V5M4 19h16M8 15l3-3 2 2 5-6",
    items: [
      { label: "Employee Attendance", href: "/reports/employee-attendance" },
      { label: "Income Report", href: "/reports/income-report" },
    ],
  },
];

const PAGE_META = [
  {
    test: (path) => path === "/dashboard",
    title: "Dashboard",
    subtitle: "Today’s attendance and a snapshot of the team",
  },
  {
    test: (path) => path === "/employees",
    title: "Employees",
    subtitle: "Add, update, and remove staff records",
  },
  {
    test: (path) => path === "/employees/new",
    title: "Add employee",
    subtitle: "Create a staff record for payroll and attendance",
  },
  {
    test: (path) => /^\/employees\/[^/]+\/edit$/.test(path),
    title: "Edit employee",
    subtitle: "Update contact details, role, and employment status",
  },
  {
    test: (path) => path.startsWith("/employees/"),
    title: "Employee details",
    subtitle: "Profile, employment details, and recent attendance",
  },
  {
    test: (path) => path === "/attendance",
    title: "Attendance",
    subtitle: "Pick a date, mark people in bulk, then save or update a row",
  },
  {
    test: (path) => path === "/income",
    title: "Income",
    subtitle: "Money coming into the account",
  },
  {
    test: (path) => path === "/expenses",
    title: "Expenses",
    subtitle: "Money spent by the business",
  },
  {
    test: (path) => path === "/budget",
    title: "Budget",
    subtitle: "Planned spending and limits",
  },
  {
    test: (path) => path === "/out",
    title: "Out",
    subtitle: "Outgoing payments and transfers",
  },
  {
    test: (path) => path === "/reports/employee-attendance",
    title: "Employee attendance",
    subtitle: "Attendance history across the team",
  },
  {
    test: (path) => path === "/reports/income-report",
    title: "Income report",
    subtitle: "Income totals and breakdowns",
  },
];

function pathMatches(pathname, href) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function isChildActive(pathname, items) {
  return items.some((item) => pathMatches(pathname, item.href));
}

export default function MainLayout({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);
  const [openMenus, setOpenMenus] = useState(() => new Set());
  const page = PAGE_META.find((item) => item.test(pathname)) || {
    title: "Technaz",
    subtitle: "Admin workspace",
  };

  function toggleMenu(id) {
    setOpenMenus((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function isMenuOpen(id, items) {
    return isChildActive(pathname, items) || openMenus.has(id);
  }

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/login");
      router.refresh();
    } finally {
      setLoggingOut(false);
    }
  }

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="sticky top-0 flex h-screen w-64 shrink-0 flex-col border-r border-theme-border bg-sidebar">
        <div className="border-b border-theme-border px-5 py-5">
          <p className="text-xs font-semibold tracking-[0.18em] text-muted uppercase">
            Technaz
          </p>
          <p className="mt-1 text-lg font-semibold text-foreground">Admin</p>
        </div>
        <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-3 py-4">
          {MENU.map((entry) => {
            if (entry.kind === "page") {
              const isActive = pathname === entry.href;
              return (
                <Link
                  key={entry.href}
                  href={entry.href}
                  className={
                    isActive
                      ? "flex w-full items-center gap-2 rounded-lg bg-primary px-3 py-2.5 text-sm font-medium text-white"
                      : "flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium text-foreground transition hover:bg-primary/10"
                  }
                >
                  <NavIcon path={entry.icon} />
                  {entry.label}
                </Link>
              );
            }

            const childActive = isChildActive(pathname, entry.items);
            const open = isMenuOpen(entry.id, entry.items);

            return (
              <div key={entry.id} className="flex flex-col gap-1">
                <button
                  type="button"
                  onClick={() => toggleMenu(entry.id)}
                  aria-expanded={open}
                  className={navButtonClass(false, childActive)}
                >
                  <span className="flex items-center gap-2">
                    <NavIcon path={entry.icon} />
                    {entry.label}
                  </span>
                  <Chevron open={open} />
                </button>
                {open ? (
                  <div className="ml-4 flex flex-col gap-1 border-l border-theme-border py-1 pl-2">
                    {entry.items.map((item) => {
                      const isActive = pathMatches(pathname, item.href);
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          className={
                            isActive
                              ? "rounded-lg bg-primary px-3 py-2 text-sm font-medium text-white"
                              : "rounded-lg px-3 py-2 text-sm font-medium text-muted transition hover:bg-primary/10 hover:text-foreground"
                          }
                        >
                          {item.label}
                        </Link>
                      );
                    })}
                  </div>
                ) : null}
              </div>
            );
          })}
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-10 flex items-center justify-end gap-4 border-b border-theme-border bg-card px-6 py-3">
          {pathname === "/employees" ? null : (
            <div className="mr-auto min-w-0">
              <h1 className="truncate text-xl font-semibold text-foreground">
                {page.title}
              </h1>
              <p className="truncate text-sm text-muted">{page.subtitle}</p>
            </div>
          )}
          <button
            type="button"
            onClick={handleLogout}
            disabled={loggingOut}
            className="shrink-0 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition hover:bg-primary-hover disabled:opacity-60"
          >
            {loggingOut ? "Signing out…" : "Log out"}
          </button>
        </header>
        <div className={pathname === "/employees" ? "flex-1 px-6 py-5" : "flex-1 p-6"}>
          {children}
        </div>
      </div>
    </div>
  );
}

function navButtonClass(isActive, parentActive = false) {
  if (isActive) {
    return "flex items-center gap-2 rounded-lg bg-primary px-3 py-2.5 text-sm font-medium text-white";
  }
  if (parentActive) {
    return "flex w-full items-center justify-between rounded-lg bg-primary/15 px-3 py-2.5 text-sm font-semibold text-foreground";
  }
  return "flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2.5 text-sm font-medium text-foreground transition hover:bg-primary/10";
}

function NavIcon({ path }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4 shrink-0"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      aria-hidden="true"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d={path} />
    </svg>
  );
}

function Chevron({ open }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={`h-4 w-4 shrink-0 transition ${open ? "rotate-180" : ""}`}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      aria-hidden="true"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="m6 9 6 6 6-6" />
    </svg>
  );
}
