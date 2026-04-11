import React, { createContext, useContext, useState, useEffect } from "react";

const TaskRecordsContext = createContext();

export const TaskRecordsProvider = ({ children }) => {
  const [records, setRecords] = useState([]);
  const BASE_URL = "https://stacks-admin.onrender.com";

  // Fetch records from backend
  const fetchTaskRecords = async () => {
    const token = localStorage.getItem("authToken");
    if (!token) return;
    try {
      const res = await fetch(`${BASE_URL}/api/task-records`, {
        headers: {
          "Content-Type": "application/json",
          "X-Auth-Token": token,
        },
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.records)) {
        setRecords(data.records);
      }
    } catch (err) {
      // Optionally: setRecords([]) or leave unchanged
    }
  };

  // Expose a friendly alias that components already expect (refreshRecords)
  const refreshRecords = fetchTaskRecords;

  // Ensure we fetch records on provider mount if token already exists,
  // and also when authToken appears (login) — handle same-tab and cross-tab changes.
  useEffect(() => {
    let fetched = false;
    let pollInterval = null;

    // Try to fetch immediately if token exists
    const tryFetchOnce = async () => {
      const token = localStorage.getItem("authToken");
      if (token && !fetched) {
        fetched = true;
        await fetchTaskRecords();
        if (pollInterval) {
          clearInterval(pollInterval);
          pollInterval = null;
        }
      }
    };

    // Start: immediate attempt
    tryFetchOnce();

    // Poll for token in same tab for a short period (in some login flows token is set after provider mount)
    pollInterval = setInterval(() => {
      tryFetchOnce();
    }, 800);

    // Also listen for cross-tab changes to authToken (storage event)
    const onStorage = (e) => {
      if (e.key === "authToken" && e.newValue) {
        // token appeared in another tab -> fetch records now
        fetchTaskRecords();
      }
      // If token removed, optionally clear records (not doing that now)
    };
    window.addEventListener("storage", onStorage);

    return () => {
      if (pollInterval) clearInterval(pollInterval);
      window.removeEventListener("storage", onStorage);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // run once on provider mount

  useEffect(() => {
    // Also attempt a fetch on mount (legacy behavior preserved)
    fetchTaskRecords();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Add a new task record (start task)
  // Supports both normal and combo (API will determine which is triggered)
  // Returns: for combo, { isCombo: true, task, ... }; for normal, { task }
  const addTaskRecord = async (taskObj) => {
    const token = localStorage.getItem("authToken");
    const res = await fetch(`${BASE_URL}/api/start-task`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Auth-Token": token,
      },
      body: JSON.stringify({ image: taskObj.image }), // For combo, only image is used as hint
    });
    const data = await res.json();
    if (data.success) {
      await fetchTaskRecords();
      // If API returned combo info, pass it along
      if (data.isCombo) {
        return {
          isCombo: true,
          ...data,
        };
      }
      // Normal task
      return { task: data.task };
    }
    return null;
  };

  // Submit a task by taskCode ONLY!
  const submitTaskRecord = async (taskCode) => {
    const token = localStorage.getItem("authToken");
    const res = await fetch(`${BASE_URL}/api/submit-task`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Auth-Token": token,
      },
      body: JSON.stringify({ taskCode }),
    });
    const data = await res.json();
    if (data.success) {
      await fetchTaskRecords();
      return data;
    }
    return { success: false, message: data.message, mustDeposit: !!data.mustDeposit };
  };

  // Check for pending normal task (not combo)
  const hasPendingTask = () =>
    records.some((t) => t.status === "Pending" && !t.isCombo);

  // Check for pending combo task
  const hasPendingComboTask = () =>
    records.some((t) => t.status === "Pending" && t.isCombo);

  // Get current pending normal task (if any)
  const getPendingTask = () =>
    records.find((t) => t.status === "Pending" && !t.isCombo) || null;

  // Get current pending combo group (returns array of combo records)
  const getPendingComboTasks = () => {
    // Find the first pending comboGroupId (if any)
    const combo = records.find((t) => t.status === "Pending" && t.isCombo);
    if (!combo || !combo.comboGroupId)
      return [];
    // Get all records with that comboGroupId
    return records.filter(
      (t) => t.status === "Pending" && t.comboGroupId === combo.comboGroupId
    );
  };

  return (
    <TaskRecordsContext.Provider
      value={{
        records,
        setRecords, // <-- Expose this for instant updates in the UI!
        fetchTaskRecords,
        refreshRecords, // alias kept for consumers that expect this name
        addTaskRecord,
        submitTaskRecord,
        hasPendingTask,
        hasPendingComboTask,
        getPendingTask,
        getPendingComboTasks,
      }}
    >
      {children}
    </TaskRecordsContext.Provider>
  );
};

export const useTaskRecords = () => useContext(TaskRecordsContext);
