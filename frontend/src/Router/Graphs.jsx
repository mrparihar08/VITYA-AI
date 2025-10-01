import { useState, useEffect } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';

export function Graph() {
  const [token, setToken] = useState('');
  const [graphBase64, setGraphBase64] = useState('');

  const [user, setUser] = useState(null);
  const API_URL = process.env.REACT_APP_API_URL || 'https://vitya-ai-qlbn.onrender.com';

  // Fetch current user profile
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;

    axios
      .get(`${API_URL}/api/profile`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then(res => setUser(res.data))
      .catch(err => console.error(err));
  }, [API_URL]);

  useEffect(() => {
    const savedToken = localStorage.getItem('token');
    if (savedToken) setToken(savedToken);
  }, []);

  const axiosAuth = axios.create({
    baseURL: API_URL,
    headers: { 'Content-Type': 'application/json' },
  });

  axiosAuth.interceptors.request.use(config => {
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  });

  const getGraph = async () => {
    if (!token) return alert('Please login first.');
    try {
      const res = await axiosAuth.get('/api/expenses/graph');
      setGraphBase64(res.data.graph || '');
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.error || 'Error fetching graph');
    }
  };

  return (
      <div className="dashboard-container">
      <div className="dashboard-card">
        <div className="dashboard-layout">
            <aside className="sidebar">
            <div className="profile">
              <img src="/avatar.png" alt="avatar" className="avatar" />
              <div>
                <div className="profile-name">{user ? user.username : 'Guest User'}</div>
                <div className="profile-role">{user ? user.role || 'Member' : 'Not logged in'}</div>
              </div>
            </div>
      
            <nav className="pro-menu">
              {!user ? (
                <>
                    <Link to="/Profile" className="btn">Profile </Link>
                    <Link to="/expense" className="btn">Expense</Link>
                    <Link to="/income" className="btn">Income</Link>
                    <Link to="/advice" className="btn">Advice</Link>
                    <Link to="/graphs" className="btn">Graphs</Link>
                    <Link to="/trendgraphs" className="btn">TrendGraphs</Link>
                    <Link to="/reports" className="btn">Reports</Link>
                </>
              ) : (
                <Link to="/settings" className="btn down">Settings</Link>
              )}
            </nav>
           <div className="brand">
              <Link to="/"><div className="brand-logo">VITYA.AI</div></Link>
              <div className="brand-badge"></div>
            </div>
             </aside>
             <main className="main">
             <div className="main-header">
          <h1 className="main-title">Graph</h1>
          <button onClick={getGraph}>Refresh</button>
          {graphBase64 && <img src={`data:image/png;base64,${graphBase64}`} alt="Expense Graph" />}
          </div> 
        </main>
    </div>
    </div>
    </div>
  );
}
/*====================================================== */

export function TrendGraph() {
  const [token, setToken] = useState('');
  const [incomeGraph64, setIncomeGraph64] = useState('');
  const [expenseGraph64, setExpenseGraph64] = useState('');
  const [user, setUser] = useState(null);

  const API_URL = process.env.REACT_APP_API_URL || 'https://vitya-ai-qlbn.onrender.com';

  // Fetch current user profile
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;

    axios
      .get(`${API_URL}/api/profile`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then(res => setUser(res.data))
      .catch(err => console.error(err));
  }, [API_URL]);

  useEffect(() => {
    const savedToken = localStorage.getItem('token');
    if (savedToken) setToken(savedToken);
  }, []);

  const axiosAuth = axios.create({
    baseURL: API_URL,
    headers: { 'Content-Type': 'application/json' },
  });

  axiosAuth.interceptors.request.use(config => {
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  });

  const getTrendGraphs = async () => {
    if (!token) return alert('Please login first.');
    try {
      const res = await axiosAuth.get('/api/expenses_income_trend');
      setIncomeGraph64(res.data.income_graph || '');
      setExpenseGraph64(res.data.expense_graph || '');
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.error || 'Error fetching trend graphs');
    }
  };

  return (
        <div className="dashboard-container">
      <div className="dashboard-card">
        <div className="dashboard-layout">
            <aside className="sidebar">
            <div className="profile">
              <img src="/avatar.png" alt="avatar" className="avatar" />
              <div>
                <div className="profile-name">{user ? user.username : 'Guest User'}</div>
                <div className="profile-role">{user ? user.role || 'Member' : 'Not logged in'}</div>
              </div>
            </div>
      
            <nav className="pro-menu">
              {!user ? (
                <>
                    <Link to="/Profile" className="btn">Profile </Link>
                    <Link to="/expense" className="btn">Expense</Link>
                    <Link to="/income" className="btn">Income</Link>
                    <Link to="/advice" className="btn">Advice</Link>
                    <Link to="/graphs" className="btn">Graphs</Link>
                    <Link to="/trendgraphs" className="btn">TrendGraphs</Link>
                    <Link to="/reports" className="btn">Reports</Link>
                </>
              ) : (
                <Link to="/settings" className="btn down">Settings</Link>
              )}
            </nav>
            <div className="brand">
              <Link to="/"><div className="brand-logo">VITYA.AI</div></Link>
              <div className="brand-badge"></div>
            </div>
             </aside>
      <main className="main"> 
        <div className="main-header">
        <h1 className="main-title">Income And Expense Trend</h1>
        <button onClick={getTrendGraphs}>Refresh</button>
        {incomeGraph64 && <div title='Income Trend'><img src={`data:image/png;base64,${incomeGraph64}`} alt="Income Trend" /></div>}
        {expenseGraph64 && <div title='Expense Trend'><img src={`data:image/png;base64,${expenseGraph64}`} alt="Expense Trend" /></div>}
         </div>
       </main>
    </div>
    </div>
    </div>
  );
}
