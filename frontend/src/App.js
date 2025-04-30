import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';

function App() {
  const [token, setToken] = useState('');
  const [registerData, setRegisterData] = useState({ username: '', email: '', password: '' });
  const [loginData, setLoginData] = useState({ username: '', password: '' });
  const [incomeData, setIncomeData] = useState({ amount: '', source: '', city: '', date: '' });
  const [expenseData, setExpenseData] = useState({ amount: '', category: '', payment_type: '', description: '', date: '' });
  const [financialOverview, setFinancialOverview] = useState(null);
  const [advice, setAdvice] = useState([]);
  const [graphBase64, setGraphBase64] = useState('');
  const [incomeGraph64, setIncomeGraph64] = useState('');
  const [expenseGraph64, setExpenseGraph64] = useState('');

  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

  useEffect(() => {
    const savedToken = localStorage.getItem('token');
    if (savedToken) setToken(savedToken);
  }, []);

  useEffect(() => {
    if (token) localStorage.setItem('token', token);
  }, [token]);

  const authHeaders = () => ({ headers: { Authorization: `Bearer ${token}` } });

  const handleRegister = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post(`${API_URL}/api/register`, registerData);
      alert(res.data.message);
    } catch (err) {
      alert(err.response?.data?.error || 'Registration failed');
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post(`${API_URL}/api/login`, loginData);
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
      const res = await axios.post(`${API_URL}${endpoint}`, data, authHeaders());
      alert(res.data.message || successMessage);
    } catch (err) {
      alert(err.response?.data?.error || 'An error occurred.');
    }
  };

  const handleSetIncome = () => {
    postWithAuth('/api/incomes', {
      amount: parseFloat(incomeData.amount),
      source: incomeData.source,
      city: incomeData.city,
      date: incomeData.date,
    }, 'Income added successfully!');
  };

  const handleAddExpense = () => {
    postWithAuth('/api/expenses', {
      amount: parseFloat(expenseData.amount),
      category: expenseData.category,
      payment_type: expenseData.payment_type,
      description: expenseData.description,
      date: expenseData.date,
    }, 'Expense added successfully!');
  };

  const handleGetOverview = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/analytics_overview`, authHeaders());
      setFinancialOverview(res.data);
    } catch (err) {
      alert(err.response?.data?.error || 'Error fetching overview');
    }
  };

  const handleGetAdvice = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/advice`, authHeaders());
      if (res.data.recommendations?.length > 0) setAdvice(res.data.recommendations);
      else setAdvice([]);
    } catch (err) {
      alert(err.response?.data?.error || 'Error getting advice');
    }
  };

  const handleGetGraph = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/expenses/graph`, authHeaders());
      setGraphBase64(res.data.graph || '');
    } catch (err) {
      alert(err.response?.data?.error || 'Error fetching graph');
    }
  };

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
    <div className="app-container">
      <main className="main-content">
        <h1 className="main-title">VITYA-AI</h1>

        {/* Registration and Login */}
        <div className="flex-row">
          <div className="card form-card">
            <h2>Register</h2>
            <form onSubmit={handleRegister}>
              <input type="text" placeholder="Username" value={registerData.username}
                onChange={(e) => setRegisterData({ ...registerData, username: e.target.value })} required />
              <input type="email" placeholder="Email" value={registerData.email}
                onChange={(e) => setRegisterData({ ...registerData, email: e.target.value })} required />
              <input type="password" placeholder="Password" value={registerData.password}
                onChange={(e) => setRegisterData({ ...registerData, password: e.target.value })} required />
              <button type="submit">Register</button>
            </form>
          </div>

          <div className="card form-card">
            <h2>Login</h2>
            <form onSubmit={handleLogin}>
              <input type="text" placeholder="Username" value={loginData.username}
                onChange={(e) => setLoginData({ ...loginData, username: e.target.value })} required />
              <input type="password" placeholder="Password" value={loginData.password}
                onChange={(e) => setLoginData({ ...loginData, password: e.target.value })} required />
              <button type="submit">Login</button>
              {token && <button type="button" onClick={handleLogout} style={{ marginLeft: '10px' }}>Logout</button>}
            </form>
          </div>
        </div>

        {/* Income and Expense Entry */}
        <div className="flex-row">
          <div className="card form-card">
            <h2>Income</h2>
            <p className="small-note">Salary can be added once a month, and other income as needed.</p>
            <input type="number" placeholder="Amount" value={incomeData.amount}
              onChange={(e) => setIncomeData({ ...incomeData, amount: e.target.value })} />
            <input type="text" placeholder="Source" value={incomeData.source}
              onChange={(e) => setIncomeData({ ...incomeData, source: e.target.value })} />
            <input type="text" placeholder="City" value={incomeData.city}
              onChange={(e) => setIncomeData({ ...incomeData, city: e.target.value })} />
            <input type="date" value={incomeData.date}
              onChange={(e) => setIncomeData({ ...incomeData, date: e.target.value })} />
            <button onClick={handleSetIncome}>Set Income</button>
          </div>

          <div className="card form-card">
            <h2>Add Expense</h2>
            <input type="number" placeholder="Amount" value={expenseData.amount}
              onChange={(e) => setExpenseData({ ...expenseData, amount: e.target.value })} />
            <input type="text" placeholder="Category" value={expenseData.category}
              onChange={(e) => setExpenseData({ ...expenseData, category: e.target.value })} />
            <input type="text" placeholder="Payment Type" value={expenseData.payment_type}
              onChange={(e) => setExpenseData({ ...expenseData, payment_type: e.target.value })} />
            <input type="text" placeholder="Description" value={expenseData.description}
              onChange={(e) => setExpenseData({ ...expenseData, description: e.target.value })} />
            <input type="date" value={expenseData.date}
              onChange={(e) => setExpenseData({ ...expenseData, date: e.target.value })} />
            <button onClick={handleAddExpense}>Add Expense</button>
          </div>
        </div>

        {/* Overview and Graphs */}
        <div className="flex-row">
          <div className="card overview-card">
            <h2>Financial Overview</h2>
            <button onClick={handleGetOverview}>Get Overview</button>
            {financialOverview && <pre className="json-output">{JSON.stringify(financialOverview, null, 2)}</pre>}
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
          <h2 className="text-xl font-semibold mb-4">Expense Advice</h2>
          <button className="fetch-button" onClick={handleGetAdvice}>Advice</button>
          {advice.length > 0 && (
            <div className="advice-grid">
              <h3 className="font-bold mb-2">Advice:</h3>
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
