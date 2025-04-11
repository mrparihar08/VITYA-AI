import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';

function App() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [token, setToken] = useState('');
  const [IncomeAmount, setIncomeAmount] = useState('');
  const [IncomeSource, setIncomeSource] = useState('');
  const [IncomeCity, setIncomeCity] = useState('');
  const [IncomeDate, setIncomeDate] = useState('');
  const [expenseAmount, setExpenseAmount] = useState('');
  const [expenseDescription, setExpenseDescription] = useState('');
  const [expenseCategory, setExpenseCategory] = useState('');
  const [expenseDate, setExpenseDate] = useState('');
  const [expensepayment_type, setExpensepayment_type] = useState('');
  const [financialOverview, setFinancialOverview] = useState(null);
  const [advice, setAdvice] = useState([]);
  const [graphBase64, setGraphBase64] = useState('');
  const [graphTrend64, setGraphTrend64] = useState('');

  const [taxData, setTaxData] = useState(null);
  const [investmentData, setInvestmentData] = useState(null);
  const [riskProfile, setRiskProfile] = useState('medium');

  const API_URL = 'http://127.0.0.1:5000';

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
      const res = await axios.post(`${API_URL}/api/register`, { username, email, password });
      alert(res.data.message);
    } catch (err) {
      alert(err.response?.data?.error || 'Registration failed');
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post(`${API_URL}/api/login`, { username: loginUsername, password: loginPassword });
      if (res.data.token) {
        setToken(res.data.token);
        alert('Login successful!');
      }
    } catch (err) {
      alert(err.response?.data?.error || 'Login failed');
    }
  };

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

  const handleSetIncome = () => postWithAuth('/api/incomes', {
    amount: parseFloat(IncomeAmount), date: IncomeDate, source: IncomeSource, Note: IncomeCity
  });

  const handleAddExpense = () => postWithAuth('/api/expenses', {
    amount: parseFloat(expenseAmount), description: expenseDescription,
    category: expenseCategory || undefined, date: expenseDate, payment_type: expensepayment_type
  });

  const handleGetFinancial_overview = async () => {
    if (!token) return alert('Please login first.');
    try {
      const res = await axios.get(`${API_URL}/api/analytics_overview`, authHeaders());
      setFinancialOverview(res.data);
    } catch (err) {
      alert(err.response?.data?.error || 'Error fetching overview');
    }
  };

  const handleGetAdvice = async () => {
    if (!token) return alert('Please login first.');
    try {
      const res = await axios.get(`${API_URL}/api/advice`, authHeaders());
      if (res.data.recommendations?.length > 0) setAdvice(res.data.recommendations);
      else setAdvice([]);
    } catch (err) {
      alert(err.response?.data?.error || 'Error getting advice');
    }
  };

  const handleGetGraph = async () => {
    if (!token) return alert('Please login first.');
    try {
      const res = await axios.get(`${API_URL}/api/expenses/graph`, authHeaders());
      setGraphBase64(res.data.graph || '');
    } catch (err) {
      alert(err.response?.data?.error || 'Error fetching graph');
    }
  };

  const handleGetGraphTrend = async () => {
    if (!token) return alert('Please login first.');
    try {
      const res = await axios.get(`${API_URL}/api/expenses_income_trend`, authHeaders());
      setGraphTrend64(res.data.graph || '');
    } catch (err) {
      alert(err.response?.data?.error || 'Error fetching graph');
    }
  };
  // --- NEW: Tax Advice handler ---
  const handleGetTaxAdvice = async () => {
    if (!token) return alert('Please login first.');
    try {
      const res = await axios.get(`${API_URL}/api/tax_advice`, authHeaders());
      setTaxData(res.data);
    } catch (err) {
      alert(err.response?.data?.error || 'Error fetching tax advice');
    }
  };

  // --- NEW: Investment Advice handler ---
  const handleGetInvestmentAdvice = async () => {
    if (!token) return alert('Please login first.');
    try {
      const res = await axios.get(
        `${API_URL}/api/investment_advice?risk=${riskProfile}`,
        authHeaders()
      );
      setInvestmentData(res.data);
    } catch (err) {
      alert(err.response?.data?.error || 'Error fetching investment advice');
    }
  };

  return (
    <div className="app-container">
      <aside className="sidebar">
        <div className="user-info">
          <h1 className="topi">cashflow</h1>
          {token && <p>Hi, {loginUsername}</p>}
        </div>
        {/* --- NEW: Tax Advice Card --- */}
        <div className="card advice-card">
          <h2>Tax Advice</h2>
          <button onClick={handleGetTaxAdvice}>Fetch Tax Advice</button>
          {taxData && (
            <div className="advice-grid">
              <p><strong>Total Income:</strong> ₹{taxData.total_income}</p>
              <p><strong>Std. Deduction:</strong> ₹{taxData.standard_deduction}</p>
              <p><strong>Taxable Income:</strong> ₹{taxData.taxable_income_estimate}</p>
              <ul>
                {taxData.tips.map((tip, i) => <li key={i}>{tip}</li>)}
              </ul>
            </div>
          )}
        </div>

        {/* --- NEW: Investment Advice Card --- */}
        <div className="card advice-card">
          <h2>Investment Advice</h2>
          <label>
            Risk Profile:{' '}
            <select
              value={riskProfile}
              onChange={e => setRiskProfile(e.target.value)}
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </label>
          <button onClick={handleGetInvestmentAdvice}>
            Fetch Investment Advice
          </button>
          {investmentData && (
            <div className="advice-grid">
              <p><strong>Savings:</strong> ₹{investmentData.savings}</p>
              <p><strong>Risk:</strong> {investmentData.risk_profile}</p>
              <ul>
                {Object.entries(investmentData.suggestions).map(
                  ([instrument, amt]) => (
                    <li key={instrument}>
                      {instrument}: ₹{amt}
                    </li>
                  )
                )}
              </ul>
            </div>
          )}
        </div>
        <div className="card advice-card">
          <h2 className="text-xl font-semibold mb-4">Get Advice</h2>
          <button className="fetch-button" onClick={handleGetAdvice}>Fetch Advice</button>
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
         
      </aside>
      <main className="main-content">
        <h1 className="main-title">VITYA-AI</h1>
        <div className="flex-row">
          <div className="card form-card">
            <h2>Register</h2>
            <form onSubmit={handleRegister}>
              <input type="text" placeholder="Username" value={username} onChange={(e) => setUsername(e.target.value)} required />
              <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required />
              <button type="submit">Register</button>
            </form>
          </div>
          <div className="card form-card">
            <h2>Login</h2>
            <form onSubmit={handleLogin}>
              <input type="text" placeholder="Username" value={loginUsername} onChange={(e) => setLoginUsername(e.target.value)} required />
              <input type="password" placeholder="Password" value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} required />
              <button type="submit">Login</button>
            </form>
          </div>
        </div>
        <div className="flex-row">
          <div className="card form-card">
            <h2>Income</h2>
            <p className="small-note">Salary can be added once a month, and other income can be added as needed.</p>
            <input type="number" placeholder="Amount" value={IncomeAmount} onChange={(e) => setIncomeAmount(e.target.value)} />
            <input type="text" placeholder="Source" value={IncomeSource} onChange={(e) => setIncomeSource(e.target.value)} />
            <input type="text" placeholder="City" value={IncomeCity} onChange={(e) => setIncomeCity(e.target.value)} />
            <input type="text" placeholder="Date (DD-MM-YYYY)" value={IncomeDate} onChange={(e) => setIncomeDate(e.target.value)} />
            <button onClick={handleSetIncome}>Set Income</button>
          </div>
          <div className="card form-card">
            <h2>Add Expense</h2>
            <input type="number" placeholder="Amount" value={expenseAmount} onChange={(e) => setExpenseAmount(e.target.value)} />
            <input type="text" placeholder="Category" value={expenseCategory} onChange={(e) => setExpenseCategory(e.target.value)} />
            <input type="text" placeholder="Payment Type" value={expensepayment_type} onChange={(e) => setExpensepayment_type(e.target.value)} />
            <input type="text" placeholder="Description" value={expenseDescription} onChange={(e) => setExpenseDescription(e.target.value)} />
            <input type="text" placeholder="Date (DD-MM-YYYY)" value={expenseDate} onChange={(e) => setExpenseDate(e.target.value)} />
            <button onClick={handleAddExpense}>Add Expense</button>
          </div>
        </div>
        <div className="flex-row">
        <div className="card overview-card">
          <h2>Financial Overview</h2>
          <button onClick={handleGetFinancial_overview}>Get Overview</button>
          {financialOverview && <pre className="json-output">{JSON.stringify(financialOverview, null, 2)}</pre>}
        </div>
        
        <div className="card graph-card">
          <h2>Expense Graph</h2>
          <button onClick={handleGetGraph}>Fetch Graph</button>
          {graphBase64 && <img src={`data:image/png;base64,${graphBase64}`} alt="Expense Graph" />}
        </div>
        </div>
        <div className="card graph-card">
          <h2>Expenses Income Trend</h2>
          <button onClick={handleGetGraphTrend}>Fetch Graph</button>
          {graphBase64 && <img src={`data:image/png/trend;base64,${graphTrend64}`} alt="expenses income trend" />}
        </div>
        
      </main>
    </div>
  );
}

export default App;