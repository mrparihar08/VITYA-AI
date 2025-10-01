import { useEffect, useState, useMemo } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { Bell, Settings } from "lucide-react";

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [recentTransactions, setRecentTransactions] = useState([]);
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [IncomeAmount, setIncomeAmount] = useState('');
  const [IncomeSource, setIncomeSource] = useState('');
  const [IncomeCity, setIncomeCity] = useState('');
  const [IncomeDate, setIncomeDate] = useState(getCurrentDate());
  const [expenseAmount, setExpenseAmount] = useState('');
  const [expenseDescription, setExpenseDescription] = useState('');
  const [expenseCategory, setExpenseCategory] = useState('');
  const [expenseDate, setExpenseDate] = useState(getCurrentDate());
  const [expensepayment_type, setExpensePaymentType] = useState('');
  const [overview, setOverview] = useState();
  const [token, setToken] = useState('');

  const API_URL = process.env.REACT_APP_API_URL || 'https://vitya-ai-qlbn.onrender.com';

  // ✅ Memoized axios instance
  const axiosAuth = useMemo(() => {
    const instance = axios.create({
      baseURL: API_URL,
      headers: { 'Content-Type': 'application/json' },
    });

    instance.interceptors.request.use((config) => {
      if (token) config.headers.Authorization = `Bearer ${token}`;
      return config;
    });

    return instance;
  }, [token, API_URL]);

  // ✅ Load token from localStorage
  useEffect(() => {
    const savedToken = localStorage.getItem('token');
    if (savedToken) setToken(savedToken);
  }, []);

  // ✅ Persist token if changed
  useEffect(() => {
    if (token) localStorage.setItem('token', token);
  }, [token]);

  // ✅ Post request helper with auth
  const postWithAuth = async (endpoint, data, successMessage) => {
    if (!token) return alert('Please login first.');
    try {
      const res = await axiosAuth.post(endpoint, data);
      alert(res.data.message || successMessage);
      fetchDashboardData(); // refresh dashboard after adding
    } catch (err) {
      alert(err.response?.data?.error || 'An error occurred.');
    }
  };

  // ✅ Add income with validation
  const handleSetIncome = () => {
    if (!IncomeAmount || isNaN(parseFloat(IncomeAmount))) {
      return alert("Enter a valid income amount");
    }
    postWithAuth('/api/incomes', {
      amount: parseFloat(IncomeAmount),
      source: IncomeSource,
      city: IncomeCity,
      date: IncomeDate,
    }, 'Income added successfully!');
  };

  // ✅ Add expense with validation
  const handleAddExpense = () => {
    if (!expenseAmount || isNaN(parseFloat(expenseAmount))) {
      return alert("Enter a valid expense amount");
    }
    postWithAuth('/api/expenses', {
      amount: parseFloat(expenseAmount),
      description: expenseDescription,
      category: expenseCategory || undefined,
      date: expenseDate,
      payment_type: expensepayment_type,
    }, 'Expense added successfully!');
  };

    const getOverview = async () => {
    if (!token) return alert('Please login first.');
    try {
      const res = await axiosAuth.get('/api/analytics_overview');
      setOverview(res.data);
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.error || 'Error fetching overview');
    }
  };

  // ✅ Fetch dashboard data
  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [txRes, goalsRes] = await Promise.all([
        axiosAuth.get('/api/transactions/recent'),
        axiosAuth.get('/api/goals'),
      ]);

      setRecentTransactions(txRes.data || []);
      setGoals(goalsRes.data || []);
      setError('');
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || 'Failed to fetch dashboard data.');
    } finally {
      setLoading(false);
    }
  };

  // ✅ Fetch data once token is ready
  useEffect(() => {
    if (token) {
      fetchDashboardData();
      axiosAuth.get('/api/profile')
        .then(res => setUser(res.data))
        .catch(err => console.error(err));
    }
  }, [token, axiosAuth]);

  // ✅ Current Date helper
  function getCurrentDate() {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  return (
    <div className="dashboard-container">
      <div className="dashboard-card">
        <div className="dashboard-layout">
          
          {/* Sidebar */}
          <aside className="sidebar">
            <div className="profile">
              <img src="/avatar.png" alt="avatar" className="avatar" />
              <div>
                <div className="profile-name">{user ? user.username : 'Guest User'}</div>
                <div className="profile-role">{user ? user.role || 'Member' : 'Not logged in'}</div>
              </div>
            </div>

            <nav className="menu">
              <Link to="/Profile" className="btn">Profile </Link>
              <Link to="/expense" className="btn">Expense</Link>
              <Link to="/income" className="btn">Income</Link>
              <Link to="/advice" className="btn">Advice</Link>
              <Link to="/graphs" className="btn">Graphs</Link>
              <Link to="/trendgraphs" className="btn">TrendGraphs</Link>
              <Link to="/reports" className="btn">Reports</Link>
            </nav>

            {loading && <p>Loading data...</p>}
            {error && <p className="error">{error}</p>}

            <div className="brand">
              <Link to="/"><div className="brand-logo">VITYA.AI</div></Link>
              <div className="brand-badge"></div>
            </div>
          </aside>

          {/* Main */}
          <main className="main">
            <div className="main-header">
              <div>
                <h2 className="main-title">Home</h2>
                <p className="main-subtitle">Welcome back, here's your dashboard</p>
              </div>
              <div className="header-actions">
                <button className="icon-btn"><Bell size={18} /></button>
                <button className="icon-btn"><Settings size={18} /></button>
                <div className="pro-badge"></div>
              </div>
            </div>

            {/* === Summary Section === */}
            <div className="cards-grid">
              <Card title="Add Your Income">
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
              </Card>

              <Card title="Add Your Expenses">
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
              </Card>
              <Card title="Transaction">        
              <button onClick={getOverview}>Get Overview</button>
               {overview && (
            <div>
              <p>Total Income: ₹{overview.total_income}</p>
              <p>Total Expenses: ₹{overview.total_expenses}</p>
              <p>Available Balance: ₹{overview.available_balance}</p>
              <ul>
                {Object.entries(overview.expense_distribution || {}).map(([cat, val]) => (
                  <li key={cat}>{cat}: ₹{val}</li>
                ))}
              </ul>
            </div>
          )}
          </Card>
            </div>

            {/* === Recent Transactions === */}
            <div className="card transaction-card">
              <h2>🧾 Recent Transactions</h2>
              {recentTransactions.length > 0 ? (
                <ul className="transaction-list">
                  {recentTransactions.slice(0, 5).map(tx => (
                    <li key={tx._id} className={`transaction-item ${tx.type}`}>
                      <span className="tx-date">{new Date(tx.date).toLocaleDateString()}</span>
                      <span className="tx-category">{tx.category}</span>
                      <span className={`tx-amount ${tx.type === 'expense' ? 'negative' : 'positive'}`}>
                        {tx.type === 'expense' ? '-' : '+'}₹{tx.amount.toFixed(2)}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="small-note">No recent transactions available.</p>
              )}
            </div>

            {/* === Budget Goals === */}
            {goals.length > 0 && (
              <div className="card goals-card">
                <h2>🎯 Your Financial Goals</h2>
                <ul className="goals-list">
                  {goals.map(goal => (
                    <li key={goal._id} className="goal-item">
                      <div className="goal-info">
                        <strong>{goal.name}</strong>
                        <span>{Math.min(goal.progress, 100)}% complete</span>
                      </div>
                      <div className="goal-bar">
                        <div
                          className="goal-progress"
                          style={{ width: `${Math.min(goal.progress, 100)}%` }}
                        ></div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}

// ✅ Components
function Card({ title, children }) {
  return (
    <div className="card">
      <div className="card-header">
        <div className="card-title">{title}</div>
        
        <div className="card-link">View all</div>
      </div>
      <div>{children}</div>
    </div>
  );
}
