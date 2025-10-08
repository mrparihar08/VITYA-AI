import { useEffect, useState, useMemo} from 'react';
import axios from 'axios';

export default function Home() {
  const [recentTransactions, setRecentTransactions] = useState([]);
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
  const API_URL = process.env.REACT_APP_API_URL || "https://vitya-ai-qlbn.onrender.com";
  
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

    const handleSetIncome = () => {
    postWithAuth('/api/incomes', {
      amount: parseFloat(IncomeAmount),
      source: IncomeSource,
      city: IncomeCity,
      date: IncomeDate,
    }, 'Income added successfully!');
  };


    const getOverview = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/analytics_overview`, authHeaders());
      setOverview(res.data);
    } catch (err) {
      alert(err.response?.data?.error || 'Error fetching overview');
    }
  };

 
     const fetchDashboardData = async () => {
  try {
    setLoading(true);
    setError('');

    const res = await axiosAuth.get('/api/transactions/recent');
    setRecentTransactions(res.data || []);
  } catch (err) {
    console.error(err);
    setError(err.response?.data?.error || 'Failed to fetch dashboard data.');
  } finally {
    setLoading(false);
  }
};

    useEffect(() => {
    if (token) {
      fetchDashboardData();
      axiosAuth.get('/api/profile')

        .catch(err => console.error(err));
    }
  }, [token, axiosAuth]);

  const viewExpense = ()=>{
    handleAddExpense();
    getOverview();
  };
  
  const viewIncome = ()=>{
    handleSetIncome();
    getOverview();
  };

    function getCurrentDate() {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  
  return (
    <div className=" Home-card">
      <div className='top-h'>
           <div className='top-h-h'>
             <h1>Home</h1>
             <p>welcome back, here's your dashboard</p>
      </div>      
      </div>
<div className="form-al container-grid">
  {/* ===== Expense Card ===== */}
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
      <button className="btn-income" onClick={viewExpense}>Add Expense</button>
    </Card>
  </div>

  {/* ===== Income Card ===== */}
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
      <button className="btn-income" onClick={viewIncome}>Set Income</button>
    </Card>
  </div>

  {/* ===== Recent Expense Card ===== */}
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
            <tr className='row-1'>
              <td>Date</td>
              <td>Category</td>
              <td>Amount</td>
            </tr>
            <tr className='row-n'>
          <td className="tx-date">{new Date(tx.date).toLocaleDateString()}</td>
          <td className="tx-category">{tx.category}</td>
          <td className={`tx-amount ${tx.type === 'expense' ? 'negative' : 'positive'}`}>
            {tx.type === 'expense' ? '-' : '+'}₹{tx.amount.toFixed(2)}
          </td>
          </tr>
          </table>
        </li>
      ))}
    </ul>
  ) : (
    <p className="small-note">No recent transactions available.</p>
  )}
</div>


    </Card>
  </div>
</div>
            {/* === Recent Transactions === */}
      <div className="card- transaction-card">
      <button className="reset" onClick={getOverview}><h2>🧾Expense Transactions</h2></button>
        {overview && (
          <div>
            <strong>Expense Breakdown:</strong>
            <ul>
              {Object.entries(overview.expense_distribution || {}).map(([cat, val]) => (
                <li key={cat}>{cat}: ₹{val}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
            {loading && <p>Loading data...</p>}
            {error && <p className="error">{error}</p>}          
    </div>
  );
}

function Card({ title, children }) {
  return (
    <div className="cards">
      <div className="card-header">
        <div className="card-title">{title}</div>
      </div>
      <div className='card-body'>{children}</div>
    </div>
  );
}
