import React, { createContext, useContext, useState, useEffect } from "react";

const TransactionContext = createContext();

export const TransactionProvider = ({ children }) => {
  const [deposits, setDeposits] = useState([]);
  const [withdrawals, setWithdrawals] = useState([]);
  const [loading, setLoading] = useState(false);
  const BASE_URL = "https://stacks-admin.onrender.com";

  const fetchTransactions = async () => {
    const token = localStorage.getItem("authToken");
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch(`${BASE_URL}/api/transactions`, {
        headers: {
          "Content-Type": "application/json",
          "X-Auth-Token": token,
        },
      });
      const data = await res.json();
      if (data.success) {
        setDeposits(data.deposits || []);
        setWithdrawals(data.withdrawals || []);
      }
    } catch (err) {
      setDeposits([]);
      setWithdrawals([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchTransactions();
    // eslint-disable-next-line
  }, []);

  // You can call refresh after a new deposit or withdraw
  const refresh = fetchTransactions;

  return (
    <TransactionContext.Provider value={{
      deposits,
      withdrawals,
      loading,
      refresh
    }}>
      {children}
    </TransactionContext.Provider>
  );
};

export const useTransactions = () => useContext(TransactionContext);
