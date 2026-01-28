// src/redux/loanApi.js
import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

function buildCreateLoanFormData({ data = {}, files = [], links = [] }) {
  const fd = new FormData();

  // Safe JSON stringify with circular reference handling
  try {
    const replacer = (key, value) => {
      // Handle File and Blob objects
      if (value instanceof File || value instanceof Blob) {
        return "[File/Blob]";
      }
      // Handle Buffer objects
      if (typeof Buffer !== 'undefined' && value instanceof Buffer) {
        return value.toString('base64');
      }
      // Handle other non-serializable objects
      if (value && typeof value === 'object') {
        if (value.constructor && value.constructor.name === 'HTMLElement') {
          return "[HTMLElement]";
        }
      }
      return value;
    };
    fd.append("data", JSON.stringify(data, replacer));
  } catch (err) {
    console.error("Error stringifying data:", err);
    fd.append("data", JSON.stringify({ error: "Failed to serialize data" }));
  }

  let idx = 0;

  // Documents metadata from the JSON payload, used to enrich file/link entries
  const docsMeta = Array.isArray(data?.documents) ? data.documents : [];

  files.forEach(({ file, name }) => {
    if (!file) return;
    fd.append("files", file);
    const resolvedName = name ?? (file?.name || "document");
    fd.append(`file_filename[${idx}][name]`, resolvedName);
    fd.append(`file_filename[${idx}][fileIndex]`, String(idx));
    // Attach extra parameters if available
    try {
      const meta = docsMeta.find((d) => String(d?.filename || "") === String(resolvedName));
      fd.append(`file_filename[${idx}][filetype]`, String(meta?.filetype ?? ""));
      fd.append(`file_filename[${idx}][documentListId]`, String(meta?.documentListId ?? ""));
    } catch {}
    idx += 1;
  });

  links.forEach(({ url, name }) => {
    if (!url) return;
    const resolvedName = name || "document";
    fd.append(`file_filename[${idx}][name]`, resolvedName);
    fd.append(`file_filename[${idx}][url]`, url);
    // Attach extra parameters if available via matching fileurl
    try {
      const meta = docsMeta.find((d) => String(d?.fileurl || "") === String(url));
      fd.append(`file_filename[${idx}][filetype]`, String(meta?.filetype ?? ""));
      fd.append(`file_filename[${idx}][documentListId]`, String(meta?.documentListId ?? ""));
    } catch {}
    idx += 1;
  });

  return fd;
}

/**
 * Normalizes banker details into a backend-friendly payload.
 * Accepts a single object or an array; returns { bankers: [ ... ] }.
 * Only includes non-empty fields and preserves optional id/_id.
 */
function normalizeBankers(input) {
  const arr = Array.isArray(input) ? input : input ? [input] : [];
  const cleaned = arr
    .map((b) => {
      const out = {};
      const fields = [
        "name",
        "email",
        "phone",
        "branch",
        "designation",
        "notes",
        "bank_name",
        "bank_code",
      ];
      for (const k of fields) {
        const v = b?.[k];
        if (v != null && String(v).trim() !== "") out[k] = String(v).trim();
      }
      const id = b?.id || b?._id;
      if (id != null && String(id).trim() !== "") out.id = String(id).trim();
      return out;
    })
    .filter((obj) => Object.keys(obj).length > 0);
  return { bankers: cleaned };
}

const baseQuery = fetchBaseQuery({
  baseUrl: `${import.meta.env.VITE_API_URL}/loan`,
  credentials: "include",
  prepareHeaders: (headers) => {
    const token = localStorage.getItem("authToken");
    if (token) headers.set("x-auth-token", token);
    return headers;
  },
});

// Wrapper for baseQuery with logging
const baseQueryWithLogging = async (args, api, extraOptions) => {

  const result = await baseQuery(args, api, extraOptions);

  return result;
};

export const loanApi = createApi({
  reducerPath: "loanApi",
  baseQuery: baseQueryWithLogging,
  tagTypes: ["Loan", "UniqueBanks"],
  endpoints: (builder) => ({
    getUniqueBanks: builder.query({
      query: ({ search = "" } = {}) => ({
        url: `/unique-bank${
          search ? `?search=${encodeURIComponent(search)}` : ""
        }`,
        method: "GET",
      }),
      providesTags: (result) =>
        result?.data?.length
          ? [
              ...result.data.map((_, i) => ({ type: "UniqueBanks", id: i })),
              { type: "UniqueBanks", id: "LIST" },
            ]
          : [{ type: "UniqueBanks", id: "LIST" }],
    }),

      getLoanStatusByState: builder.query({
        query: ({ sanction_from, sanction_to, disbursal_from, disbursal_to } = {}) => {
          let url = `/loan-status-state`;
          const params = new URLSearchParams();
          
          // Add date range parameters if provided
          if (sanction_from) params.append("sanction_from", sanction_from);
          if (sanction_to) params.append("sanction_to", sanction_to);
          if (disbursal_from) params.append("disbursal_from", disbursal_from);
          if (disbursal_to) params.append("disbursal_to", disbursal_to);
          
          if (params.toString()) {
            url += `?${params.toString()}`;
          }
          
          return {
            url,
            method: "GET",
          };
        },
        transformResponse: (response) => response?.data ?? response ?? [],
        providesTags: [{ type: "Loan", id: "LoanStatusByState" }],
      }),

      getLoanStatusByBank: builder.query({
        query: ({ stateFilter = "all", sanction_from, sanction_to, disbursal_from, disbursal_to } = {}) => {
          let url = `/loan-status-bank`;
          const params = new URLSearchParams();
          
          // Add state filter
          params.append("stateFilter", stateFilter);
          
          // Add date range parameters if provided
          if (sanction_from) params.append("sanction_from", sanction_from);
          if (sanction_to) params.append("sanction_to", sanction_to);
          if (disbursal_from) params.append("disbursal_from", disbursal_from);
          if (disbursal_to) params.append("disbursal_to", disbursal_to);
          
          url += `?${params.toString()}`;
          
          return {
            url,
            method: "GET",
          };
        },
        transformResponse: (response) => response?.data ?? response ?? [],
        providesTags: [{ type: "Loan", id: "LoanStatusByBank" }],
      }),

      getLoanStatusCount: builder.query({
        query: () => ({
          url: `/loan-status-count`,
          method: "GET",
        }),
        transformResponse: (response) => response?.data ?? response ?? [],
        providesTags: [{ type: "Loan", id: "LoanStatusCount" }],
      }),

    createLoan: builder.mutation({
      query: ({ projectId, data, files = [], links = [] }) => {
        const formData = buildCreateLoanFormData({ data, files, links });
        return {
          url: `/?project_id=${encodeURIComponent(projectId)}`,
          method: "POST",
          body: formData,
        };
      },
      invalidatesTags: [
        { type: "Loan", id: "LIST" },
        { type: "UniqueBanks", id: "LIST" },
      ],
    }),

    getAllLoan: builder.query({
      query: ({ search = "", limit = 10, page = 1, sort = "-updatedAt", loan_status, ...otherParams } = {}) => {
        // Build base URL with required params
        let url = `/all-loan?page=${page}&limit=${limit}&search=${encodeURIComponent(search)}&sort=${encodeURIComponent(sort)}`;
        
        // Add loan_status if provided
        if (loan_status) {
          url += `&loan_status=${encodeURIComponent(loan_status)}`;
        }
        
        // Add any other query params dynamically
        Object.keys(otherParams).forEach(key => {
          if (otherParams[key] !== undefined && otherParams[key] !== null && otherParams[key] !== '') {
            url += `&${key}=${encodeURIComponent(otherParams[key])}`;
          }
        });
        
        return {
          url,
          method: "GET",
        };
      },
      transformResponse: (response) => response ?? {},
      providesTags: (result) =>
        result?.data?.length
          ? [
              ...result.data.map((_, i) => ({ type: "Loan", id: i })),
              { type: "Loan", id: "LIST" },
            ]
          : [{ type: "Loan", id: "LIST" }],
    }),

    getLoanById: builder.query({
      query: (project_id) => ({
        url: `/loan?project_id=${project_id}`,
        method: "GET",
      }),
      providesTags: (result) =>
        result?.data?.length
          ? [
              ...result.data.map((_, i) => ({ type: "UniqueBanks", id: i })),
              { type: "Loan", id: "LIST" },
            ]
          : [{ type: "Loan", id: "LIST" }],
    }),

    updateLoanStatus: builder.mutation({
      query: ({ project_id, status, remarks }) => ({
        url: `/${project_id}/status`,
        method: "PATCH",
        body: { status, remarks },
      }),
      invalidatesTags: [
        { type: "Loan", id: "LIST" },
        { type: "Loan", id: "LoanStatusByState" },
        { type: "Loan", id: "LoanStatusByBank" },
        { type: "Loan", id: "LoanStatusCount" },
      ],
    }),

    addComment: builder.mutation({
      query: ({ project_id, remarks, pendency_remark }) => ({
        url: `/comment?project_id=${project_id}`,
        method: "PATCH",
        body: {
          ...(remarks !== undefined && { remarks }),
          ...(pendency_remark !== undefined && { pendency_remark }),
        },
      }),
      invalidatesTags: [{ type: "Loan", id: "LIST" }],
    }),

    uploadExistingDocument: builder.mutation({
      query: ({ project_id, document_id, file, file_url }) => {
        const url = `/upload-existing-document?project_id=${project_id}&document_id=${document_id}`;
        if (file) {
          const form = new FormData();
          form.append("file", file);
          return {
            url,
            method: "PATCH",
            body: form,
          };
        }
        return {
          url,
          method: "PATCH",
          body: { file_url: file_url || "" },
        };
      },
      invalidatesTags: [{ type: "Loan", id: "LIST" }],
    }),

    addLoanDocument: builder.mutation({
      query: ({ project_id, formData, filename, file }) => {
        // If formData is provided (new structured format), use it directly
        if (formData instanceof FormData) {
          return {
            url: `/document?project_id=${encodeURIComponent(project_id)}`,
            method: "PATCH",
            body: formData,
          };
        }
        
        // Fallback to old simple format for backwards compatibility
        const form = new FormData();
        if (filename) form.append("filename", filename);
        if (file) form.append("file", file);
        return {
          url: `/document?project_id=${encodeURIComponent(project_id)}`,
          method: "PATCH",
          body: form,
        };
      },
      invalidatesTags: (_r, _e, { project_id }) => [
        { type: "Loan", id: "LIST" },
      ],
    }),

    /**
     * Add or update banker details for a loan.
     * Backend endpoint should accept PATCH with JSON body: { bankers: [...] }.
     * Example banker object: { name, email, phone, branch, designation, notes, bank_name, bank_code, id? }.
     */
    addOrUpdateBankers: builder.mutation({
      query: ({ project_id, bankers }) => ({
        url: `/bankers?project_id=${encodeURIComponent(project_id)}`,
        method: "PATCH",
        body: normalizeBankers(bankers),
      }),
      invalidatesTags: [{ type: "Loan", id: "LIST" }],
    }),

    /**
     * Inline update for a limited set of loan fields (dates, bank, banker contacts).
     * Expects payload already shaped for backend (timelines/banking_details/banker_details).
     */
    updateLoanInline: builder.mutation({
      query: ({ project_id, payload }) => ({
        url: `/inline-edit?project_id=${encodeURIComponent(project_id)}`,
        method: "PATCH",
        body: payload || {},
      }),
      invalidatesTags: [{ type: "Loan", id: "LIST" }],
    }),

    /**
     * Search loans by name with filtering support.
     * Supports filterType: bank_name, bank_state, status, project_code.
     */
    getLoanNameSearch: builder.query({
      query: ({ search = "", page = 1, limit = 7, filterType = "bank_name" }) => {
        const params = new URLSearchParams();
        if (typeof search === "string" && search.trim()) params.set("search", search.trim());
        params.set("page", String(page));
        params.set("limit", String(limit));
        if (filterType && String(filterType).trim()) {
          params.set("filterType", String(filterType).trim());
        }
        return `/search/name?${params.toString()}`;
      },
      providesTags: [{ type: "Loan", id: "SEARCH" }],
    }),
  }),
});

export const {
  useGetUniqueBanksQuery,
  useGetLoanStatusByStateQuery,
  useGetLoanStatusByBankQuery,
  useGetLoanStatusCountQuery,
  useLazyGetLoanByIdQuery,
  useCreateLoanMutation,
  useGetAllLoanQuery,
  useGetLoanByIdQuery,
  useUpdateLoanStatusMutation,
  useAddCommentMutation,
  useUploadExistingDocumentMutation,
  useAddLoanDocumentMutation,
  useAddOrUpdateBankersMutation,
  useUpdateLoanInlineMutation,
  useLazyGetLoanNameSearchQuery,
} = loanApi;