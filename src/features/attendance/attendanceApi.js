import { api } from "@/lib/api";

const attendanceApi = api.injectEndpoints({
  endpoints: (build) => ({
    getAttendance: build.query({
      query: ({ date, employeeId } = {}) => {
        const params = new URLSearchParams();
        if (date) params.set("date", date);
        if (employeeId) params.set("employeeId", employeeId);
        return `attendance?${params.toString()}`;
      },
      providesTags: (_result, _error, arg) => [
        { type: "Attendance", id: arg?.date || arg?.employeeId || "LIST" },
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
  }),
  overrideExisting: false,
});

export const { useGetAttendanceQuery, useSaveAttendanceMutation } =
  attendanceApi;
