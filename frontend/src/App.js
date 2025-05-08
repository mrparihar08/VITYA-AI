import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';

function App() {
  const [token, setToken] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [IncomeAmount, setIncomeAmount] = useState('');
  const [IncomeSource, setIncomeSource] = useState('');
  const [IncomeCity, setIncomeCity] = useState('');
  const [IncomeDate, setIncomeDate] = useState(getCurrentDate());
  const [expenseAmount, setExpenseAmount] = useState('');
  const [expenseDescription, setExpenseDescription] = useState('');
  const [expenseCategory, setExpenseCategory] = useState('');
  const [expenseDate, setExpenseDate] = useState(getCurrentDate());
  const [expensepayment_type, setExpensePaymentType] = useState('');
  const [financialOverview, setFinancialOverview] = useState(null);
  const [advice, setAdvice] = useState([]);
  const [graphBase64, setGraphBase64] = useState('');
  const [incomeGraph64, setIncomeGraph64] = useState('');
  const [expenseGraph64, setExpenseGraph64] = useState('');

  const API_URL = process.env.REACT_APP_API_URL || `https://vitya-ai-qlbn.onrender.com`;

  // Axios instance with auth token
  const axiosAuth = axios.create({
    baseURL: API_URL,
    headers: {
      'Content-Type': 'application/json',
    },
  });

  axiosAuth.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  });

  useEffect(() => {
    const savedToken = localStorage.getItem('token');
    if (savedToken) setToken(savedToken);
  }, []);

  useEffect(() => {
    if (token) localStorage.setItem('token', token);
  }, [token]);

  const handleRegister = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post(
        `${API_URL}/api/register`,
        { username, email, password },
        { headers: { 'Content-Type': 'application/json' } }
      );
      alert(res.data.message);
    } catch (err) {
      alert(err.response?.data?.error || err.response?.data?.message || 'Registration failed');
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post(
        `${API_URL}/api/login`,
        { username: loginUsername, password: loginPassword },
        { headers: { 'Content-Type': 'application/json' } }
      );

      if (res.data.token) {
        setToken(res.data.token);
        alert('Login successful!');
      }
    } catch (err) {
      alert(err.response?.data?.error || 'Login failed');
    }
  };

  const handleLogout = () => {
    setToken('');
    localStorage.removeItem('token');
    alert('Logged out successfully!');
  };

  const postWithAuth = async (endpoint, data, successMessage) => {
    if (!token) return alert('Please login first.');
    try {
      const res = await axiosAuth.post(endpoint, data);
      alert(res.data.message || successMessage);
    } catch (err) {
      console.error(err);
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

  const handleAddExpense = () => {
    postWithAuth('/api/expenses', {
      amount: parseFloat(expenseAmount),
      description: expenseDescription,
      category: expenseCategory || undefined,
      date: expenseDate,
      payment_type: expensepayment_type,
    }, 'Expense added successfully!');
  };

  const handleGetOverview = async () => {
    try {
      const res = await axiosAuth.get('/api/analytics_overview');
      setFinancialOverview(res.data);
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.error || 'Error fetching overview');
    }
  };

  const handleGetAdvice = async () => {
    try {
      const res = await axiosAuth.get('/api/advice');
      setAdvice(res.data.recommendations?.length > 0 ? res.data.recommendations : []);
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.error || 'Error getting advice');
    }
  };

  const handleGetGraph = async () => {
    try {
      const res = await axiosAuth.get('/api/expenses/graph');
      setGraphBase64(res.data.graph || '');
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.error || 'Error fetching graph');
    }
  };

  const handleGetGraphTrend = async () => {
    try {
      const res = await axiosAuth.get('/api/expenses_income_trend');
      setIncomeGraph64(res.data.income_graph || '');
      setExpenseGraph64(res.data.expense_graph || '');
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.error || 'Error fetching trend graphs');
    }
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
      <main className="main-content">
        <h1 className="main-title">VITYA-AI</h1>

        {/* Registration and Login */}
        <div className="flex-row">
          <div className="card form-card">
            <h2>Register</h2>
            <form onSubmit={handleRegister}>
              <input type="text" placeholder="Username" value={username}
                onChange={(e) => setUsername(e.target.value)} required />
              <input type="email" placeholder="Email" value={email}
                onChange={(e) => setEmail(e.target.value)} required />
              <input type="password" placeholder="Password" value={password}
                onChange={(e) => setPassword(e.target.value)} required />
              <button type="submit">Register</button>
            </form>
          </div>

          <div className="card form-card">
            <h2>Login</h2>
            <form onSubmit={handleLogin}>
              <input type="text" placeholder="Username" value={loginUsername}
                onChange={(e) => setLoginUsername(e.target.value)} required />
              <input type="password" placeholder="Password" value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)} required />
              <button type="submit">Login</button>
              {token && <button type="button" onClick={handleLogout} style={{ marginLeft: '10px' }}>Logout</button>}
            </form>
          </div>
        </div>

        {/* Income and Expense Entry */}
        <div className="flex-row">
          <div className="card form-card">
            <h2>Income</h2>
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
            <button onClick={handleSetIncome}>Set Income</button>
          </div>

          <div className="card form-card">
            <h2>Add Expense</h2>
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
            <button onClick={handleAddExpense}>Add Expense</button>
          </div>
        </div>
      {/* Overview and Graphs */}
      <div className="flex-row">
        <div className="card overview-card">
          <h2>Financial Overview</h2>
          <button onClick={handleGetOverview}>Get Overview</button>
          {financialOverview && (
            <div className="overview-grid">
              <p><strong>Total Income:</strong> ₹{financialOverview.total_income}</p>
              <p><strong>Total Expenses:</strong> ₹{financialOverview.total_expenses}</p>
              <p><strong>Available Balance:</strong> ₹{financialOverview.available_balance}</p>
              <div>
                <strong>Expense Breakdown:</strong>
                <ul>
                  {Object.entries(financialOverview.expense_distribution || {}).map(([category, amount]) => (
                    <li key={category}>{category}: ₹{amount}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>
          <div className="card graph-card">
            <h2>Expense Graph</h2>
            <button onClick={handleGetGraph}>Graph</button>
            {graphBase64 && <img src={`data:image/png;base64,${graphBase64}`} alt="Expense Graph" />}
          </div>
        </div>

        {/* Trend Graphs */}
        <div className="card graph-card">
          <h2>Expenses & Income Trend</h2>
          <button onClick={handleGetGraphTrend}>View Trend</button>
          {incomeGraph64 && <div><h3>Income Trend</h3><img src={`data:image/png;base64,${incomeGraph64}`} alt="Income Trend" /></div>}
          {expenseGraph64 && <div><h3>Expense Trend</h3><img src={`data:image/png;base64,${expenseGraph64}`} alt="Expense Trend" /></div>}
        </div>

        {/* Advice Section */}
        <div className="card advice-card">
          <h2>Expense Advice</h2>
          <button onClick={handleGetAdvice}>Advice</button>
          {advice.length > 0 && (
            <div className="advice-grid">
              <h3>Advice:</h3>
              {advice.map((rec, idx) => (
                <div key={idx} className="advice-item">
                  <span className="category">{rec.category}:</span>
                  <span className="value">{rec.advice || 'No advice'}</span>
                  <span className="prediction">(Predicted: {rec.predicted_next_month?.toFixed(2) ?? 'N/A'})</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default App;
