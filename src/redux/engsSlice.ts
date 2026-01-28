import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

const baseQuery = fetchBaseQuery({
  baseUrl: `${import.meta.env.VITE_API_URL}/`,
  credentials: "include",
  prepareHeaders: (headers) => {
    const token = localStorage.getItem("authToken");
    if (token) {
      headers.set("x-auth-token", token);
    }
    return headers;
  },
});

export const engsApi = createApi({
  reducerPath: "engsApi",
  baseQuery,
  tagTypes: ["Eng"],
  endpoints: (builder) => ({
    addEng: builder.mutation({
      query: (addBOM) => ({
        url: "/add-bom-master",
        method: "POST",
        body: addBOM,
      }),
      invalidatesTags: ["Eng"],
    }),

    uploadFileCount: builder.query({
      query: ({ startDate, endDate }) => ({
        url: `/engineering/eng-file-count?startDate=${startDate}&endDate=${endDate}`,
        method: "GET",
      }),
      providesTags: ["Eng"],
    }),

    engUserDetail: builder.query({
      query: ({ startDate, endDate }) => ({
        url: `/engineering/eng-user-detail?startDate=${startDate}&endDate=${endDate}`,
        method: "GET",
      }),
      providesTags: ["Eng"]
    }),

    AssignendUnAssignedCount: builder.query({
      query: ({ startDate, endDate }) => ({
        url: `/engineering/assigned-task-count?startDate=${startDate}&endDate=${endDate}`,
        method: "GET",
      }),
      providesTags: ["Eng"],
    }),

    userFileUploadCount: builder.query({
      query: ({ startDate, endDate, user }) => ({
        url: `/engineering/upload-count?startDate=${startDate}&endDate=${endDate}&user=${user}`,
        method: "GET",
      }),
      providesTags: ["Eng"]
    }),

    getTemplateWisCount: builder.query({
      query: ({ startDate, endDate }) => ({
        url: `/engineering/template-count?startDate=${startDate}&endDate=${endDate}`,
        method: "GET",
      }),
      providesTags: ["Eng"],
    }),

    getAllEngUpload: builder.query({
      query: ({ dateFrom, dateTo, groupBy, search, user, project, template, page, limit }) => ({
        url: `/engineering/allUploads?startDate=${dateFrom}&endDate=${dateTo}&groupBy=${groupBy}&user=${user}&project=${project}&template=${template}&page=${page}&limit=${limit}&search=${search}`,
        method: "GET",
      }),
      providesTags: ["Eng"]
    }),

    getAllTemplate: builder.query({
      query: () => ({
        url: `/engineering/all-template`,
        method: "GET",
      }),
      providesTags: ["Eng"]
    })
  }),
});

export const {
  useAddEngMutation,
  useUploadFileCountQuery,
  useLazyUploadFileCountQuery,
  useLazyEngUserDetailQuery,
  useEngUserDetailQuery,
  useLazyAssignendUnAssignedCountQuery,
  useAssignendUnAssignedCountQuery,
  useLazyUserFileUploadCountQuery,
  useLazyGetTemplateWisCountQuery,
  useGetAllEngUploadQuery,
  useGetAllTemplateQuery,
} = engsApi;
