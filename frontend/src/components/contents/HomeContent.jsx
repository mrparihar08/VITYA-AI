import { useEffect, useState, useMemo } from 'react';
import axios from 'axios';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, PieChart, Pie, Cell,
  Tooltip, Legend, ResponsiveContainer
} from "recharts";


export default function Home() {
  // ====== States ======
  const [recentTransactions, setRecentTransactions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [incomeAmount, setIncomeAmount] = useState('');
  const [incomeSource, setIncomeSource] = useState('');
  const [incomeCity, setIncomeCity] = useState('');
  const [incomeDate, setIncomeDate] = useState(getCurrentDate());
  const [expenseAmount, setExpenseAmount] = useState('');
  const [expenseDescription, setExpenseDescription] = useState('');
  const [expenseCategory, setExpenseCategory] = useState('');
  const [expenseDate, setExpenseDate] = useState(getCurrentDate());
  const [overview, setOverview] = useState(null);
  const [transactionType, setTransactionType] = useState('expense'); // 'expense' or 'income'
  const [token, setToken] = useState('');
  const [chartData, setChartData] = useState([]);
  const [graphData, setGraphData] = useState([]);
  const COLORS = ["#8884d8", "#82ca9d", "#ffc658", "#ff8042", "#8dd1e1", "#d0ed57"];

  // ====== Config ======
  const API_URL = process.env.REACT_APP_API_URL || "https://vitya-ai-qlbn.onrender.com";

  // ====== Helper: Current Date ======
  function getCurrentDate() {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  // ====== Axios Auth Instance ======
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

  // ====== Token Sync ======
  useEffect(() => {
    const savedToken = localStorage.getItem('token');
    if (savedToken) setToken(savedToken);
  }, []);

  useEffect(() => {
    if (token) localStorage.setItem('token', token);
  }, [token]);

  const authHeaders = () => ({ headers: { Authorization: `Bearer ${token}` } });

  // ====== Data Fetching Functions ======
  const getOverview = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/vitya/financial_overview`, authHeaders());
      setOverview(res.data);
    } catch (err) {
      console.error('Overview fetch error:', err);
    }
  };

  const fetchDashboardData = async () => {
    try {
      setError('');
      const res = await axiosAuth.get('/api/vitya/transactions/recent');
      setRecentTransactions(res.data || []);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || 'Failed to fetch dashboard data.');
    }
  };

  const fetchChart = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/vitya/expenses_chart`, authHeaders());
      setChartData(res.data);
    } catch (err) {
      console.error("Chart fetch error:", err);
    }
  };

  const fetchGraph = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/vitya/graph`, authHeaders());
      setGraphData(res.data ||[]);
    } catch (err) {
      console.error("Graph fetch error:", err);
    }
  };

  // ====== Unified Refresh Function ======
  const refreshAllData = async () => {
    setLoading(true);
    await Promise.all([
      fetchDashboardData(),
      getOverview(),
      fetchChart(),
      fetchGraph()
    ]);
    setLoading(false);
  };

  // ====== Initial Load ======
  useEffect(() => {
    if (token) {
      refreshAllData();
      axiosAuth.get('/api/users/profile').catch(err => console.error(err));
    }
  }, [token, axiosAuth]);

  // ====== Add Income/Expense ======
  const postWithAuth = async (endpoint, data, successMessage) => {
    if (!token) return alert('Please login first.');
    try {
      setLoading(true);
      const res = await axios.post(`${API_URL}${endpoint}`, data, authHeaders());
      alert(res.data.message || successMessage);
      refreshAllData(); // Auto-refresh everything
    } catch (err) {
      alert(err.response?.data?.error || 'An error occurred.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddExpense = () => {
    postWithAuth('/api/expense', {
      amount: parseFloat(expenseAmount),
      description: expenseDescription,
      category: expenseCategory || undefined,
      date: expenseDate,
    }, 'Expense added successfully!');
  };

  const handleSetIncome = () => {
    postWithAuth('/api/income', {
      amount: parseFloat(incomeAmount),
      source: incomeSource,
      city: incomeCity,
      date: incomeDate,
    }, 'Income added successfully!');
  };

  // ====== Render ======
  return (
    <div className="home-card card">
      <div className='top-h'>
        <div className='top-h-h'>
          <h1 className="h1-title">Home</h1>
          <p>Welcome back, here’s your dashboard</p>
        </div>
      </div>

      {/* ===== Quick Stats Overview ===== */}
      {overview && (
        <div className="stats-row container-grid" style={{ marginBottom: '2rem', display: 'flex', flexWrap: 'wrap' }}>
          <div className="col col-4">
            <div className="stat-card balance">
              <div className="label">Total Balance</div>
              <div className="value">₹{overview.available_balance?.toLocaleString()}</div>
            </div>
          </div>
          <div className="col col-4">
            <div className="stat-card income-summary">
              <div className="label">Monthly Income</div>
              <div className="value">+ ₹{overview.total_income?.toLocaleString()}</div>
            </div>
          </div>
          <div className="col col-4">
            <div className="stat-card expense-summary">
              <div className="label">Monthly Expenses</div>
              <div className="value">- ₹{overview.total_expenses?.toLocaleString()}</div>
            </div>
          </div>
        </div>
      )}

      {/* ===== Input Section ===== */}
      <div className="form-al container-grid" style={{ marginBottom: '1rem' }}>
        {/* Combined Transaction Card */}
        <div className="col col-6">
          <Card title="Add Transaction">
            <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
              <button
                className={`button-8b ${transactionType === 'expense' ? 'active' : ''}`}
                onClick={() => setTransactionType('expense')}
              >
                Expense
              </button>
              <button
                className={`button-8b ${transactionType === 'income' ? 'active' : ''}`}
                onClick={() => setTransactionType('income')}
              >
                Income
              </button>
            </div>

            {transactionType === 'expense' ? (
              <>
                <label>Amount:</label>
                <input type="number" placeholder="Amount" value={expenseAmount}
                  onChange={(e) => setExpenseAmount(e.target.value)} />
                <label>Category:</label>
                <input type="text" placeholder="Category" value={expenseCategory}
                  onChange={(e) => setExpenseCategory(e.target.value)} />
                <label>Description:</label>
                <input type="text" placeholder="Description" value={expenseDescription}
                  onChange={(e) => setExpenseDescription(e.target.value)} />
                <label>Date:</label>
                <input type="date" value={expenseDate}
                  onChange={(e) => setExpenseDate(e.target.value)} />
                <button className="button-8b" onClick={handleAddExpense} disabled={loading}>
                  {loading ? 'Processing...' : 'Add Expense'}
                </button>
              </>
            ) : (
              <>
                <label>Amount:</label>
                <input type="number" placeholder="Amount" value={incomeAmount}
                  onChange={(e) => setIncomeAmount(e.target.value)} />
                <label>Source:</label>
                <input type="text" placeholder="Source" value={incomeSource}
                  onChange={(e) => setIncomeSource(e.target.value)} />
                <label>City:</label>
                <input type="text" placeholder="City" value={incomeCity}
                  onChange={(e) => setIncomeCity(e.target.value)} />
                <label>Date:</label>
                <input type="date" value={incomeDate}
                  onChange={(e) => setIncomeDate(e.target.value)} />
                <button className="button-8b" onClick={handleSetIncome} disabled={loading}>
                  {loading ? 'Processing...' : 'Set Income'}
                </button>
              </>
            )}
          </Card>
        </div>

        {/* Recent Transactions */}
        <div className="col col-6">
          <Card title="Recent Transactions" className="recent">
            <div className="overview income-ov">
              {loading ? (
                <p>Loading recent transactions...</p>
              ) : error ? (
                <p className="error-msg">{error}</p>
              ) : recentTransactions.length > 0 ? (
                <ul className="transaction-list">
                  {recentTransactions.slice(0, 5).map(tx => (
                    <li key={tx._id} className={`transaction-item ${tx.type}`}>
                      <div className="transaction-item-details">
                        <span className="transaction-item-category">{tx.category || 'General'}</span>
                        <span className="transaction-item-date">{new Date(tx.date).toLocaleDateString()}</span>
                      </div>
                      <div className={`transaction-item-amount ${tx.type}`}>
                        {tx.type === 'expense' ? '-' : '+'}₹{tx.amount.toFixed(2)}
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="small-note">No recent transactions available.</p>
              )}
            </div>
          </Card>
        </div>
        {/* Expense Breakdown */}
        <div className="col col-12" style={{ marginTop: '1rem' }}>
          <Card title="🧾 Expense Breakdown">
            {overview ? (
              <div className="breakdown-list">
                {Object.entries(overview.expense_distribution || {}).map(([cat, val]) => {
                  const percentage = overview.total_expenses > 0 
                    ? ((val / overview.total_expenses) * 100).toFixed(1) 
                    : 0;
                  return (
                    <div key={cat} className="breakdown-item">
                      <div className="breakdown-info">
                        <span className="breakdown-label">{cat}</span>
                        <span className="breakdown-value">₹{val.toLocaleString()} ({percentage}%)</span>
                      </div>
                      <div className="breakdown-progress-bg">
                        <div className="breakdown-progress-fill" style={{ width: `${percentage}%` }}></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="small-note">Loading overview...</p>
            )}
          </Card>
        </div>
      </div>
      {/* ===== Analytics Section ===== */}
      <div className="form-al container-grid">
        
        {/* Bar Chart */}
        <div className="col col-8">
          <Card title="Expenses by Category" className="income">
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--primary)" stopOpacity={1} />
                    <stop offset="100%" stopColor="var(--primary-light)" stopOpacity={0.8} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="category" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                <Tooltip 
                  cursor={{ fill: 'rgba(107, 70, 255, 0.04)' }}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                  formatter={(val) => [`₹${val.toLocaleString()}`, 'Expenses']}
                />
                <Legend />
                <Bar dataKey="amount" fill="url(#barGrad)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </div>
        {/* Expense Graph */}
        <div className="col col-4">
          <Card title="Expense Graph" className="income">
  {graphData.length > 0 ? (
    <ResponsiveContainer width="100%" height={260}>
      <PieChart>
        <Pie
          data={graphData}
          dataKey="amount"
          nameKey="category"
          cx="50%"
          cy="50%"
          innerRadius={60}
          outerRadius={80}
          paddingAngle={5}
          stroke="none"
        >
          {graphData.map((entry, index) => (
            <Cell key={index} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip 
          contentStyle={{ 
            borderRadius: '12px', 
            border: 'none', 
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
            fontSize: '12px'
          }}
          formatter={(val) => [`₹${val.toLocaleString()}`, 'Spent']}
        />
        <Legend iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
      </PieChart>
    </ResponsiveContainer>
  ) : (
    <p className="small-note">No expense data available.</p>
  )}
</Card>

        </div>
      </div>

    </div>
  );
}

// ====== Reusable Card Component ======
export function Card({ title, children, className = "" }) {
  return (
    <div className={`cards ${className}`}>
      <div className="card-header">
        <div className="h3-title">{title}</div>
      </div>
      <div className='card-body'>{children}</div>
    </div>
  );
}
