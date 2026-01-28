import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

export const paymentsApi = createApi({
  reducerPath: "paymentsApi",
  baseQuery: fetchBaseQuery({
    baseUrl: `${import.meta.env.VITE_API_URL}/`,
    credentials: "include",
    prepareHeaders: (headers) => {
      const token = localStorage.getItem("authToken");

      if (token) {
        headers.set("x-auth-token", token);
      }

      return headers;
    },
  }),
  tagTypes: ["Payment", "PaymentAdjustments"],
  endpoints: (builder) => ({
    getPayments: builder.query({
      query: () => "get-pay-summarY-IT",
      providesTags: ["Payment"],
    }),
    getVendors: builder.query({
      query: () => "vendor",
      providesTags: ["Payment"],
    }),
    
    addHoldPayments: builder.mutation({
      query: (newHoldPayment) => ({
        url: "/hold-PaymenT-IT",
        method: "POST",
        body: newHoldPayment,
      }),
      invalidatesTags: ["Payment"],
    }),
    addHoldToPayments: builder.mutation({
      query: (newHoldToPayment) => ({
        url: "/hold-payto-payrequest",
        method: "POST",
        body: newHoldToPayment,
      }),
      invalidatesTags: ["Payment"],
    }),
    getPayRequestByVendor: builder.query({
      query: ({ vendor, page = 1, limit = 10, search = "" }) => {
        const params = new URLSearchParams();
        if (vendor) params.set("vendor", vendor);
        if (page) params.set("page", page);
        if (limit) params.set("limit", limit);
        if (search) params.set("search", search);
        return `/payrequestvendor?${params.toString()}`;
      },
      providesTags: ["Payment"],
    }),
    exportPayRequest: builder.mutation({
      query: ({ vendor, type, ids }) => ({
        url: "export-payrequest",
        method: "POST",
        body: { vendor, type, ids },
        responseHandler: (res) => res.blob(),
      }),
    }),
    addAdjustments: builder.mutation({
      query: (newAdjustment) => ({
        url: "/adjustment/payment-adjustments",
        method: "POST",
        body: newAdjustment,
      }),
      invalidatesTags: ["PaymentAdjustments"],
    }),
    getPaymentAdjustments: builder.query({
      query: ({
        page = 1,
        limit = 10,
        search = "",
        status = "",
        from = "",
        to = "",
      }) => {
        const params = new URLSearchParams();
        params.set("page", String(page));
        params.set("limit", String(limit));
        if (search) params.set("search", search);
        if (status) params.set("status", status);
        if (from) params.set("from", from);
        if (to) params.set("to", to);

        return {
          url: `/adjustment/get-adjustments?${params.toString()}`,
          method: "GET",
        };
      },

      providesTags: (result) => {
        // ✅ supports both response shapes
        const items = Array.isArray(result?.data)
          ? result.data
          : Array.isArray(result?.data?.data)
          ? result.data.data
          : [];

        return items.length
          ? [
              ...items.map((x) => ({ type: "PaymentAdjustments", id: x._id })),
              { type: "PaymentAdjustments", id: "LIST" },
            ]
          : [{ type: "PaymentAdjustments", id: "LIST" }];
      },
    }),

    paymentAdjustmentAction: builder.mutation({
      query: ({
        id,
        action,
        remarks = "",
        to_project_id = "",
        to_project_ids = [],
      }) => {
        const body = {
          status: action,
          remarks,
        };

        if (to_project_id) body.to_project_id = to_project_id;

        if (Array.isArray(to_project_ids) && to_project_ids.length > 0) {
          body.to_project_ids = to_project_ids;
        }

        return {
          url: `/adjustment/update-adjustments/${id}/action`,
          method: "PATCH",
          body,
        };
      },

      invalidatesTags: (r, e, arg) => [
        { type: "PaymentAdjustments", id: arg?.id },
        { type: "PaymentAdjustments", id: "LIST" },
      ],
    }),
  }),
});

export const {
  useGetPaymentsQuery,
  useGetVendorsQuery,
  useAddHoldPaymentsMutation,
  useAddHoldToPaymentsMutation,
  useGetPayRequestByVendorQuery,
  useExportPayRequestMutation,
  useAddAdjustmentsMutation,
  useGetPaymentAdjustmentsQuery,
  usePaymentAdjustmentActionMutation,
} = paymentsApi;
