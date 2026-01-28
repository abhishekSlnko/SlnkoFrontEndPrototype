import React, { createContext, useContext, useMemo } from "react";
import { useGetPaymentHistoryQuery } from "../../redux/Accounts";

const PaymentContext = createContext(null);

export const usePayment = () => {
  const ctx = useContext(PaymentContext);
  if (!ctx) throw new Error("usePayment must be used within a PaymentProvider");
  return ctx;
};

export const PaymentProvider = ({ children, po_number, skip = false }) => {
  const shouldSkip = skip || !po_number;

  const { data, isLoading, error, refetch } = useGetPaymentHistoryQuery(
    { po_number },
    { skip: shouldSkip }
  );

  const value = useMemo(
    () => ({
      history: data?.history || [],
      total_debited: data?.total_debited || 0,
      po_value: data?.po_value || 0,
      isLoading,
      error,
      refetch,
      po_number,
      hasHistory: Array.isArray(data?.history) && data.history.length > 0,
    }),
    [data, isLoading, error, refetch, po_number]
  );

  return (
    <PaymentContext.Provider value={value}>{children}</PaymentContext.Provider>
  );
};
