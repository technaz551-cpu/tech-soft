import { api } from "@/lib/api";

const expensesApi = api.injectEndpoints({
  endpoints: (build) => ({
    getExpenseById: build.query({
      query: (id) => `expenses/${id}`,
      providesTags: (_result, _error, id) => [{ type: "Expense", id }],
    }),
    getExpenses: build.query({
      query: () => "expenses",
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: "Expense", id })),
              { type: "Expense", id: "LIST" },
            ]
          : [{ type: "Expense", id: "LIST" }],
    }),
    createExpense: build.mutation({
      query: (body) => ({
        url: "expenses",
        method: "POST",
        body,
      }),
      invalidatesTags: [
        { type: "Expense", id: "LIST" },
        { type: "Budget", id: "LIST" },
      ],
    }),
    updateExpense: build.mutation({
      query: ({ id, ...body }) => ({
        url: `expenses/${id}`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: "Expense", id },
        { type: "Expense", id: "LIST" },
        { type: "Budget", id: "LIST" },
      ],
    }),
    deleteExpense: build.mutation({
      query: (id) => ({
        url: `expenses/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: (_result, _error, id) => [
        { type: "Expense", id },
        { type: "Expense", id: "LIST" },
        { type: "Budget", id: "LIST" },
      ],
    }),
  }),
  overrideExisting: false,
});

export const {
  useGetExpensesQuery,
  useGetExpenseByIdQuery,
  useCreateExpenseMutation,
  useUpdateExpenseMutation,
  useDeleteExpenseMutation,
} = expensesApi;
