import { useEffect, useState } from "react";
import axios from "axios";

export default function AIAnalytics() {

  const [token, setToken] = useState("");
  const [waste, setWaste] = useState([]);
  const [budget, setBudget] = useState(null);
  const [trend, setTrend] = useState([]);

  const API_URL =
    process.env.REACT_APP_API_URL || "https://vitya-ai-qlbn.onrender.com";

  useEffect(() => {
    const savedToken = localStorage.getItem("token");
    if (savedToken) setToken(savedToken);
  }, []);

  const authHeaders = () => ({
    headers: { Authorization: `Bearer ${token}` },
  });

  // ---------------- API CALLS ---------------- //

  const getWasteAnalysis = async () => {
    try {
      const res = await axios.get(
        `${API_URL}/api/ai/waste-analysis`,
        authHeaders()
      );
      setWaste(res.data);
    } catch {
      console.log("Waste error");
    }
  };

  const getBudgetPlan = async () => {
    try {
      const res = await axios.get(
        `${API_URL}/api/ai/budget-plan`,
        authHeaders()
      );
      setBudget(res.data);
    } catch {
      console.log("Budget error");
    }
  };

  const getMonthlyTrend = async () => {
    try {
      const res = await axios.get(
        `${API_URL}/api/ai/monthly-trend`,
        authHeaders()
      );
      setTrend(res.data);
    } catch {
      console.log("Trend error");
    }
  };

  const refreshData = () => {
    if (!token) return;
    getWasteAnalysis();
    getBudgetPlan();
    getMonthlyTrend();
  };

  useEffect(() => {
    refreshData();

    const interval = setInterval(refreshData, 30000);
    return () => clearInterval(interval);

  }, [token]);

  // ---------------- HELPERS ---------------- //

  const formatMonth = (m) => {
    const d = new Date(m);
    return d.toLocaleDateString("en-IN", {
      month: "short",
      year: "numeric",
    });
  };

  // ---------------- UI ---------------- //

  return (
    <div className="card">

      <h1>AI Analytics</h1>

      {/* ---------------- WASTE ---------------- */}
      {waste.length > 0 && (
        <div>
          <h2>📊 Waste Analysis</h2>
          {waste.map((item, i) => (
            <div key={i}>
              {item.category} → ₹{item.total_spent} ({item.status})
            </div>
          ))}
        </div>
      )}

      {/* ---------------- BUDGET ---------------- */}
      {budget && (
        <div>
          <h2>💰 Budget Plan</h2>

          <p>Total Income: ₹{budget.summary.total_income}</p>
          <p>Savings: ₹{budget.summary.suggested_savings}</p>
          <p>Usable: ₹{budget.summary.usable_funds}</p>

          {budget.budget_plan.map((b, i) => (
            <div key={i}>
              {b.category} → ₹{b.suggested_budget} ({b.status})
            </div>
          ))}
        </div>
      )}

      {/* ---------------- TREND ---------------- */}
      {trend.length > 0 && (
        <div>
          <h2>📈 Monthly Trend</h2>

          {trend.map((t, i) => (
            <div key={i}>
              {formatMonth(t.month)} → ₹{t.amount}
            </div>
          ))}
        </div>
      )}

    </div>
  );
}