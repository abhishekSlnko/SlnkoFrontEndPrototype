import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { method } from "lodash";

const baseQuery = fetchBaseQuery({
  baseUrl: `${import.meta.env.VITE_API_URL}`,
  credentials: "include",
  prepareHeaders: (headers) => {
    const token = localStorage.getItem("authToken");
    // console.log("Token:", token);
    if (token) {
      headers.set("x-auth-token", token);
    }
    return headers;
  },
});
const clean = (o) =>
  Object.fromEntries(
    Object.entries(o).filter(
      ([, v]) => v !== undefined && v !== null && v !== ""
    )
  );
export const purchasesApi = createApi({
  reducerPath: "purchasesApi",
  baseQuery,
  tagTypes: ["Purchase"],
  endpoints: (builder) => ({
    getPurchases: builder.query({
      query: () => "get-all-pO-IT",
      providesTags: ["Purchase"],
    }),

    getPaginatedPOs: builder.query({
      query: (args = {}) => ({
        url: "get-paginated-po",
        params: clean({
          page: args.page ?? 1,
          search: args.search ?? "",
          status: args.status,
          pageSize: args.pageSize ?? 10,
          type: args.type,
          project_id: args.project_id,
          pr_id: args.pr_id,
          item_id: args.item_id,
          etdFrom: args.etdFrom,
          etdTo: args.etdTo,
          deliveryFrom: args.deliveryFrom,
          deliveryTo: args.deliveryTo,
          filter: args.filter,
          itemSearch: args.itemSearch,
          vendor_id: args.vendor_id,
          lock_status: args.lock_status,
        }),
      }),
      transformResponse: (response) => ({
        data: response.data || [],
        total: response.meta?.total || 0,
        count: response.meta?.count || 0,
      }),
      providesTags: ["Purchase"],

      forceRefetch({ currentArg, previousArg }) {
        return (
          JSON.stringify(clean(currentArg || {})) !==
          JSON.stringify(clean(previousArg || {}))
        );
      },
    }),

    getItems: builder.query({
      query: () => "get-iteM-IT",
      providesTags: ["Purchase"],
    }),

    getPo: builder.query({
      query: ({ po_number, _id } = {}) => ({
        url: "get-po-by-po_number",
        params: clean({
          po_number: po_number ? String(po_number) : "",
          _id: _id ? String(_id) : "",
        }),
      }),

      transformResponse: (resp) => {
        const po = Array.isArray(resp?.data)
          ? resp.data[0]
          : resp?.data ?? resp;
        return po || null;
      },

      providesTags: (result, error, arg) => [
        { type: "Purchase", id: arg?.po_number || "PO" },
      ],

      forceRefetch({ currentArg, previousArg }) {
        return (
          JSON.stringify(clean(currentArg || {})) !==
          JSON.stringify(clean(previousArg || {}))
        );
      },
    }),

    exportPos: builder.mutation({
      query: (payload) => ({
        url: "get-export-po",
        method: "POST",
        body: payload,
        responseHandler: (res) => res.blob(),
      }),
    }),

    addArchivedPo: builder.mutation({
      query: (payload) => ({
        url: "/updateArchivedPo",
        method: "PATCH",
        body: payload,
      }),
    }),

    getArchivedPaginatedPOs: builder.query({
      query: (args = {}) => ({
        url: "get-archived-po",
        params: clean({
          page: args.page ?? 1,
          search: args.search ?? "",
          status: args.status,
          pageSize: args.pageSize ?? 10,
          type: args.type,
          project_id: args.project_id,
          pr_id: args.pr_id,
          item_id: args.item_id,
          etdFrom: args.etdFrom,
          etdTo: args.etdTo,
          deliveryFrom: args.deliveryFrom,
          deliveryTo: args.deliveryTo,
          filter: args.filter,
          itemSearch: args.itemSearch,
          vendor_id: args.vendor_id,
          lock_status: args.lock_status,
        }),
      }),
      transformResponse: (response) => ({
        data: response.data || [],
        total: response.meta?.total || 0,
        count: response.meta?.count || 0,
      }),
      providesTags: ["Purchase"],

      forceRefetch({ currentArg, previousArg }) {
        return (
          JSON.stringify(clean(currentArg || {})) !==
          JSON.stringify(clean(previousArg || {}))
        );
      },
    }),

    unarchiveSelectedPo: builder.mutation({
      query: ({ ids }) => ({
        url: "/updateUnArchivedPo",
        method: "PATCH",
        body: { ids },
      }),
      invalidatesTags: ["Purchase"],
    }),

    addPurchases: builder.mutation({
      query: (newPurchase) => ({
        url: "/Add-purchase-ordeR-IT",
        method: "POST",
        body: newPurchase,
      }),
      invalidatesTags: ["Purchase"],
    }),
    updatePurchases: builder.mutation({
      query: ({ _id, updatedData }) => ({
        url: `edit-pO-IT/${_id}`,
        method: "PUT",
        body: updatedData,
      }),
      invalidatesTags: ["Purchase"],
    }),

    updateEtdOrDeliveryDate: builder.mutation({
      query: ({ po_number, etd, delivery_date }) => ({
        url: `/${encodeURIComponent(po_number)}/updateEtdOrDelivery`,
        method: "PUT",
        body: { etd, delivery_date },
      }),
      invalidatesTags: ["Purchase"],
    }),

    updatePurchasesStatus: builder.mutation({
      query: ({ id, status, remarks }) => ({
        url: `/updateStatusPO`,
        method: "PUT",
        body: {
          id,
          status,
          remarks,
        },
      }),
      invalidatesTags: ["Purchase"],
    }),
    getLogistics: builder.query({
      query: (params = {}) => {
        const {
          page = 1,
          pageSize = 50,
          search = "",
          status = "",
          po_id = "",
          po_number = "",
          ...additionalFilters
        } = params;

        // Build query string with all parameters
        const queryParams = new URLSearchParams();
        queryParams.set('page', page);
        queryParams.set('pageSize', pageSize);
        if (search) queryParams.set('search', search);
        if (status) queryParams.set('status', status);
        if (po_id) queryParams.set('po_id', po_id);
        if (po_number) queryParams.set('po_number', po_number);

        // Add any additional filter parameters (e.g., logistic_code, transportation_po, etc.)
        Object.entries(additionalFilters).forEach(([key, value]) => {
          if (value !== undefined && value !== null && value !== '') {
            queryParams.set(key, value);
          }
        });

        return `logistics/logistic?${queryParams.toString()}`;
      },
      transformResponse: (response) => ({
        data: response?.data || [],
        total: response?.meta?.total || 0,
        count:
          response?.meta?.count || (response?.data ? response.data.length : 0),
        page: response?.meta?.page || 1,
        pageSize: response?.meta?.pageSize || 50,
      }),
      providesTags: ["Logistic"],
    }),

    getLogisticById: builder.query({
      query: (id) => `logistics/logistic/${id}`,
      providesTags: ["Logistic"],
    }),

    addLogistic: builder.mutation({
      query: (newLogistic) => ({
        url: "logistics/logistic",
        method: "POST",
        body: newLogistic,
      }),
      invalidatesTags: ["Logistic"],
    }),

    // purchasesSlice.js (or wherever your API slice is)
    updateLogistic: builder.mutation({
      query: ({ id, body }) => ({
        url: `logistics/logistic/${id}`,
        method: "PUT",
        body, // <- now uses 'body'
      }),
      invalidatesTags: ["Logistic"],
    }),

    deleteLogistic: builder.mutation({
      query: (id) => ({
        url: `logistic/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Logistic"],
    }),

    getPoBasic: builder.query({
      query: ({ page = 1, pageSize = 10, search = "" }) =>
        `get-po-basic?page=${page}&pageSize=${pageSize}&search=${search}`,
      transformResponse: (response) => ({
        data: response.data || [],
        total:
          response.total ??
          response.pagination?.total ??
          response.meta?.total ??
          0,
        count:
          response.count ??
          response.pagination?.count ??
          response.meta?.count ??
          (response.data ? response.data.length : 0),
        pagination: response.pagination || null,
      }),
      providesTags: ["Purchase"],
    }),

    updateLogisticStatus: builder.mutation({
      query: ({ id, status, remarks }) => ({
        url: `logistics/logistic/${id}/status`,
        method: "PUT",
        body: { status, remarks },
      }),
      invalidatesTags: ["Logistic"],
    }),

    // Logistics History
    getLogisticsHistory: builder.query({
      query: ({ subject_type, subject_id }) => {
        const params = new URLSearchParams({
          subject_type,
          subject_id,
        });

        return `/logistics/logistichistory?${params.toString()}`;
      },
      providesTags: ["Logistic"],
    }),

    getLogisticsFilterOptions: builder.query({
      query: ({
        search = "",
        page = 1,
        limit = 7,
        filterType = "logistic_code",
      }) => {
        const params = new URLSearchParams();
        if (typeof search === "string" && search.trim())
          params.set("search", search.trim());
        params.set("page", String(page));
        params.set("limit", String(limit));
        if (filterType && String(filterType).trim()) {
          params.set("filterType", String(filterType).trim());
        }
        return `/logistics/logistic-filter-options?${params.toString()}`;
      },
      providesTags: [{ type: "Logistics", id: "FILTER_OPTIONS" }],
    }),

    addLogisticHistory: builder.mutation({
      query: (newHistory) => ({
        url: "/logistics/logistichistory",
        method: "POST",
        body: newHistory,
      }),
      invalidatesTags: ["Logistic"],
    }),
    bulkDeliverPOs: builder.mutation({
      query: ({ ids, remarks, date }) => ({
        url: `bulk-mark-delivered`,
        method: "PUT",
        body: clean({ ids, remarks, date }),
      }),
      invalidatesTags: ["Purchase", "Logistic"],
    }),
    ChangeIsLocked: builder.mutation({
      query: ({ id, data }) => ({
        url: `${id}/changeislocked`,
        method: "PATCH",
        body: { data },
      }),
      invalidatesTags: ["Purchase", "Logistic"],
    }),
    updatePoStatus: builder.mutation({
      query: ({ ids, status, remarks }) => ({
        url: `updatePoStatus`,
        method: "PATCH",
        body: { ids, status, remarks },
      }),
      invalidatesTags: ["Purchase", "Logistic"],
    }),
    webSearchPO: builder.query({
      query: ({page, limit, search}) => ({
        url:`web-search-po?page=${page}&limit=${limit}&search=${search}`,
        method:'GET',
      }),
      invalidatesTags: ["Purchase", "Logistic"],
    })
  }),
});

export const {
  useGetPurchasesQuery,
  useGetItemsQuery,
  useGetPaginatedPOsQuery,
  useExportPosMutation,
  useAddPurchasesMutation,
  useGetPoQuery,
  useUpdatePurchasesMutation,
  useUpdateEtdOrDeliveryDateMutation,
  useUpdatePurchasesStatusMutation,
  useGetLogisticsQuery,
  useGetLogisticByIdQuery,
  useAddLogisticMutation,
  useUpdateLogisticMutation,
  useDeleteLogisticMutation,
  useGetPoBasicQuery,
  useLazyGetPoBasicQuery,
  useUpdateLogisticStatusMutation,
  useLazyGetLogisticsHistoryQuery,
  useAddLogisticHistoryMutation,
  useBulkDeliverPOsMutation,
  useChangeIsLockedMutation,
  useUpdatePoStatusMutation,
  useAddArchivedPoMutation,
  useGetArchivedPaginatedPOsQuery,
  useUnarchiveSelectedPoMutation,
  useLazyGetLogisticsFilterOptionsQuery,
  useWebSearchPOQuery,
  useLazyWebSearchPOQuery
} = purchasesApi;
