import { api } from "@/lib/api";

const incomeApi = api.injectEndpoints({
  endpoints: (build) => ({
    getIncomeById: build.query({
      query: (id) => `income/${id}`,
      providesTags: (_result, _error, id) => [{ type: "Income", id }],
    }),
    getIncome: build.query({
      query: (month) => (month ? `income?month=${encodeURIComponent(month)}` : "income"),
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: "Income", id })),
              { type: "Income", id: "LIST" },
            ]
          : [{ type: "Income", id: "LIST" }],
    }),
    createIncome: build.mutation({
      query: (body) => ({
        url: "income",
        method: "POST",
        body,
      }),
      invalidatesTags: [{ type: "Income", id: "LIST" }],
    }),
    updateIncome: build.mutation({
      query: ({ id, ...body }) => ({
        url: `income/${id}`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: "Income", id },
        { type: "Income", id: "LIST" },
      ],
    }),
    deleteIncome: build.mutation({
      query: (id) => ({
        url: `income/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: (_result, _error, id) => [
        { type: "Income", id },
        { type: "Income", id: "LIST" },
      ],
    }),
  }),
  overrideExisting: false,
});

export const {
  useGetIncomeQuery,
  useGetIncomeByIdQuery,
  useCreateIncomeMutation,
  useUpdateIncomeMutation,
  useDeleteIncomeMutation,
} = incomeApi;
