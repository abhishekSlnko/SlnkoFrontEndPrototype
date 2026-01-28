


import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

function buildUploadFormData({ items = [], links = [] }) {
  const fd = new FormData();
  items.forEach(({ file, name }) => {
    fd.append("files", file);
    fd.append("names[]", name);
  });
  links.forEach((url) => {
    fd.append("documents[]", url);
  });
  return fd;
}

const baseQuery = fetchBaseQuery({
  baseUrl: `${import.meta.env.VITE_API_URL}/document`,
  credentials: "include",
  prepareHeaders: (headers) => {
    const token = localStorage.getItem("authToken");
    if (token) headers.set("x-auth-token", token);
    return headers;
  },
});

export const documentApi = createApi({
  reducerPath: "documentApi",
  baseQuery,
  tagTypes: ["ProjectDocs"],
  endpoints: (builder) => ({
        /** Delete a document list by id (new API) */
        deleteDocumentList: builder.mutation({
          query: (id) => ({
            url: `/list/${id}`,
            method: "DELETE",
          }),
          // Optionally, you can invalidate tags if needed
        }),
    getProjectDocuments: builder.query({
      query: ({ project_id, template_id }) => ({
        url: `/${project_id}/documents/${template_id}`,
        method: "GET",
      }),
      providesTags: (result, _err, projectId) =>
        result?.data?.length
          ? [
              ...result.data.map((d) => ({ type: "ProjectDocs", id: d._id })),
              { type: "ProjectDocs", id: `PROJECT-${projectId}` },
            ]
          : [{ type: "ProjectDocs", id: `PROJECT-${projectId}` }],
    }),

        // Independent: Get documents by projectId (new backend API)
    getDocumentsByProjectId: builder.query({
      query: ({projectId,page = 1,pageSize = 8}) => ({
        url: `/by-project/${projectId}?page=${page}&pageSize=${pageSize}`,
        method: "GET",
      }),
      providesTags: (result, _err, projectId) =>
        result?.data?.length
          ? [
              ...result.data.map((d) => ({ type: "ProjectDocs", id: d.documentList_id || d._id })),
              { type: "ProjectDocs", id: `PROJECT-${projectId}` },
            ]
          : [{ type: "ProjectDocs", id: `PROJECT-${projectId}` }],
    }),

    // Mutation for new backend: add document to project
    addDocumentToProject: builder.mutation({
      query: ({ projectId, document }) => ({
        url: `/by-project/${projectId}`,
        method: "POST",
        body: document,
      }),
      invalidatesTags: (_res, _err, { projectId }) => [
        { type: "ProjectDocs", id: `PROJECT-${projectId}` },
      ],
    }),
    
    // Update/Create document list for project with team name
    updateDocumentList: builder.mutation({
      query: ({ projectId, name, fileType }) => ({
        url: `/list/${projectId}`,
        method: "PUT",
        body: { name, fileType },
      }),
      invalidatesTags: (_res, _err, { projectId }) => [
        { type: "ProjectDocs", id: `PROJECT-${projectId}` },
        { type: "ProjectDocs", id: "LIST" },
      ],
    }),
    createProjectDocuments: builder.mutation({
      query: ({ global, name, fileType, project_id, template_id }) => ({
        url: `?global=${global}`,
        method: "POST",
        body: { name, fileType, project_id, template_id },
      }),
      invalidatesTags: (_res, _err, { id }) => [
        { type: "ProjectDocs", id: "LIST" },
        { type: "ProjectDocs", id },
      ],
    }),

    updateDocumentItemFile: builder.mutation({
      query: ({ formData, project_id, documentListId }) => ({
        url: `/${project_id}/document/${documentListId}`,
        method: "PUT",
        body: formData,
      }),
      invalidatesTags: (_res, _err, { id }) => [
        { type: "ProjectDocs", id: "LIST" },
        { type: "ProjectDocs", id },
      ],
    }),

    updateDocumentStatus: builder.mutation({
      query: ({ project_id, documentListId, status, remarks }) => ({
        url: `/${project_id}/documentStatus/${documentListId}`,
        method: "PUT",
        body: { status, remarks },
      }),
      invalidatesTags: (_res, _err, { id }) => [
        { type: "ProjectDocs", id: "LIST" },
        { type: "ProjectDocs", id },
      ],
    }),

    uploadProjectDocuments: builder.mutation({
      query: ({ projectId, items, links = [] }) => {
        const body = buildUploadFormData({ items, links });
        return {
          url: `?project_id=${projectId}`,
          method: "POST",
          body,
        };
      },
      invalidatesTags: (_res, _err, arg) => [
        { type: "ProjectDocs", id: `PROJECT-${arg.projectId}` },
      ],
    }),

    /** Delete a single document by id */
    deleteDocument: builder.mutation({
      query: ({ docId }) => ({
        url: `/${docId}`,
        method: "DELETE",
      }),
      invalidatesTags: (_res, _err, arg) =>
        arg.projectId
          ? [{ type: "ProjectDocs", id: `PROJECT-${arg.projectId}` }]
          : [],
    }),

    getDocumentByName: builder.query({
      query: ({ projectId, name }) => ({
        url: `/document-by-name?project_id=${projectId}&name=${name}`,
        method: "GET",
      }),
      providesTags: (result, _err, projectId) =>
        result?.data?.length
          ? [
              ...result.data.map((d) => ({ type: "ProjectDocs", id: d._id })),
              { type: "ProjectDocs", id: `PROJECT-${projectId}` },
            ]
          : [{ type: "ProjectDocs", id: `PROJECT-${projectId}` }],
    }),

    // Document Templates Api
    getDocumentTemplates: builder.query({
      query: ({ page, search, limit = 8, project_id }) => ({
        url: `/template?search=${search}&page=${page}&pageSize=${limit}&project_id=${project_id}`,
        method: "GET",
      }),
      providesTags: (result, _err, projectId) =>
        result?.data?.length
          ? [
              ...result.data.map((d) => ({ type: "ProjectDocs", id: d._id })),
              { type: "ProjectDocs", id: `PROJECT-${projectId}` },
            ]
          : [{ type: "ProjectDocs", id: `PROJECT-${projectId}` }],
    }),

    getDocumentTemplateById: builder.query({
      query: ({ id }) => ({
        url: `/template/${id}`,
        method: "GET",
      }),
      providesTags: (result, _err, projectId) =>
        result?.data?.length
          ? [
              ...result.data.map((d) => ({ type: "ProjectDocs", id: d._id })),
              { type: "ProjectDocs", id: `PROJECT-${projectId}` },
            ]
          : [{ type: "ProjectDocs", id: `PROJECT-${projectId}` }],
    }),

    updateDocumentTemplate: builder.mutation({
      query: ({ id, formData }) => ({
        url: `/template/${id}`,
        method: "PUT",
        body: formData,
      }),
      invalidatesTags: (_res, _err, { id }) => [
        { type: "ProjectDocs", id: "LIST" },
        { type: "ProjectDocs", id },
      ],
    }),

    createDocumentTemplate: builder.mutation({
      query: (formData) => ({
        url: `/template`,
        method: "POST",
        body: formData,
      }),
      invalidatesTags: (_res, _err, { id }) => [
        { type: "ProjectDocs", id: "LIST" },
        { type: "ProjectDocs", id },
      ],
    }),
  }),
});

export const {
  useGetProjectDocumentsQuery,
  useCreateProjectDocumentsMutation,
  useUpdateDocumentItemFileMutation,
  useUpdateDocumentStatusMutation,
  useUploadProjectDocumentsMutation,
  useDeleteDocumentMutation,
  useGetDocumentByNameQuery,
  useLazyGetDocumentByNameQuery,
  useGetDocumentTemplatesQuery,
  useGetDocumentTemplateByIdQuery,
  useUpdateDocumentTemplateMutation,
  useCreateDocumentTemplateMutation,
  useGetDocumentsByProjectIdQuery,
  useAddDocumentToProjectMutation,
  useDeleteDocumentListMutation,
  useUpdateDocumentListMutation,
} = documentApi;
