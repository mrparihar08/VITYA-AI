import { useEffect, useState } from "react";
import axios from "axios";

export default function AIAnalytics() {

  const [token, setToken] = useState("");
  const [category, setCategory] = useState("");
  const [waste, setWaste] = useState([]);
  const [budget, setBudget] = useState(null);
  const [trend, setTrend] = useState([]);

  const API_URL =
    process.env.REACT_APP_API_URL || "http://127.0.0.1:8000";

  // Load token
  useEffect(() => {
    const savedToken = localStorage.getItem("token");
    if (savedToken) setToken(savedToken);
  }, []);

  const authHeaders = () => ({
    headers: { Authorization: `Bearer ${token}` },
  });

  // Waste Analysis
  const getWasteAnalysis = async () => {
    try {
      const res = await axios.get(
        `${API_URL}/ai/waste-analysis`,
        authHeaders()
      );
      setWaste(res.data);
    } catch (err) {
      console.log("Waste analysis error");
    }
  };

  // Budget Plan
  const getBudgetPlan = async () => {
    try {
      const res = await axios.get(
        `${API_URL}/ai/budget-plan`,
        authHeaders()
      );
      setBudget(res.data);
    } catch (err) {
      console.log("Budget error");
    }
  };

  // Monthly Trend
  const getMonthlyTrend = async () => {
    try {
      const res = await axios.get(
        `${API_URL}/ai/monthly-trend`,
        authHeaders()
      );
      setTrend(res.data);
    } catch (err) {
      console.log("Trend error");
    }
  };

  

  // Refresh all data
  const refreshData = () => {
    if (!token) return;

    getWasteAnalysis();
    getBudgetPlan();
    getMonthlyTrend();
  };

  // Auto load + refresh every 30 seconds
  useEffect(() => {

    refreshData();

    const interval = setInterval(() => {
      refreshData();
    }, 30000);

    return () => clearInterval(interval);

  }, [token, category]);

  return (
    <div className="card">

      <h1>AI Analytics</h1>
      {/* Waste Analysis */}
      {waste.length > 0 && (
        <div>
          <h2>|| Waste Analysis ||</h2>
          {waste.map((item, i) => (
            <div key={i}>
              {item.category} : ₹{item.total_spent} ({item.status})
            </div>
          ))}
        </div>
      )}

      {/* Budget Plan */}
      {budget && (
        <div>
          <h2>|| Budget Plan ||</h2>
          <p>Total Income: ₹{budget.total_income}</p>
          <p>Savings: ₹{budget.suggested_savings}</p>

          {budget.budget_plan.map((b, i) => (
            <div key={i}>
              {b.category} → Suggested Budget ₹{b.suggested_budget}
            </div>
          ))}
        </div>
      )}

      {/* Monthly Trend */}
      {trend.length > 0 && (
        <div>
          <h2>|| Monthly Trend ||</h2>
          {trend.map((t, i) => (
            <div key={i}>
              {t.month} : ₹{t.total_expense}
            </div>
          ))}
        </div>
      )}

    </div>
  );
}