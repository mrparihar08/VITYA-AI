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
  const [IncomeAmount, setIncomeAmount] = useState('');
  const [IncomeSource, setIncomeSource] = useState('');
  const [IncomeCity, setIncomeCity] = useState('');
  const [IncomeDate, setIncomeDate] = useState(getCurrentDate());
  const [expenseAmount, setExpenseAmount] = useState('');
  const [expenseDescription, setExpenseDescription] = useState('');
  const [expenseCategory, setExpenseCategory] = useState('');
  const [expenseDate, setExpenseDate] = useState(getCurrentDate());
  const [expensepayment_type, setExpensePaymentType] = useState('');
  const [overview, setOverview] = useState(null);
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
      const res = await axios.get(`${API_URL}/api/analytics_overview`, authHeaders());
      setOverview(res.data);
    } catch (err) {
      console.error('Overview fetch error:', err);
    }
  };

  const fetchDashboardData = async () => {
    try {
      setError('');
      const res = await axiosAuth.get('/api/transactions/recent');
      setRecentTransactions(res.data || []);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || 'Failed to fetch dashboard data.');
    }
  };

  const fetchChart = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/expenses/chart`, authHeaders());
      setChartData(res.data);
    } catch (err) {
      console.error("Chart fetch error:", err);
    }
  };

  const fetchGraph = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/expenses/graph`, authHeaders());
      setGraphData(res.data ||[]);
    } catch (err) {
      console.error("Graph fetch error:", err);
    }
  };

  // ====== Unified Refresh Function ======
  const refreshAllData = () => {
    fetchDashboardData();
    getOverview();
    fetchChart();
    fetchGraph();
  };

  // ====== Initial Load ======
  useEffect(() => {
    if (token) {
      refreshAllData();
      axiosAuth.get('/api/profile').catch(err => console.error(err));
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
    postWithAuth('/api/expenses', {
      amount: parseFloat(expenseAmount),
      description: expenseDescription,
      category: expenseCategory || undefined,
      date: expenseDate,
      payment_type: expensepayment_type,
    }, 'Expense added successfully!');
  };

  const handleSetIncome = () => {
    postWithAuth('/api/incomes', {
      amount: parseFloat(IncomeAmount),
      source: IncomeSource,
      city: IncomeCity,
      date: IncomeDate,
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

      {/* ===== Input Section ===== */}
      <div className="form-al container-grid">
        {/* Expense Card */}
        <div className="col col-4">
          <Card title="Expense" className="expense">
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
            <button className="button-8b" onClick={handleAddExpense} disabled={loading}>
              {loading ? 'Processing...' : 'Add Expense'}
            </button>
          </Card>
        </div>

        {/* Income Card */}
        <div className="col col-4">
          <Card title="Income" className="income">
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
            <button className="button-8b" onClick={handleSetIncome} disabled={loading}>
              {loading ? 'Processing...' : 'Set Income'}
            </button>
          </Card>
        </div>

        {/* Recent Transactions */}
        <div className="col col-4">
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
                      <table>
                        <tbody>
                          <tr className='row-1'>
                            <td>Date</td>
                            <td>Category</td>
                            <td>Amount</td>
                          </tr>
                          <tr className='row-n'>
                            <td>{new Date(tx.date).toLocaleDateString()}</td>
                            <td>{tx.category}</td>
                            <td className={tx.type === 'expense' ? 'negative' : 'positive'}>
                              {tx.type === 'expense' ? '-' : '+'}₹{tx.amount.toFixed(2)}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="small-note">No recent transactions available.</p>
              )}
            </div>
          </Card>
          <br />
          <br />
          <br />
          <br />
        </div>
      </div>

      {/* ===== Analytics Section ===== */}
      <div className="form-al container-grid">
        {/* Expense Breakdown */}
        <div className="col col-4">
          <Card title="🧾Expense Breakdown" className="income">
            {overview ? (
              <ul>
                {Object.entries(overview.expense_distribution || {}).map(([cat, val]) => (
                  <li key={cat}>{cat}: ₹{val}</li>
                ))}
              </ul>
            ) : (
              <p>Loading overview...</p>
            )}
          </Card>
        </div>
        {/* Bar Chart */}
        <div className="col col-4">
          <Card title="Expenses by Category" className="income">
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="category" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="amount" fill="#8884d8" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </div>
        {/* Expense Graph */}
        <div className="col col-4">
          <Card title="Expense Graph" className="income">
  {graphData.length > 0 ? (
    <ResponsiveContainer width="100%" height={250}>
      <PieChart>
        <Pie
          data={graphData}
          dataKey="amount"
          nameKey="category"
          cx="50%"
          cy="50%"
          outerRadius={100}
          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
        >
          {graphData.map((entry, index) => (
            <Cell key={index} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip formatter={(val) => `₹${val}`} />
        <Legend />
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
function Card({ title, children }) {
  return (
    <div className="cards">
      <div className="card-header">
        <div className="h3-title">{title}</div>
      </div>
      <div className='card-body'>{children}</div>
    </div>
  );
}
