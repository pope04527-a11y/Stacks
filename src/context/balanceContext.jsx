import React, { createContext, useContext, useState, useEffect } from "react";

const BASE_URL = "https://stacks-admin.onrender.com";

export const BalanceContext = createContext();

export function BalanceProvider({ children }) {
  const [balance, setBalance] = useState(0);
  const [commissionToday, setCommissionToday] = useState(0);
  const [taskCountToday, setTaskCountToday] = useState(0);
  const [username, setUsername] = useState("");
  const [vipLevel, setVipLevel] = useState("VIP1");
  const [userProfile, setUserProfile] = useState(null);

  // Fetch user profile from backend on mount or after login
  const fetchProfile = async () => {
    const token = localStorage.getItem("authToken");
    if (!token) return;
    try {
      const res = await fetch(`${BASE_URL}/api/user-profile`, {
        headers: {
          "Content-Type": "application/json",
          "X-Auth-Token": token,
        },
      });
      if (!res.ok) return;
      const data = await res.json();
      if (data.success && data.user) {
        setUsername(data.user.username || "");
        setBalance(data.user.balance ?? 0);
        setVipLevel(data.user.vipLevel || "VIP1");
        setCommissionToday(data.user.commissionToday ?? 0);
        setTaskCountToday(
          typeof data.user.taskCountThisSet === "number"
            ? data.user.taskCountThisSet
            : (data.user.taskCountToday ?? 0)
        );
        setUserProfile(data.user);
      }
    } catch (err) {
      console.error("Failed to fetch user profile", err);
    }
  };

  useEffect(() => {
    fetchProfile();
    // eslint-disable-next-line
  }, []);

  // Helper: call this after task start or submit to update balance etc from backend
  const refreshProfile = fetchProfile;

  // Deposit
  const deposit = async (amount) => {
    const token = localStorage.getItem("authToken");
    try {
      const res = await fetch(`${BASE_URL}/api/deposit`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Auth-Token": token },
        body: JSON.stringify({ amount }),
      });
      const data = await res.json();
      if (data.success) await refreshProfile();
    } catch (err) {
      console.error("Failed to deposit", err);
    }
  };

  // Withdraw
  const withdraw = async (amount) => {
    const token = localStorage.getItem("authToken");
    try {
      const res = await fetch(`${BASE_URL}/api/withdraw`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Auth-Token": token },
        body: JSON.stringify({ amount }),
      });
      const data = await res.json();
      if (data.success) await refreshProfile();
      return data.success;
    } catch (err) {
      console.error("Failed to withdraw", err);
      return false;
    }
  };

  return (
    <BalanceContext.Provider
      value={{
        balance,
        setBalance,
        deposit,
        withdraw,
        commissionToday,
        setCommissionToday,
        taskCountToday,
        setTaskCountToday,
        username,
        vipLevel,
        setVipLevel,
        refreshProfile,
        userProfile,
      }}
    >
      {children}
    </BalanceContext.Provider>
  );
}

export function useBalance() {
  return useContext(BalanceContext);
}
