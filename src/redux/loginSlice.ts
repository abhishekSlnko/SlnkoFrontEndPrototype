import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

const baseQuery = fetchBaseQuery({
  baseUrl: `${import.meta.env.VITE_API_URL}/`,

  credentials: "include",
  prepareHeaders: (headers) => {
    const token = localStorage.getItem("authToken");
    if (token) headers.set("x-auth-token", token);
    return headers;
  },
});

const normalizeUsers = (result) => {
  if (!result) return [];
  if (Array.isArray(result)) return result;
  if (Array.isArray(result?.data?.data)) return result.data.data;
  if (Array.isArray(result?.data)) return result.data;
  return [];
};

export const loginsApi = createApi({
  reducerPath: "loginsApi",
  baseQuery,

  tagTypes: ["Login", "User"],
  endpoints: (builder) => ({
    getLogins: builder.query({
      query: () => "get-all-useR-IT",

      providesTags: (result) => {
        const list = normalizeUsers(result);
        return [
          { type: "User", id: "LIST" },
          ...list
            .filter((u) => u && (u._id || u.id))
            .map((u) => ({ type: "User", id: u._id ?? u.id })),
        ];
      },
    }),

    addLogins: builder.mutation({
      query: (newLogin) => ({
        url: "logiN-IT",
        method: "POST",
        body: newLogin,
      }),
      // new user likely changes the list
      invalidatesTags: [{ type: "User", id: "LIST" }, "Login"],
    }),

    verifyOtp: builder.mutation({
      query: (otpPayload) => ({
        url: "verifyOtp",
        method: "POST",
        body: otpPayload,
      }),
    }),

    addEmail: builder.mutation({
      query: (newEmail) => ({
        url: "sendOtp",
        method: "POST",
        body: newEmail,
      }),
      invalidatesTags: ["Login"],
    }),

    resetPassword: builder.mutation({
      query: (payload) => ({
        url: "resetPassword",
        method: "POST",
        body: payload,
      }),
    }),

    finalizeBDlogin: builder.mutation({
      query: (payload) => ({
        url: "session-verify",
        method: "POST",
        body: payload,
      }),
    }),

    getUserById: builder.query({
      query: (userId) => `user/${userId}`,
      providesTags: (result, error, userId) => [{ type: "User", id: userId }],
    }),

    // EDIT USER — after success, invalidate the specific user and the LIST
    editUser: builder.mutation({
      query: ({ userId, body }) => ({
        url: `edit-user/${userId}`,
        method: "PUT",
        body, // can be plain JSON or FormData
      }),
      invalidatesTags: (result, error, { userId }) => [
        { type: "User", id: userId },
        { type: "User", id: "LIST" },
      ],
    }),

    updateUserStatus: builder.mutation({
      query: ({ userId, status, remarks }) => ({
        url: `/${userId}/update-user-status`,
        method: "PATCH",
        body: { status, remarks },
      }),
      invalidatesTags: (result, error, { userId }) => [
        { type: "User", id: userId },
        { type: "User", id: "LIST" },
      ],
    }),

    getAllUsers: builder.query({
      query: ({ page, limit, search = "", department = "", status = "" }) => {
        const params = new URLSearchParams();

        params.set("page", String(page));
        params.set("limit", String(limit));
        if (search) params.set("search", search);
        if (department) params.set("department", department);
        if (status) params.set("status", status);

        return `users?${params.toString()}`;
      },

      transformResponse: (response) => {
        const normalizedUsers = normalizeUsers(response.data || []);
        return {
          ...response,
          data: normalizedUsers,
        };
      },

      providesTags: (result) => {
        const list = result?.data ?? [];

        return [
          { type: "User", id: "LIST" },
          ...list
            .filter((u) => u && (u._id || u.id))
            .map((u) => ({
              type: "User",
              id: u._id ?? u.id,
            })),
        ];
      },
    }),

    updateReporting: builder.mutation({
      query: ({ ids, type, reporting_user }) => ({
        url: `/changereporting?type=${encodeURIComponent(type)}`,
        method: "PATCH",
        body: { ids, reporting_user },
      }),
      invalidatesTags: (result, error, { ids }) => [
        { type: "User", id: "LIST" },
        ...(Array.isArray(ids) ? ids.map((id) => ({ type: "User", id })) : []),
      ],
    }),
  }),
});

export const {
  useGetLoginsQuery,
  useAddEmailMutation,
  useAddLoginsMutation,
  useVerifyOtpMutation,
  useResetPasswordMutation,
  useFinalizeBDloginMutation,
  useGetUserByIdQuery,
  useEditUserMutation,
  useUpdateUserStatusMutation,
  useGetAllUsersQuery,
  useUpdateReportingMutation,
} = loginsApi;
