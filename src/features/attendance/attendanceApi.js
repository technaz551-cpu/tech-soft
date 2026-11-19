import { api } from "@/lib/api";

const attendanceApi = api.injectEndpoints({
  endpoints: (build) => ({
    getAttendance: build.query({
      query: ({ date, employeeId, month } = {}) => {
        const params = new URLSearchParams();
        if (date) params.set("date", date);
        if (employeeId) params.set("employeeId", employeeId);
        if (month) params.set("month", month);
        return `attendance?${params.toString()}`;
      },
      providesTags: (_result, _error, arg) => [
        { type: "Attendance", id: arg?.date || arg?.month || arg?.employeeId || "LIST" },
      ],
    }),
    saveAttendance: build.mutation({
      query: (body) => ({
        url: "attendance",
        method: "PUT",
        body,
      }),
      invalidatesTags: ["Attendance"],
    }),
    deleteAttendance: build.mutation({
      query: (id) => ({
        url: `attendance/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Attendance"],
    }),
  }),
  overrideExisting: false,
});

export const { useGetAttendanceQuery, useSaveAttendanceMutation, useDeleteAttendanceMutation } =
  attendanceApi;
