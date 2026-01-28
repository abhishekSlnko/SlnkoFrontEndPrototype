import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

const baseQuery = fetchBaseQuery({
  baseUrl: `${import.meta.env.VITE_API_URL
}`,
  credentials: "include",
  prepareHeaders: (headers) => {
    const token = localStorage.getItem("authToken");
    if (token) {
      headers.set("x-auth-token", token);
    }
    return headers;
  },
});

export const AccountsApi = createApi({
  reducerPath: "AccountsApi",
  baseQuery,
  tagTypes: ["Accounts"],
  endpoints: (builder) => ({
    getProjectBalance: builder.query({
      query: ({
        page = 1,
        search = "",
        group = "",
        pageSize = 10,
        status = "",
      }) =>
        `accounting/project-balance?page=${page}&search=${search}&group=${group}&pageSize=${pageSize}&status=${status}`,
      transformResponse: (response) => ({
        data: response.data || [],
        total: response.meta?.total || 0,
        count: response.meta?.count || (response.data?.length ?? 0),
        totals: response.totals || {},
      }),
      providesTags: () => [{ type: "Accounts", id: "ProjectBalance" }],
      keepUnusedDataFor: 5,
    }),
    getPaymentRecord: builder.query({
      query: ({
        page = 1,
        search = "",
        status = "",
        pageSize = 10,
        tab = "",
      }) =>
        `get-pay-sumrY-IT?page=${page}&search=${search}&status=${status}&pageSize=${pageSize}&tab=${tab}`,

      transformResponse: (response, meta, arg) => {
        return {
          data: Array.isArray(response.data) ? response.data : [],
          total: response.meta?.total ?? 0,
          count: response.meta?.count ?? 0,
          page: response.meta?.page ?? 1,
          instantTotal: response.meta?.instantTotal ?? 0,
          creditTotal: response.meta?.creditTotal ?? 0,
        };
      },
      providesTags: ["Accounts"],
    }),

    getTrashRecord: builder.query({
      query: ({
        page = 1,
        search = "",
        status = "",
        pageSize = 10,
        tab = "",
      }) => ({
        url: "hold-pay-summary-IT",
        params: { page, search, status, pageSize, tab },
      }),
      transformResponse: (res) => ({
        data: Array.isArray(res.data) ? res.data : [],
        total: res.meta?.total ?? 0,
        count: res.meta?.count ?? 0,
        page: res.meta?.page ?? 1,
        instantTotal: res.meta?.instantTotal ?? 0,
        creditTotal: res.meta?.creditTotal ?? 0,
      }),
      providesTags: [{ type: "Accounts", id: "TRASH" }],
      keepUnusedDataFor: 10,
    }),

    getPaymentApproval: builder.query({
      query: ({ page = 1, search = "", pageSize = 10, tab = "", delaydays }) =>
        `accounting/payment-approval?page=${page}&search=${search}&pageSize=${pageSize}&tab=${tab}&delaydays=${
          delaydays ?? ""
        }`,

      transformResponse: (response) => {
        return {
          data: response?.data || [],
          total: response.meta?.total || 0,
          count: response.meta?.count || 0,
          page: response.meta?.page || 1,
          pageSize: response.meta?.pageSize || 10,
          delaydays: response.meta?.delaydays || undefined,
          finalApprovalPaymentsCount:
            response.meta?.finalApprovalPaymentsCount || 0,
          paymentsCount: response.meta?.paymentsCount || 0,
          tab: response.meta?.tab || "",
        };
      },

      providesTags: ["Accounts"],
    }),

    getPaymentHistory: builder.query({
      query: ({ po_number }) =>
        `accounting/payment-history?po_number=${po_number}`,
      transformResponse: (response) => ({
        history: response.history || [],
        total_debited: response.total_debited || 0,
        po_value: response.po_value || 0,
      }),
      providesTags: ["Accounts"],
    }),

    getCustomerSummary: builder.query({
      query: ({
        p_id,
        _id,
        start,
        end,
        searchClient,
        searchDebit,
        searchAdjustment,
        tab,
        page = 1,
        pageSize = 20,
      }) => {
        const params = new URLSearchParams();

        if (_id) params.append("_id", _id);
        else if (p_id) params.append("p_id", p_id);

        if (start) params.append("start", start);
        if (end) params.append("end", end);
        if (searchClient) params.append("searchClient", searchClient);
        if (searchDebit) params.append("searchDebit", searchDebit);
        if (searchAdjustment)
          params.append("searchAdjustment", searchAdjustment);
        if (tab) params.append("tab", tab.toLowerCase());
        params.append("page", page);
        params.append("pageSize", pageSize);

        return `accounting/customer-payment-summary?${params}`;
      },
      transformResponse: (res) => ({
        adjustment: {
          history: [],
          totalCredit: 0,
          totalDebit: 0,
          ...(res?.adjustment || {}),
        },
        ...res,
      }),
      providesTags: ["Accounts"],
    }),

    updateSalesPO: builder.mutation({
      query: ({
        id,
        po_number,
        remarks,
        basic_sales,
        gst_on_sales,
        sales_invoice,
        isSales,
        files,
        type,
        credit_info,
      }) => {
        const form = new FormData();

        if (remarks) form.append("remarks", remarks);
        if (basic_sales !== undefined)
          form.append("basic_sales", String(basic_sales));
        if (gst_on_sales !== undefined)
          form.append("gst_on_sales", String(gst_on_sales));
        if (sales_invoice !== undefined)
          form.append("sales_invoice", String(sales_invoice));
        if (po_number) form.append("po_number", po_number);
        if (isSales) form.append("isSales", isSales);
        if (type) form.append("type", String(type));
        if (credit_info) {
          form.append(
            "credit_info",
            typeof credit_info === "string"
              ? credit_info
              : JSON.stringify(credit_info),
          );
        }

        if (Array.isArray(files)) {
          files.forEach((f) => {
            if (f?.file) {
              form.append("file", f.file);
              form.append("attachment_name", f.attachment_name ?? f.file.name);
            } else if (f instanceof File) {
              form.append("file", f);
              form.append("attachment_name", f.name);
            }
          });
        }

        const url = id ? `sales-update/${id}` : `sales-update/by-number`;

        return {
          url,
          method: "PUT",
          body: form,
        };
      },
      invalidatesTags: ["Accounts"],
    }),

    getExportPaymentHistory: builder.query({
      async queryFn({ po_number }, _queryApi, _extraOptions, fetchWithBQ) {
        const result = await fetchWithBQ({
          url: `accounting/debithistorycsv?po_number=${po_number}`,
          method: "GET",
          responseHandler: (response) => response.blob(),
        });

        if (result.error) return { error: result.error };

        const blob = result.data;
        const filename =
          result.meta?.response?.headers
            ?.get("Content-Disposition")
            ?.split("filename=")[1] || "payment-history.csv";

        return { data: { blob, filename } };
      },
    }),

    getPaymentApproved: builder.query({
      query: ({ page = 1, search = "", pageSize = 10 }) =>
        `accounting/approved-payment?page=${page}&search=${search}&pageSize=${pageSize}`,
      transformResponse: (response) => ({
        data: response.data || [],
        total: response.meta?.total || 0,
        count: response.meta?.count || 0,
      }),
      providesTags: ["Accounts"],
    }),
    getUtrSubmission: builder.query({
      query: ({ page = 1, search = "", pageSize = 10 }) =>
        `accounting/utr-submission?page=${page}&search=${search}&pageSize=${pageSize}`,
      transformResponse: (response) => ({
        data: response.data || [],
        total: response.meta?.total || 0,
        count: response.meta?.count || 0,
      }),
      providesTags: ["Accounts"],
    }),
    getExportProjectBalance: builder.mutation({
      query: (body) => ({
        url: "/accounting/export-project-balance",
        method: "POST",
        body,
        responseHandler: async (response) => {
          const blob = await response.blob();
          return {
            blob,
            filename:
              response.headers
                .get("Content-Disposition")
                ?.split("filename=")[1] || "project-balance.csv",
          };
        },
      }),
    }),

    updateCreditExtension: builder.mutation({
      query: ({ id, ...body }) => ({
        url: `/credit-extension-by-id/${id}`,
        method: "PUT",
        body,
      }),
      invalidatesTags: ["Accounts"],
    }),
    updateRequestExtension: builder.mutation({
      query: ({ id, credit_remarks }) => ({
        url: `/request-extension-by-id/${id}`,
        method: "PUT",
        body: { credit_remarks },
      }),
      invalidatesTags: ["Accounts"],
    }),
    updateRestoreTrash: builder.mutation({
      query: ({ id, remarks }) => ({
        url: `/restore-pay-request/${id}`,
        method: "PUT",
        body: { remarks },
      }),
      invalidatesTags: ["Accounts"],
    }),

    getLedger: builder.query({
      query: ({ project_id, search, type, page, limit }) => ({
        url: `accounting/ledger?project_id=${project_id}&search=${search}&type=${type}&page=${page}&limit=${limit}`,
        method: "GET",
      }),
      providesTags: ["Accounts"],
    }),

    //Credit Routes
    creditMoney: builder.mutation({
      query: (body) => ({
        url: "/accounting/credit",
        method: "POST",
        body,
      }),
      // ✅ so your project balance list auto refreshes
      invalidatesTags: () => [{ type: "Accounts", id: "ProjectBalance" }],
    }),

    getCreditMoneybyProjectId: builder.query({
      query: ({ project_id, page, limit, search, cr_mode }) => ({
        url: `accounting/credit?project_id=${project_id}&search=${search}&cr_mode=${cr_mode}&page=${page}&limit=${limit}`,
        method: "GET",
      }),
      invalidatesTags: ["Accounts"],
    }),

    deleteCreditById: builder.mutation({
      query: (id) => ({
        url: `accounting/credit/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Accounts"],
    }),

    //Debit Routes
    getDebitMoneybyProjectId: builder.query({
      query: ({ project_id, page, limit, search, pay_type }) => ({
        url: `accounting/debit?project_id=${project_id}&search=${search}&pay_type=${pay_type}&page=${page}&limit=${limit}`,
        method: "GET",
      }),
      invalidatesTags: ["Accounts"],
    }),

    //Purchase Order Routes
    getPurchaseOrderbyProjectId: builder.query({
      query: ({ project_id, page, limit, search }) => ({
        url: `accounting/purchaseorder?project_id=${project_id}&search=${search}&page=${page}&limit=${limit}`,
        method: "GET",
      }),
      invalidatesTags: ["Accounts"],
    }),

    getSalesbyProjectId: builder.query({
      query: ({ project_id, page, limit, search }) => ({
        url: `accounting/sales?project_id=${project_id}&search=${search}&page=${page}&limit=${limit}`,
        method: "GET",
      }),
      invalidatesTags: ["Accounts"],
    }),

    updateSalesDetailById: builder.mutation({
      query: ({ salesId, body }) => ({
        url: `update-sales-details/${salesId}`,
        method: "PUT",
        body,
      }),
      invalidatesTags: ["Accounts"],
    }),

    //Balance Summary
    getBalanceSummaryByProjectId: builder.query({
      query: ({ project_id }) => ({
        url: `accounting/balancesummary?project_id=${project_id}`,
        method: "GET",
      }),
      invalidatesTags: ["Accounts"],
    }),

    //Payment Request
    addPayRequest: builder.mutation({
      query: (body) => ({
        url: "/payrequest",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Accounts"],
    }),

    getPayRequestbyPo: builder.query({
      query: ({ po_number }) => ({
        url: `get-po-for-adjust?po_number=${po_number}`,
        method: "GET",
      }),
      invalidatesTags: ["Accounts"],
    }),

    //Adustments
    getAdjustments: builder.query({
      query: ({ page, limit, search, status }) => ({
        url: `accounting/adjustment?page=${page}&limit=${limit}&search=${search}&status=${status}`,
        method: "GET",
      }),
      providesTags: (result) => {
        const base = [{ type: "Adjustment", id: "LIST" }];
        const items =
          result?.data?.map?.((x) => ({ type: "Adjustment", id: x._id })) || [];

        return base.concat(items);
      },
    }),

    // ------- GET DETAIL -------
    getAdjustmentbyId: builder.query({
      query: (id) => ({
        url: `accounting/adjustment/${id}`,
        method: "GET",
      }),
      providesTags: (result, error, id) => [{ type: "Adjustment", id }],
    }),

    // ------- CREATE -------
    createAdjustment: builder.mutation({
      query: ({ relation, from, to }) => ({
        url: "accounting/adjustment",
        method: "POST",
        body: { relation, from, to },
      }),
      invalidatesTags: [{ type: "Adjustment", id: "LIST" }],
    }),

    // ------- UPDATE STATUS (bulk) -------
    updateAdjustmentStatus: builder.mutation({
      query: ({ status, remarks, ids }) => ({
        url: "accounting/adjustment-status",
        method: "PATCH",
        body: { status, remarks, ids },
      }),
      invalidatesTags: (result, error, arg) => {
        const listTag = [{ type: "Adjustment", id: "LIST" }];
        const itemTags =
          arg?.ids?.map?.((id) => ({ type: "Adjustment", id })) || [];
        return listTag.concat(itemTags);
      },
    }),

    // ------- UPDATE (single) -------
    updateAdjustment: builder.mutation({
      query: ({ id, payload }) => ({
        url: `accounting/adjustment/${id}`,
        method: "PUT",
        body: payload,
      }),
      invalidatesTags: (result, error, arg) => [
        { type: "Adjustment", id: "LIST" },
        { type: "Adjustment", id: arg.id },
      ],
    }),

    getAdjustmentsByProjectId: builder.query({
      query: ({ project_id, page, limit, search, status }) => ({
        url: `accounting/adjustment-project?project_id=${project_id}&page=${page}&limit=${limit}&search=${search}&status=${status}`,
        method: "GET",
      }),
      providesTags: (result) => {
        const base = [{ type: "Adjustment", id: "LIST" }];
        const items =
          result?.data?.map?.((x) => ({ type: "Adjustment", id: x._id })) || [];

        return base.concat(items);
      },
    }),
    exportProjectFinanceCsv: builder.query({
      // We must use queryFn because blob needs custom handling
      async queryFn(
        {
          project_id,
          from,
          to,
          search,
          txn_type = "all",
          include_history = "false",
          sections = "all",
        },
        _api,
        _extraOptions,
        baseQuery,
      ) {
        const params = new URLSearchParams();
        if (project_id) params.set("project_id", project_id);
        if (from) params.set("from", from);
        if (to) params.set("to", to);
        if (search) params.set("search", search);
        if (txn_type) params.set("txn_type", txn_type);
        if (include_history != null)
          params.set("include_history", String(include_history));
        if (sections) params.set("sections", sections);

        const result = await baseQuery({
          url: `accounting/exportProjectFinanceCsv?${params.toString()}`,
          method: "GET",
          // ✅ get file instead of json
          responseHandler: (res) => res.blob(),
        });

        if (result.error) return { error: result.error };

        // fetchBaseQuery exposes Response as result.meta.response
        const response = result.meta?.response;
        const cd = response?.headers?.get("content-disposition") || "";

        return {
          data: {
            blob: result.data,
            contentDisposition: cd,
          },
        };
      },
    }),
  }),
});

export const {
  useGetProjectBalanceQuery,
  useGetPaymentApprovalQuery,
  useGetPaymentHistoryQuery,
  useGetCustomerSummaryQuery,
  useGetPaymentApprovedQuery,
  useGetUtrSubmissionQuery,
  useGetExportProjectBalanceMutation,
  useGetPaymentRecordQuery,
  useGetTrashRecordQuery,
  useUpdateCreditExtensionMutation,
  useUpdateRequestExtensionMutation,
  useUpdateRestoreTrashMutation,
  useUpdateSalesPOMutation,
  useGetLedgerQuery,
  useCreditMoneyMutation,
  useGetCreditMoneybyProjectIdQuery,
  useDeleteCreditByIdMutation,
  useGetDebitMoneybyProjectIdQuery,
  useGetPurchaseOrderbyProjectIdQuery,
  useGetSalesbyProjectIdQuery,
  useUpdateSalesDetailByIdMutation,
  useGetBalanceSummaryByProjectIdQuery,
  useAddPayRequestMutation,
  useGetPayRequestbyPoQuery,
  useLazyGetPayRequestbyPoQuery,
  useCreateAdjustmentMutation,
  useGetAdjustmentsQuery,
  useGetAdjustmentbyIdQuery,
  useUpdateAdjustmentStatusMutation,
  useUpdateAdjustmentMutation,
  useGetAdjustmentsByProjectIdQuery,
  useLazyExportProjectFinanceCsvQuery,
} = AccountsApi;
