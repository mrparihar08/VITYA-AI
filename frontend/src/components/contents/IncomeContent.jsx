import React, { useState, useEffect } from 'react';
import axios from 'axios';

export default function Income() {
  const [token, setToken] = useState('');

  const [IncomeAmount, setIncomeAmount] = useState('');
  const [IncomeSource, setIncomeSource] = useState('');
  const [IncomeCity, setIncomeCity] = useState('');
  const [IncomeDate, setIncomeDate] = useState(getCurrentDate());
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

  const handleSetIncome = () => {
    postWithAuth('/api/incomes', {
      amount: parseFloat(IncomeAmount),
      source: IncomeSource,
      city: IncomeCity,
      date: IncomeDate,
    }, 'Income added successfully!');
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

  const viewIncome = ()=>{
    handleSetIncome();
    getOverview();
  };

  return (
       <div className="form-card- income-add">
        <h2 className="main-title">Income</h2>
              
                <label>Amount:</label>
                <input type="number" placeholder="Amount" value={IncomeAmount}
                  onChange={(e) => setIncomeAmount(e.target.value)} />
                <label>Source:</label>
                <input type="text" placeholder="Source" value={IncomeSource}
                  onChange={(e) => setIncomeSource(e.target.value)} />
                <label>City:</label>
                <input type="text" placeholder="City" value={IncomeCity}
                  onChange={(e) => setIncomeCity(e.target.value)} />
                <label>Date:</label>
                <input type="date" value={IncomeDate}
                  onChange={(e) => setIncomeDate(e.target.value)} />
                <button  className="btn-income" onClick={viewIncome}>Set Income</button>
            <div className="overview income-ov">
               {overview && (
            <div>
              <p>Total Income: ₹{overview.total_income}</p>
              <p>Available Balance: ₹{overview.available_balance}</p>
            </div>
          )}
            </div>
    </div>
  );
}
