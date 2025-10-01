import { useState, useEffect } from 'react';
import axios from 'axios';

export default function SpleshScreen() {
  const [token, setToken] = useState('');

  const [IncomeAmount, setIncomeAmount] = useState('');
  const [IncomeSource, setIncomeSource] = useState('');
  const [IncomeCity, setIncomeCity] = useState('');
  const [IncomeDate, setIncomeDate] = useState(getCurrentDate());

  const API_URL = process.env.REACT_APP_API_URL || 'https://vitya-ai-qlbn.onrender.com';

  // Load token from localStorage
  useEffect(() => {
    const savedToken = localStorage.getItem('token');
    if (savedToken) setToken(savedToken);
  }, []);

  // Axios instance with auth token
  const axiosAuth = axios.create({
    baseURL: API_URL,
    headers: { 'Content-Type': 'application/json' },
  });

  axiosAuth.interceptors.request.use((config) => {
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  });

  const postWithAuth = async (endpoint, data, successMessage) => {
    if (!token) return alert('Please login first.');
    try {
      const res = await axiosAuth.post(endpoint, data);
      alert(res.data.message || successMessage);

      // Clear form on success
      setIncomeAmount('');
      setIncomeSource('');
      setIncomeCity('');
      setIncomeDate(getCurrentDate());
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.error || 'An error occurred.');
    }
  };

  const handleSetIncome = () => {
    if (!IncomeAmount || IncomeAmount <= 0) return alert('Please enter a valid amount.');
    postWithAuth(
      '/api/incomes',
      {
        amount: parseFloat(IncomeAmount),
        source: IncomeSource,
        city: IncomeCity,
        date: IncomeDate,
      },
      'Income added successfully!'
    );
  };

  function getCurrentDate() {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  return (
    <div className="app-container">
      <h1 className="main-title">VITYA-AI</h1>

      <div className="flex-row">
        <div className="card form-card">
          <h2>Income</h2>
          <label>Amount:</label>
          <input type="number" placeholder="Amount" value={IncomeAmount} onChange={(e) => setIncomeAmount(e.target.value)} />

          <label>Source:</label>
          <input type="text" placeholder="Source" value={IncomeSource} onChange={(e) => setIncomeSource(e.target.value)} />

          <label>City:</label>
          <input type="text" placeholder="City" value={IncomeCity} onChange={(e) => setIncomeCity(e.target.value)} />

          <label>Date:</label>
          <input type="date" value={IncomeDate} onChange={(e) => setIncomeDate(e.target.value)} />

          <button onClick={handleSetIncome}>Set Income</button>
        </div>
      </div>
    </div>
  );
}
