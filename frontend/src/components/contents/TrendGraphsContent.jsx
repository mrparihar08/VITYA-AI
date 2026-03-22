import React, { useEffect, useState } from "react";
import axios from "axios";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
} from "recharts";

// ✅ stable constant (no warning)
const API_URL =
  process.env.REACT_APP_API_URL || "https://vitya-ai-qlbn.onrender.com";

export default function TrendGraphs() {
  const [token, setToken] = useState("");
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  // token load
  useEffect(() => {
    const savedToken = localStorage.getItem("token");
    if (savedToken) setToken(savedToken);
  }, []);

  // fetch data
  useEffect(() => {
    if (!token) return;

    const fetchTrend = async () => {
      try {
        const res = await axios.get(
          `${API_URL}/api/vitya/expense_income_trend`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        const income = res.data.income || [];
        const expense = res.data.expense || [];

        // merge income + expense by month
        const merged = {};

        income.forEach((i) => {
          merged[i.month] = {
            month: formatMonth(i.month),
            income: i.amount,
            expense: 0,
          };
        });

        expense.forEach((e) => {
          if (merged[e.month]) {
            merged[e.month].expense = e.amount;
          } else {
            merged[e.month] = {
              month: formatMonth(e.month),
              income: 0,
              expense: e.amount,
            };
          }
        });

        // sort by date (important for chart)
        const sortedData = Object.values(merged).sort(
          (a, b) => new Date(a.month) - new Date(b.month)
        );

        setData(sortedData);

      } catch (err) {
        console.log(err);
      } finally {
        setLoading(false);
      }
    };

    fetchTrend();
  }, [token]); // ✅ no warning now

  // ✅ format month (better UI)
  const formatMonth = (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-IN", {
      month: "short",
      year: "numeric",
    });
  };

  return (
    <div className="card graph-card">
      <h1 className="h1-title">Income vs Expense Trend</h1>

      {loading && <p>Loading...</p>}

      {!loading && data.length > 0 && (
        <ResponsiveContainer width="100%" height={400}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip />
            <Legend />

            <Line type="monotone" dataKey="income" stroke="#00c853" />
            <Line type="monotone" dataKey="expense" stroke="#ff1744" />
          </LineChart>
        </ResponsiveContainer>
      )}

      {!loading && data.length === 0 && <p>No data available</p>}
    </div>
  );
}