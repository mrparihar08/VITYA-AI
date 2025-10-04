import React, { useState, useEffect } from 'react';
import axios from 'axios';

export default function TrendGraphs() {
  const [token, setToken] = useState('');
  const [incomeGraph64, setIncomeGraph64] = useState('');
  const [expenseGraph64, setExpenseGraph64] = useState('');

  const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";

  useEffect(() => {
    const savedToken = localStorage.getItem('token');
    if (savedToken) setToken(savedToken);
  }, []);

  const authHeaders = () => ({ headers: { Authorization: `Bearer ${token}` } });

  const handleGetGraphTrend = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/expenses_income_trend`, authHeaders());
      setIncomeGraph64(res.data.income_graph || '');
      setExpenseGraph64(res.data.expense_graph || '');
    } catch (err) {
      alert(err.response?.data?.error || 'Error fetching trend graphs');
    }
  };

  return (
    <div className="card graph-card">
      <h2>Expenses And Income Trend</h2>
      <button className='button-8b' onClick={handleGetGraphTrend}>View Trend</button>

      {incomeGraph64 && <div><h3>Income Trend</h3><img src={`data:image/png;base64,${incomeGraph64}`} alt="Income Trend" /></div>}
      {expenseGraph64 && <div><h3>Expense Trend</h3><img src={`data:image/png;base64,${expenseGraph64}`} alt="Expense Trend" /></div>}
    </div>
  );
}
