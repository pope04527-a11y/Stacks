import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useBalance } from "../context/balanceContext";
import { useTransactions } from "../context/transactionContext";
import { useProfile } from "../context/profileContext";
// settings context
import { useSettings } from "../context/SettingsContext";

// Change: Remove "Approved" from 'success', so only "Completed" or "Success" are shown as "completed"
const WITHDRAW_STATUSES = {
  reviewing: ["Pending", "Reviewing", "In Review"],
  success: ["Completed", "Success"], // Removed "Approved"
  reject: ["Rejected", "Reject", "Failed"],
};
function normalizeStatus(status) {
  if (!status) return "reviewing";
  if (WITHDRAW_STATUSES.reviewing.some(s => status.toLowerCase().includes(s.toLowerCase()))) return "reviewing";
  if (WITHDRAW_STATUSES.success.some(s => status.toLowerCase().includes(s.toLowerCase()))) return "success";
  if (WITHDRAW_STATUSES.reject.some(s => status.toLowerCase().includes(s.toLowerCase()))) return "reject";
  // Handle "Approved" as a special case, display as "Completed"
  if (status.toLowerCase().includes("approved")) return "success";
  return "reviewing";
}

const START_BLUE = "#1fb6fc";
const BLACK_BG = "#181c23";

export default function Withdraw() {
  const [tab, setTab] = useState("withdraw");
  const [historyTab, setHistoryTab] = useState("reviewing");
  const [amount, setAmount] = useState("");
  const [withdrawPassword, setWithdrawPassword] = useState("");
  const [message, setMessage] = useState("");
  const navigate = useNavigate();

  const { balance, refreshProfile } = useBalance();
  const { withdrawals, loading, refresh } = useTransactions();
  const { profile } = useProfile();

  // settings: currency string and format helper
  const { currency, formatAmount } = useSettings();

  const handleWithdraw = async (e) => {
    e.preventDefault();
    setMessage("");
    if (!amount || Number(amount) <= 0) {
      setMessage("Please enter a valid amount.");
      return;
    }
    if (!withdrawPassword) {
      setMessage("Please enter your withdrawal password.");
      return;
    }
    const token = localStorage.getItem("authToken");
    const BASE_URL = "https://stacks-admin.onrender.com";
    const res = await fetch(`${BASE_URL}/api/withdraw`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Auth-Token": token,
      },
      body: JSON.stringify({ amount, withdrawPassword }),
    });
    const data = await res.json();
    if (data.success) {
      setMessage("Withdrawal request submitted and is under review.");
      setAmount("");
      setWithdrawPassword("");
      refresh();
      refreshProfile();
    } else {
      setMessage(data.message || "Failed to withdraw.");
    }
  };

  const maxCardWidth = 600;

  // Filter withdrawals by normalized status for history tabs
  const filteredWithdrawals = (withdrawals || []).filter(
    w => normalizeStatus(w.status) === historyTab
  );

  // helper to format numeric amounts while keeping currency styling separate
  const fmtNum = (v) => {
    const n = Number(v || 0);
    if (!Number.isFinite(n)) return "";
    return n.toFixed(2);
  };

  return (
    <div className="min-h-screen bg-white pb-16" style={{fontFamily: "system-ui, Arial, sans-serif"}}>
      {/* Header */}
      <div style={{
        background: "#464b4e",
        color: "white",
        textAlign: "center",
        fontWeight: 700,
        fontSize: 22,
        padding: "14px 0",
        position: "relative"
      }}>
        <button
          onClick={() => navigate(-1)}
          style={{
            position: "absolute", left: 18, top: "50%",
            transform: "translateY(-50%)",
            background: "none",
            border: "none",
            padding: 0,
            margin: 0,
            cursor: "pointer",
            lineHeight: 1,
            display: "flex",
            alignItems: "center",
          }}
          aria-label="Back"
        >
          <svg width={28} height={28} viewBox="0 0 22 22">
            <polyline
              points="14,5 8,11 14,17"
              fill="none"
              stroke={START_BLUE}
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
        <span data-i18n="Withdraw">Withdraw</span>
      </div>

      {/* Tabs */}
      <div style={{
        display: "flex",
        justifyContent: "center",
        borderBottom: "1px solid #eaeaea",
        background: "#fff",
        marginBottom: 0,
        fontSize: 0
      }}>
        <button
          style={{
            flex: 1,
            padding: "20px 0 10px 0",
            fontWeight: 600,
            fontSize: 20,
            color: tab === "withdraw" ? "#222" : "#888",
            background: "none",
            border: "none",
            borderBottom: tab === "withdraw" ? "3px solid #2196d6" : "3px solid transparent",
            outline: "none",
            cursor: "pointer"
          }}
          onClick={() => setTab("withdraw")}
        ><span data-i18n="Withdraw">Withdraw</span></button>
        <button
          style={{
            flex: 1,
            padding: "20px 0 10px 0",
            fontWeight: 600,
            fontSize: 20,
            color: tab === "history" ? "#222" : "#888",
            background: "none",
            border: "none",
            borderBottom: tab === "history" ? "3px solid #2196d6" : "3px solid transparent",
            outline: "none",
            cursor: "pointer"
          }}
          onClick={() => setTab("history")}
        ><span data-i18n="History">History</span></button>
      </div>

      {/* Withdraw Tab */}
      {tab === "withdraw" ? (
        <>
          {/* Card */}
          <div
            style={{
              background: "#2196d6",
              borderRadius: 20,
              margin: "28px auto 18px auto",
              maxWidth: maxCardWidth,
              boxShadow: "0 4px 16px 0 rgba(0,0,0,0.07)",
              padding: 0,
              overflow: "hidden",
              minHeight: 120,
              width: "95%",
              display: "flex",
              alignItems: "center"
            }}
          >
            <div style={{padding: 22, width: "100%"}}>
              <div style={{fontWeight: 700, color: "#fff", fontSize: 18, marginBottom: 2}} data-i18n="Account Amount">
                Account Amount
              </div>
              <div style={{display: "flex", alignItems: "flex-end", gap: 6}}>
                <span style={{fontSize: 38, fontWeight: 700, color: "#fff", letterSpacing: 1}}>
                  {fmtNum(balance)}
                </span>
                <span style={{fontSize: 18, fontWeight: 600, color: "#fff", paddingBottom: 5}} data-i18n="GBP">{currency || ""}</span>
              </div>
              <div style={{color: "#fff", fontSize: 14, marginTop: 7}} data-i18n="You will receive your withdrawal within an hour">
                You will receive your withdrawal within an hour
              </div>
            </div>
          </div>

          {/* Withdraw Form */}
          <form
            onSubmit={handleWithdraw}
            autoComplete="off"
            style={{
              margin: "0 auto",
              marginBottom: 0,
              maxWidth: maxCardWidth,
              width: "95%",
              borderRadius: 13,
              background: "#fff",
              boxShadow: "0 4px 12px 0 rgba(0,0,0,.08)",
              padding: 24,
              display: "flex",
              flexDirection: "column",
              gap: 18
            }}
          >
            <div>
              <label style={{display: "block", color: "#222", fontWeight: 700, marginBottom: 8, fontSize: 16}} data-i18n="Withdraw Amount">
                Withdraw Amount
              </label>
              <input
                type="number"
                min="1"
                step="any"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                style={{
                  width: "100%",
                  padding: "14px 16px",
                  borderRadius: 7,
                  background: "#eaf2fb",
                  border: "none",
                  fontSize: 18,
                  color: "#222",
                  marginBottom: 0
                }}
                placeholder="Withdraw Amount"
                data-i18n-placeholder="Withdraw Amount"
                required
              />
            </div>
            <div>
              <label style={{display: "block", color: "#222", fontWeight: 700, marginBottom: 8, fontSize: 16}} data-i18n="Withdrawal Password">
                Withdrawal Password
              </label>
              <input
                type="password"
                value={withdrawPassword}
                onChange={e => setWithdrawPassword(e.target.value)}
                style={{
                  width: "100%",
                  padding: "14px 16px",
                  borderRadius: 7,
                  background: "#eaf2fb",
                  border: "none",
                  fontSize: 18,
                  color: "#222",
                  marginBottom: 0
                }}
                placeholder="Withdrawal Password"
                data-i18n-placeholder="Withdrawal Password"
                required
              />
            </div>
            <button
              type="submit"
              style={{
                width: "100%",
                background: "#2196d6",
                color: "#fff",
                fontWeight: 500,
                fontSize: 20,
                borderRadius: 7,
                border: "none",
                padding: "13px 0",
                marginTop: 8,
                transition: "background 0.2s",
                cursor: "pointer"
              }}
            >
              <span data-i18n="Withdraw">Withdraw</span>
            </button>
            {message && (
              <div style={{textAlign: "center", marginTop: 6, fontSize: 15, color: "#d9534f"}}>{message}</div>
            )}
          </form>
        </>
      ) : (
        // History Tab
        <div style={{marginTop: 30, width: "100%", maxWidth: maxCardWidth, marginLeft: "auto", marginRight: "auto"}}>
          {/* History Subtabs */}
          <div style={{
            display: "flex",
            border: "1px solid #2196d6",
            borderRadius: 3,
            marginBottom: 25,
            overflow: "hidden"
          }}>
            {["reviewing", "success", "reject"].map(type => (
              <button
                key={type}
                style={{
                  flex: 1,
                  padding: "13px 0",
                  fontWeight: 600,
                  fontSize: 18,
                  background: historyTab === type ? "#2196d6" : "#fff",
                  color: historyTab === type ? "#fff" : "#2196d6",
                  outline: "none",
                  border: "none",
                  borderRight: type !== "reject" ? "1px solid #2196d6" : "none",
                  transition: "background 0.2s"
                }}
                onClick={() => setHistoryTab(type)}
              >
                {type === "reviewing" ? (
                  <span data-i18n="Reviewing">Reviewing</span>
                ) : type === "success" ? (
                  <span data-i18n="Completed">Completed</span>
                ) : (
                  <span data-i18n="Reject">Reject</span>
                )}
              </button>
            ))}
          </div>
          {/* Filtered Withdrawals */}
          {loading ? (
            <p style={{textAlign: "center", fontSize: 16, color: "#888", marginTop: 30}} data-i18n="Loading...">Loading...</p>
          ) : filteredWithdrawals.length === 0 ? (
            <p style={{textAlign: "center", fontSize: 16, color: "#888", marginTop: 30}} data-i18n="No more data...">No more data...</p>
          ) : (
            <div style={{display: "flex", flexDirection: "column", gap: 16}}>
              {filteredWithdrawals
                .slice()
                .reverse()
                .map((item, index) => {
                  const amt = fmtNum(item.amount);
                  return (
                    <div
                      key={index}
                      style={{
                        background: "#fff",
                        boxShadow: "0 4px 12px 0 rgba(0,0,0,.07)",
                        borderRadius: 8,
                        padding: "18px 22px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between"
                      }}
                    >
                      <div>
                        <div style={{fontWeight: 700, fontSize: 18, color: "#222"}}>
                          <span style={{ color: BLACK_BG, fontWeight: 700 }}>{currency || ""}</span>{" "}
                          <span style={{ color: START_BLUE }}>{amt}</span>
                        </div>
                        <div style={{fontSize: 14, color: "#888", marginTop: 2}}>
                          {item.createdAt
                            ? new Date(item.createdAt).toLocaleString()
                            : item.date || ""}
                        </div>
                      </div>
                      <div style={{
                        fontWeight: 600,
                        fontSize: 16,
                        color:
                          normalizeStatus(item.status) === "success"
                            ? "#18a93c"
                            : normalizeStatus(item.status) === "reject"
                            ? "#d9534f"
                            : "#2196d6",
                        textTransform: "capitalize"
                      }}>
                        {/* Show "Completed" instead of "Approved" */}
                        {normalizeStatus(item.status) === "success" ? (
                          <span data-i18n="Completed">Completed</span>
                        ) : (
                          // If item.status exists, show the raw status (server-provided); otherwise show localized "Reviewing"
                          item.status ? (
                            <span>{item.status}</span>
                          ) : (
                            <span data-i18n="Reviewing">Reviewing</span>
                          )
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
