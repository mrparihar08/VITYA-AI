import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { Card } from "./HomeContent";

const API_URL = process.env.REACT_APP_API_URL || "https://vitya-ai-qlbn.onrender.com";

const getAuthHeaders = (token) => ({
  headers: { Authorization: `Bearer ${token}` },
});

const handleApiError = (err) => {
  if (err.response?.status === 429) {
    return err.response.data?.error || "Too many requests. Please slow down and try again later.";
  }
  return err.response?.data?.error || err.response?.data?.message || "An unexpected error occurred.";
};

const validateEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
const validatePassword = (pass) => pass.length >= 6;

export function Register() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);

    if (!validateEmail(email)) {
      alert("Please enter a valid email address.");
      setLoading(false);
      return;
    }

    if (!validatePassword(password)) {
      alert("Password must be at least 6 characters long.");
      setLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      alert("Passwords do not match!");
      setLoading(false);
      return;
    }

    try {
      const res = await axios.post(`${API_URL}/api/users/register`, {
        username,
        email,
        password,
      });

      alert(res.data.message || "Registration successful!");
      if (res.data.token) {
        localStorage.setItem("token", res.data.token);
        navigate("/profile"); // redirect after signup
      } else {
        navigate("/login"); // fallback → go login page
      }
    } catch (err) {
      alert(handleApiError(err));
    } finally {
      setLoading(false);
    }
  };
  return (
          <div className="form-container"><div className="card form-card">
             <button
                 type="button"
                 className="button-8b"
                 onClick={() => navigate("/")}
                 style={{ marginTop: "10px" }}
                          >
                   ← Go to Home
              </button>
          <h1 className="h1-title">Register</h1>
          <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>Create your Vitya account</p>
            <form onSubmit={handleRegister}>
              <input type="text" placeholder="Username" value={username} autoComplete="username"
                onChange={(e) => setUsername(e.target.value)} required />
              <input type="email" placeholder="Email" value={email} autoComplete="email"
                onChange={(e) => setEmail(e.target.value)} required />
              
              <div style={{ position: 'relative' }}>
                <input type={showPassword ? "text" : "password"} placeholder="Password" value={password} autoComplete="new-password"
                  onChange={(e) => setPassword(e.target.value)} required />
                <button 
                  type="button" 
                  onClick={() => setShowPassword(!showPassword)}
                  style={{ position: 'absolute', right: '10px', top: '10px', background: 'none', color: 'var(--primary)', padding: 0, marginTop: 0 }}
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>

              <input type="password" placeholder="Confirm Password" value={confirmPassword} 
                onChange={(e) => setConfirmPassword(e.target.value)} required />

              <button type="submit" className='button-8b' disabled={loading}>
              {loading ? "Registering..." : "Register"}
              </button>
            </form>
              <div style={{ marginTop: '1rem', textAlign: 'center' }}>
                Already registered? <Link to='/login' style={{ color: 'var(--primary)', fontWeight: '600' }}>Login</Link>
              </div>
          </div></div>
  );
}

export function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await axios.post(`${API_URL}/api/users/login`, {
        username,
        password,
      });

      if (res.data.token) {
        localStorage.setItem("token", res.data.token);
        alert("login successful!");
        navigate("/profile"); // redirect after login
      }else{
        alert("invalid login response!");
      }
    } catch (err) {
      alert(handleApiError(err));
    } finally {
      setLoading(false);
    }
  };
  return (
          <div className="form-container"><div className="card form-card">
             <button
                 type="button"
                 className="button-8b"
                 onClick={() => navigate("/")}
                 style={{ marginTop: "10px" }}
                          >
                   ← Go to Home
              </button>  
          <h1 className="h1-title" style={{ marginTop: '1.5rem' }}>Welcome Back</h1>
          <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>Log in to manage your expenses</p>
            
            <form onSubmit={handleLogin}>
              <input type="text" placeholder="Username" value={username} autoComplete="username"
                onChange={(e) => setUsername(e.target.value)} required />
              
              <div style={{ position: 'relative' }}>
                <input type={showPassword ? "text" : "password"} placeholder="Password" value={password} autoComplete="current-password"
                  onChange={(e) => setPassword(e.target.value)} required />
                <button 
                  type="button" 
                  onClick={() => setShowPassword(!showPassword)}
                  style={{ position: 'absolute', right: '10px', top: '10px', background: 'none', color: 'var(--primary)', padding: 0, marginTop: 0 }}
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>

              <button type="submit" className='button-8b' disabled={loading} style={{ width: '100%' }}>
               {loading ? "Logging in..." : "Login"}
              </button>
            </form>
            <div style={{ marginTop: '1rem', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <Link to='/forgot-password' style={{ color: 'var(--primary)', fontSize: '0.9rem' }}>Forgot Password?</Link>
              Not registered yet? <Link to='/register' style={{ color: 'var(--primary)', fontWeight: '600' }}>Register</Link>
            </div>
          </div></div>
  );
}

export function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleForgot = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await axios.post(`${API_URL}/api/users/forgot-password`, { email });
      alert(res.data?.message || "If an account exists with this email, a reset link has been sent.");
      navigate("/login");
    } catch (err) {
      alert(handleApiError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card form-card">
      <button type="button" className="button-8b" onClick={() => navigate("/login")}>← Back to Login</button>
      <h1 className="h1-title">Forgot Password</h1>
      <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>Enter your email to receive a recovery link.</p>
      <form onSubmit={handleForgot}>
        <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <button type="submit" className="button-8b" disabled={loading} style={{ width: '100%' }}>
          {loading ? "Sending..." : "Send Reset Link"}
        </button>
      </form>
    </div>
  );
}

export function ResetPassword() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token");

  const handleReset = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) return alert("Passwords do not match!");
    if (!validatePassword(password)) return alert("Password must be at least 6 characters.");
    
    setLoading(true);
    try {
      await axios.post(`${API_URL}/api/users/reset-password`, { token, newPassword: password });
      alert("Password reset successful! Please login.");
      navigate("/login");
    } catch (err) {
      alert(handleApiError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card form-card">
      <h1 className="h1-title">Reset Password</h1>
      <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>Choose a strong new password.</p>
      <form onSubmit={handleReset}>
        <input type="password" placeholder="New Password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        <input type="password" placeholder="Confirm New Password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
        <button type="submit" className="button-8b" disabled={loading || !token} style={{ width: '100%' }}>
          {loading ? "Resetting..." : "Reset Password"}
        </button>
      </form>
    </div>
  );
}

export function Profile() {
  const [data, setData] = useState({ profile: null, overview: null });
  const [passwords, setPasswords] = useState({ oldPassword: "", newPassword: "", confirmNew: "" });
  const [showChangePass, setShowChangePass] = useState(false);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [updatingPass, setUpdatingPass] = useState(false);

  const navigate = useNavigate();
  const token = localStorage.getItem("token");

  useEffect(() => {
    if (!token) {
      navigate("/login");
      return;
    }

    const fetchData = async () => {
      try {
        const [profRes, overRes] = await Promise.all([
          axios.get(`${API_URL}/api/users/profile`, getAuthHeaders(token)),
          axios.get(`${API_URL}/api/vitya/financial_overview`, getAuthHeaders(token))
        ]);
        setData({ profile: profRes.data, overview: overRes.data });
      } catch (err) {
        console.error(err);
        if (err.response?.status === 401) {
          alert("Session expired, please login again!");
          localStorage.removeItem("token");
          navigate("/login");
        }
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [token, navigate]);

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (passwords.newPassword !== passwords.confirmNew) {
      return alert("New passwords do not match!");
    }

    if (!validatePassword(passwords.newPassword)) {
      return alert("New password must be at least 6 characters long.");
    }
    
    setUpdatingPass(true);
    try {
      await axios.post(`${API_URL}/api/users/change-password`, {
        oldPassword: passwords.oldPassword,
        newPassword: passwords.newPassword
      }, getAuthHeaders(token));
      
      alert("Password updated successfully!");
      setPasswords({ oldPassword: "", newPassword: "", confirmNew: "" });
      setShowChangePass(false);
    } catch (err) {
      alert(handleApiError(err));
    } finally {
      setUpdatingPass(false);
    }
  };

  const handleDownloadCSV = async () => {
    setDownloading(true);
    try {
      const res = await axios.get(`${API_URL}/api/vitya/csv`, {
        ...getAuthHeaders(token),
        responseType: 'blob'
      });
      const blob = new Blob([res.data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `vitya_expenses_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert("Error downloading CSV file: " + handleApiError(err));
    } finally {
      setDownloading(false);
    }
  };

  const handleLogout = () => {
    if (window.confirm("Are you sure you want to logout?")) {
      localStorage.removeItem("token");
      navigate("/login");
    }
  };

  if (loading) return <div className="card profile-card"><p>Loading profile...</p></div>;

  return (
    <div className="card profile-card">
      <button type="button" className="button-8b" onClick={() => navigate("/")}>
        ← Go to Home
      </button>

      <div className="logo-circle profile" style={{ margin: '2rem auto' }}>
        {data.profile?.username?.charAt(0).toUpperCase() || 'V'}
      </div>

      <Card title="User Information" style={{ marginBottom: '1.5rem' }}>
        <h2 className="h1-title Username" style={{ margin: '0.5rem 0' }}>{data.profile?.username}</h2>
        <p className="Useremail">{data.profile?.email}</p>
      </Card>

      <Card title="Financial Snapshot" style={{ marginBottom: '1.5rem' }}>
        <div className="breakdown-list">
          <div className="breakdown-info"><span className="breakdown-label">Total Income</span><span className="breakdown-value" style={{ color: 'var(--accent-green)' }}>₹{data.overview?.total_income?.toLocaleString()}</span></div>
          <div className="breakdown-info"><span className="breakdown-label">Total Expenses</span><span className="breakdown-value" style={{ color: 'var(--accent-red)' }}>₹{data.overview?.total_expenses?.toLocaleString()}</span></div>
          <div className="breakdown-info"><span className="breakdown-label">Balance</span><span className="breakdown-value">₹{data.overview?.available_balance?.toLocaleString()}</span></div>
        </div>
      </Card>

      <Card title="🛡️ Security Settings" style={{ marginBottom: '2rem' }}>
        {!showChangePass ? (
          <button type="button" className="sidebar-btn" onClick={() => setShowChangePass(true)} style={{ width: '100%', textAlign: 'center' }}>
            Change Password
          </button>
        ) : (
          <form onSubmit={handleChangePassword} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <input 
              type="password" placeholder="Current Password" required
              value={passwords.oldPassword} onChange={(e) => setPasswords({...passwords, oldPassword: e.target.value})}
            />
            <input 
              type="password" placeholder="New Password" required
              value={passwords.newPassword} onChange={(e) => setPasswords({...passwords, newPassword: e.target.value})}
            />
            <input 
              type="password" placeholder="Confirm New Password" required
              value={passwords.confirmNew} onChange={(e) => setPasswords({...passwords, confirmNew: e.target.value})}
            />
            <div style={{ display: 'flex', gap: '10px' }}>
              <button type="submit" className="button-8b" disabled={updatingPass} style={{ flex: 1 }}>{updatingPass ? "Updating..." : "Update"}</button>
              <button type="button" className="button-8b" onClick={() => setShowChangePass(false)} style={{ flex: 1, background: 'var(--text-muted)' }}>Cancel</button>
            </div>
          </form>
        )}
      </Card>

      <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
        <button type="button" className="button-8b" onClick={handleDownloadCSV} disabled={downloading}>{downloading ? "Preparing..." : "Download CSV"}</button>
        <button type="button" className="button-8b" onClick={handleLogout} style={{ background: 'var(--accent-red)' }}>Logout</button>
      </div>
    </div>
  );
}