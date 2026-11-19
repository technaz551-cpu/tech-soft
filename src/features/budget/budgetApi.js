import { api } from "@/lib/api";

const budgetApi = api.injectEndpoints({
  endpoints: (build) => ({
    getBudgetById: build.query({
      query: (id) => `budget/${id}`,
      providesTags: (_result, _error, id) => [{ type: "Budget", id }],
    }),
    getBudgets: build.query({
      query: () => "budget",
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: "Budget", id })),
              { type: "Budget", id: "LIST" },
            ]
          : [{ type: "Budget", id: "LIST" }],
    }),
    createBudget: build.mutation({
      query: (body) => ({
        url: "budget",
        method: "POST",
        body,
      }),
      invalidatesTags: [{ type: "Budget", id: "LIST" }],
    }),
    updateBudget: build.mutation({
      query: ({ id, ...body }) => ({
        url: `budget/${id}`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: "Budget", id },
        { type: "Budget", id: "LIST" },
      ],
    }),
    deleteBudget: build.mutation({
      query: (id) => ({
        url: `budget/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: (_result, _error, id) => [
        { type: "Budget", id },
        { type: "Budget", id: "LIST" },
      ],
    }),
  }),
  overrideExisting: false,
});

export const {
  useGetBudgetsQuery,
  useGetBudgetByIdQuery,
  useCreateBudgetMutation,
  useUpdateBudgetMutation,
  useDeleteBudgetMutation,
} = budgetApi;
