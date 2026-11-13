import { configureStore } from "@reduxjs/toolkit";
import { api } from "@/lib/api";
import "@/features/employees/employeesApi";
import "@/features/attendance/attendanceApi";

export function makeStore() {
  return configureStore({
    reducer: {
      [api.reducerPath]: api.reducer,
    },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware().concat(api.middleware),
  });
}
