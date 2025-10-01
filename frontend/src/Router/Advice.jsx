import { useState, useEffect } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
export default function Advice() {
  const [advice, setAdvice] = useState([]);
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

  // Fetch expense advice
  const handleGetAdvice = async () => {
    if (!token) return alert('Please login first.');

    try {
      const res = await axiosAuth.get('/api/advice');
      setAdvice(res.data.recommendations?.length > 0 ? res.data.recommendations : []);
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.error || 'Error getting advice');
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
            <Link to="/"><div className="brand-logo">VITYA.AI</div></Link>
             </aside>
      <main className="main"> 
      <div className="main-header">
        <h1 className="main-title">Expense Advice</h1>
        <button onClick={handleGetAdvice}>Refresh</button>
        {advice.length > 0 && (
          <div className="advice-grid">
            <h3>Advice:</h3>
            {advice.map((rec, idx) => (
              <div key={idx} className="advice-item">
                <span className="category">{rec.category}:</span>
                <span className="value">{rec.advice || 'No advice'}</span>
                <span className="prediction">
                  (Predicted: {rec.predicted_next_month?.toFixed(2) ?? 'N/A'})
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
         
       </main>
    </div>
    </div>
    </div>
  );
}
