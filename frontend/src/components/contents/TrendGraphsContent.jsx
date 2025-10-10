import React, { useState, useEffect } from 'react';
import axios from 'axios';

export default function TrendGraphs() {
  const [token, setToken] = useState('');
  const [incomeGraph64, setIncomeGraph64] = useState('');
  const [expenseGraph64, setExpenseGraph64] = useState('');
  const [loading, setLoading] = useState(false);

  const API_URL = process.env.REACT_APP_API_URL || "https://vitya-ai-qlbn.onrender.com";

  useEffect(() => {
    const savedToken = localStorage.getItem('token');
    if (savedToken) setToken(savedToken);
  }, []);

  const authHeaders = () => ({ headers: { Authorization: `Bearer ${token}` } });

  const handleGetGraphTrend = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await axios.get(`${API_URL}/api/expenses_income_trend`, authHeaders());
      setIncomeGraph64(res.data.income_graph || '');
      setExpenseGraph64(res.data.expense_graph || '');
    } catch (err) {
      alert(err.response?.data?.error || 'Error fetching trend graphs');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card graph-card">
      <h1 className="h1-title">Expenses And Income Trend</h1>

      <button className="button-8b" onClick={handleGetGraphTrend} disabled={loading}>
        {loading ? 'Loading...' : 'View Trend'}
      </button>

      {incomeGraph64 && (
        <div className="graph-section">
          <h3>Income Trend</h3>
          <img src={`data:image/png;base64,${incomeGraph64}`} alt="Income Trend" />
        </div>
      )}

      {expenseGraph64 && (
        <div className="graph-section">
          <h3>Expense Trend</h3>
          <img src={`data:image/png;base64,${expenseGraph64}`} alt="Expense Trend" />
        </div>
      )}
    </div>
  );
}
