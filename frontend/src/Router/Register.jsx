import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { Bell, Settings } from "lucide-react";

/* =======================
   Profile Component
======================= */
export function Profile() {
  const [user, setUser] = useState(null);
  const API_URL = process.env.REACT_APP_API_URL || 'https://vitya-ai-qlbn.onrender.com';

  // Fetch current user profile
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;

    axios.get(`${API_URL}/api/profile`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then(res => setUser(res.data))
      .catch(err => console.error(err));
  }, [API_URL]);

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
                    <Link to="/Singup" className="btn">Sign Up</Link>
                    <Link to="/login" className="btn">Login</Link>
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
              <div>
                <h2 className="main-title">Profile</h2>
                <p className="main-subtitle">Login....</p>
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
              </Card>
              <Card title="Add Your Expenses">
              </Card>
              <Card title="Transaction">
             </Card>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
/* =============================== */
export function Singup() {
  const [token, setToken] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

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

  const axiosAuth = axios.create({
    baseURL: API_URL,
    headers: { 'Content-Type': 'application/json' },
  });

  // Add token to every request
  axiosAuth.interceptors.request.use(config => {
    const savedToken = localStorage.getItem('token');
    if (savedToken) config.headers.Authorization = `Bearer ${savedToken}`;
    return config;
  });

  // Load token on mount
  useEffect(() => {
    const savedToken = localStorage.getItem('token');
    if (savedToken) setToken(savedToken);
  }, []);

  // Keep token in localStorage
  useEffect(() => {
    if (token) localStorage.setItem('token', token);
    else localStorage.removeItem('token');
  }, [token]);

  const handleRegister = async e => {
    e.preventDefault();
    try {
      const res = await axiosAuth.post('/api/register', { username, email, password });
      alert(res.data.message || 'Registration successful!');
      setUsername('');
      setEmail('');
      setPassword('');
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.error || 'Registration failed');
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
                    <Link to="/login" className="btn">Login</Link>
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
              <div>
                <h2 className="main-title">Profile</h2>
                <p className="main-subtitle">Login....</p>
              </div>
              <div className="header-actions">
                <button className="icon-btn"><Bell size={18} /></button>
                <button className="icon-btn"><Settings size={18} /></button>
                <div className="pro-badge"></div>
              </div>
            </div>

            {/* === Summary Section === */}
            <div className="cards-grid">
              <Card title="Register" className='register-pro'>
                <form onSubmit={handleRegister}>
                  <input type="text" placeholder="Username" value={username} onChange={e => setUsername(e.target.value)} required />
                  <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required />
                  <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} required />
                  <button type="submit">Register</button>
                  <h4> If you are Already register ?</h4>
                  <Link to="/Login" >Login</Link>
               </form>
              </Card>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}

/*====================================================================== */

export function Login() {
  const [token, setToken] = useState('');
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  const navigate = useNavigate();

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

  const axiosAuth = axios.create({
    baseURL: API_URL,
    headers: { 'Content-Type': 'application/json' },
  });

  // Add token to every request
  axiosAuth.interceptors.request.use(config => {
    const savedToken = localStorage.getItem('token');
    if (savedToken) config.headers.Authorization = `Bearer ${savedToken}`;
    return config;
  });

  // Load token on mount
  useEffect(() => {
    const savedToken = localStorage.getItem('token');
    if (savedToken) setToken(savedToken);
  }, []);

  // Keep token in localStorage
  useEffect(() => {
    if (token) localStorage.setItem('token', token);
    else localStorage.removeItem('token');
  }, [token]);


  const handleLogin = async e => {
    e.preventDefault();
    try {
      const res = await axiosAuth.post('/api/login', { username: loginUsername, password: loginPassword });
      if (res.data.token) {
        setToken(res.data.token);
        alert('Login successful!');
        setLoginUsername('');
        setLoginPassword('');
        navigate('/dashboard');
      }
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.error || 'Login failed');
    }
  };

  const handleLogout = () => {
    setToken('');
    alert('Logged out successfully!');
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
                    <Link to="/Singup" className="btn">Sign Up</Link>
                 </>
               ) : (
                 <Link to="/settings" className="btn down">Settings</Link>
               )}
             </nav>
            <div className="brand">
              <div className="brand-badge">
              </div>
              <Link to="/"><div className="brand-logo">VITYA.AI</div></Link>
              <div className="brand-badge"></div>
            </div>
          </aside>

          {/* Main */}
          <main className="main">
            <div className="main-header">
              <div>
                <h2 className="main-title">Profile</h2>
                <p className="main-subtitle">Login....</p>
              </div>
              <div className="header-actions">
                <button className="icon-btn"><Bell size={18} /></button>
                <button className="icon-btn"><Settings size={18} /></button>
                <div className="pro-badge"></div>
              </div>
            </div>

            {/* === Summary Section === */}
            <div className="cards-grid">
              <Card title="logIn" className="login-pro">

                <form onSubmit={handleLogin}>
                    <input type="text" placeholder="Username" value={loginUsername} onChange={e => setLoginUsername(e.target.value)} required />
                    <input type="password" placeholder="Password" value={loginPassword} onChange={e => setLoginPassword(e.target.value)} required />
                    <div style={{ marginTop: '10px' }}>
                    <button type="submit">Login</button>
                    {token && (
                    <button type="button" onClick={handleLogout} style={{ marginLeft: '10px' }}>Logout</button>
                    )}
                    <h4> If you are not register ?</h4>
                    <Link to="/Singup" >Register</Link>
                    </div>
                 </form>
              </Card>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
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
