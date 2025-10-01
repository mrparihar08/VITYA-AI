import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';

/* =======================
   Profile Component
======================= */
export function Expense() {
  const [overview, setOverview] = useState();
  const [token, setToken] = useState('');
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

          {/* Main */}
          <main className="main">
            <div className="main-header">
            <h1 className="main-title">Expense</h1>
            <button onClick={getOverview}>Refresh</button>
               {overview && (
            <div>
              <p>Total Expenses: ₹{overview.total_expenses}</p>
              <p>Available Balance: ₹{overview.available_balance}</p>
              <ul>
                {Object.entries(overview.expense_distribution || {}).map(([cat, val]) => (
                  <li key={cat}>{cat}: ₹{val}</li>
                ))}
              </ul>
            </div>
          )}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
/*============================================= */
export function Income() {
  const [overview, setOverview] = useState();
  const [token, setToken] = useState('');
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

          {/* Main */}
          <main className="main">

            <div className="main-header">
              <h1 className="main-title">Income</h1>
              <button onClick={getOverview}>Refresh</button>
               {overview && (
            <div>
              <p>Total Income: ₹{overview.total_income}</p>
              <p>Available Balance: ₹{overview.available_balance}</p>
              <ul>
                {Object.entries(overview.expense_distribution || {}).map(([cat, val]) => (
                  <li key={cat}>{cat}: ₹{val}</li>
                ))}
              </ul>
            </div>
          )}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
/*===================================================*/
