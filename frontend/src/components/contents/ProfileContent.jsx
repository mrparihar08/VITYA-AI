import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate, Link } from "react-router-dom";

export function Register() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const API_URL = process.env.REACT_APP_API_URL || "https://vitya-ai-qlbn.onrender.com";

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await axios.post(`${API_URL}/api/register`, {
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
      alert(
        err.response?.data?.error ||
          err.response?.data?.message ||
          "Registration failed"
      );
    } finally {
      setLoading(false);
    }
  };
  return (
          <div className="card form-card">
          <h1 className="h1-title">Register</h1>
            <form onSubmit={handleRegister}>
              <input type="text" placeholder="Username" value={username}
                onChange={(e) => setUsername(e.target.value)} required />
              <input type="email" placeholder="Email" value={email}
                onChange={(e) => setEmail(e.target.value)} required />
              <input type="password" placeholder="Password" value={password}
                onChange={(e) => setPassword(e.target.value)} required />
              <button type="submit" className='button-8b' disabled={loading}>
              {loading ? "Registering..." : "Register"}
              </button>

            </form>
              <div>Already registered? <Link to='/login'>Login</Link></div>
          </div>
  );
}

export function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const API_URL = process.env.REACT_APP_API_URL || "https://vitya-ai-qlbn.onrender.com";

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await axios.post(`${API_URL}/api/login`, {
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
      alert(err.response?.data?.error || "login failed");
    } finally {
      setLoading(false);
    }
  };
  return (
          <div className="card form-card">
          <h1 className="h1-title">Login</h1>
            
            <form onSubmit={handleLogin}>
              <input type="text" placeholder="Username" value={username}
                onChange={(e) => setUsername(e.target.value)} required />
              <input type="password" placeholder="Password" value={password}
                onChange={(e) => setPassword(e.target.value)} required />
              <button type="submit" className='button-8b' disabled={loading}>
               {loading ? "Logging in..." : "Login"}
              </button>
            </form>
            <div>Not registered yet? <Link to='/register'>Register</Link></div>
          </div>
  );
}


export function Profile() {
  const [profile, setProfile] = useState({ username: "", email: "" });
  const [overview, setOverview] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [loadingOverview, setLoadingOverview] = useState(true);

  const navigate = useNavigate();
  const API_URL = process.env.REACT_APP_API_URL || "https://vitya-ai-qlbn.onrender.com";
  const token = localStorage.getItem("token");

  // Redirect if no token
  useEffect(() => {
    if (!token) {
      navigate("/login");
    }
  }, [token, navigate]);

  // Fetch Profile
  useEffect(() => {
    if (!token) return;

    const fetchProfile = async () => {
      try {
        const res = await axios.get(`${API_URL}/api/profile`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setProfile({
          username: res.data.username,
          email: res.data.email,
        });
      } catch (err) {
        alert(err.response?.data?.message || "Session expired, please login again!");
        localStorage.removeItem("token");
        navigate("/login");
      } finally {
        setLoadingProfile(false);
      }
    };

    fetchProfile();
  }, [token, navigate, API_URL]);

  // Fetch Overview
  useEffect(() => {
    if (!token) return;

    const fetchOverview = async () => {
      try {
        const res = await axios.get(`${API_URL}/api/analytics_overview`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setOverview(res.data);
      } catch (err) {
        alert(err.response?.data?.message || "Session expired, please login again!");
        localStorage.removeItem("token");
        navigate("/login");
      } finally {
        setLoadingOverview(false);
      }
    };

    fetchOverview();
  }, [token, navigate, API_URL]);

  const handleDownloadCSV = async () => {
    try {
      const res = await fetch(`${API_URL}/api/expenses/download`, {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to download CSV");
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "expenses.csv";
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (err) {
      alert("Error downloading CSV file!");
      console.error(err);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    alert("Logged out successfully!");
    navigate("/login");
  };

  if (loadingProfile || loadingOverview) return <p>Loading profile...</p>;

  return (
    <div className="card profile-card">
    <h1 className="h1-title">Profile</h1>
      <p><strong>Username:</strong> {profile.username}</p>
      <p><strong>Email:</strong> {profile.email}</p>
      {overview && (
        <div>
          <p><strong>Total Income:</strong> ₹{overview.total_income}</p>
          <p><strong>Total Expenses:</strong> ₹{overview.total_expenses}</p>
          <p><strong>Available Balance:</strong> ₹{overview.available_balance}</p>
        </div>
      )}
      <div>
        <strong>Download CSV:</strong>
        <button type="button"className="button-8b" onClick={handleDownloadCSV}style={{ marginLeft: "10px" }}> 
          Download</button>
          </div>
      <button type="button" className="button-8b" onClick={handleLogout} style={{ marginLeft: "10px" }}>
        Logout
      </button>
    </div>
  );
}