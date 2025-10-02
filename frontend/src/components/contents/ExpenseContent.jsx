import React, { useState, useEffect } from 'react';
import axios from 'axios';

export default function Expense() {
  const [token, setToken] = useState('');

  const [expenseAmount, setExpenseAmount] = useState('');
  const [expenseDescription, setExpenseDescription] = useState('');
  const [expenseCategory, setExpenseCategory] = useState('');
  const [expenseDate, setExpenseDate] = useState(getCurrentDate());
  const [expensepayment_type, setExpensePaymentType] = useState('');
  const [overview, setOverview] = useState(null);

  const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";

  useEffect(() => {
    const savedToken = localStorage.getItem('token');
    if (savedToken) setToken(savedToken);
  }, []);

  useEffect(() => {
    if (token) localStorage.setItem('token', token);
  }, [token]);

  const authHeaders = () => ({ headers: { Authorization: `Bearer ${token}` } });

  const postWithAuth = async (endpoint, data, successMessage) => {
    if (!token) return alert('Please login first.');
    try {
      const res = await axios.post(`${API_URL}${endpoint}`, data, authHeaders());
      alert(res.data.message || successMessage);
    } catch (err) {
      alert(err.response?.data?.error || 'An error occurred.');
    }
  };
  const handleAddExpense = () => {
    postWithAuth('/api/expenses', {
      amount: parseFloat(expenseAmount),
      description: expenseDescription,
      category: expenseCategory || undefined,
      date: expenseDate,
      payment_type: expensepayment_type,
    }, 'Expense added successfully!');
  };
  function getCurrentDate() {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
    const getOverview = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/analytics_overview`, authHeaders());
      setOverview(res.data);
    } catch (err) {
      alert(err.response?.data?.error || 'Error fetching overview');
    }
  };
  const viewExpense = ()=>{
    handleAddExpense();
    getOverview();
  };
  return (
            <div className="form-card- expense-add">
              <h2 className="main-title">Expense</h2>
                <label>Amount:</label>
                <input type="number" placeholder="Amount" value={expenseAmount}
                  onChange={(e) => setExpenseAmount(e.target.value)} />
                <label>Category:</label>
                <input type="text" placeholder="Category" value={expenseCategory}
                  onChange={(e) => setExpenseCategory(e.target.value)} />
                <label>Payment Type:</label>
                <input type="text" placeholder="Payment Type" value={expensepayment_type}
                  onChange={(e) => setExpensePaymentType(e.target.value)} />
                <label>Description:</label>
                <input type="text" placeholder="Description" value={expenseDescription}
                  onChange={(e) => setExpenseDescription(e.target.value)} />
                <label>Date:</label>
                <input type="date" value={expenseDate}
                  onChange={(e) => setExpenseDate(e.target.value)} />
                <button className="btn-expense" onClick={viewExpense}>Add Expense</button>
            
            <div className="overview expense-ov">
               {overview && (
            <div>
              <p>Total Expenses: ₹{overview.total_expenses}</p>
              <p>Available Balance: ₹{overview.available_balance}</p>
              <strong>Expense Breakdown:</strong>
              <ul>
                {Object.entries(overview.expense_distribution || {}).map(([cat, val]) => (
                  <li key={cat}>{cat}: ₹{val}</li>
                ))}
              </ul>
            </div>
          )}
            </div>
    </div>
  );
}
