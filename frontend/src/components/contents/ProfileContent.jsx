import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate, Link } from "react-router-dom";

// ✅ Common API URL
const API_URL =
  process.env.REACT_APP_API_URL ||
  "https://vitya-ai-qlbn.onrender.com";

// ================= REGISTER =================
export function Register() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();

    if (!username.trim() || !email.trim() || !password.trim()) {
      alert("All fields are required");
      return;
    }

    if (password.length < 6) {
      alert("Password must be at least 6 characters");
      return;
    }

    setLoading(true);

    try {
      const res = await axios.post(`${API_URL}/api/users/register`, {
        username: username.trim(),
        email: email.trim(),
        password,
      });

      if (res.status === 200 || res.status === 201) {
        alert(res.data.message || "Registration successful!");

        if (res.data.token) {
          localStorage.setItem("token", res.data.token);
          navigate("/profile");
        } else {
          navigate("/login");
        }
      } else {
        alert("Registration failed");
      }
    } catch (err) {
      console.error(err);
      alert(
        err.response?.data?.detail ||
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
      <button
        type="button"
        className="button-8b"
        onClick={() => navigate("/")}
      >
        ← Go to Home
      </button>

      <h1 className="h1-title">Register</h1>

      <form onSubmit={handleRegister}>
        <input
          disabled={loading}
          type="text"
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />

        <input
          disabled={loading}
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <input
          disabled={loading}
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <button type="submit" className="button-8b" disabled={loading}>
          {loading ? "Registering..." : "Register"}
        </button>
      </form>

      <div>
        Already registered? <Link to="/login">Login</Link>
      </div>
    </div>
  );
}

// ================= LOGIN =================
export function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();

    if (!username.trim() || !password.trim()) {
      alert("All fields are required");
      return;
    }

    setLoading(true);

    try {
      const res = await axios.post(`${API_URL}/api/users/login`, {
        username: username.trim(),
        password,
      });

      if (res.status === 200 && res.data.token) {
        localStorage.setItem("token", res.data.token);
        alert("Login successful!");
        navigate("/profile");
      } else {
        alert("Invalid login response");
      }
    } catch (err) {
      console.error(err);
      alert(
        err.response?.data?.detail ||
          err.response?.data?.error ||
          "Login failed"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card form-card">
      <button
        type="button"
        className="button-8b"
        onClick={() => navigate("/")}
      >
        ← Go to Home
      </button>

      <h1 className="h1-title">Login</h1>

      <form onSubmit={handleLogin}>
        <input
          disabled={loading}
          type="text"
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />

        <input
          disabled={loading}
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <button type="submit" className="button-8b" disabled={loading}>
          {loading ? "Logging in..." : "Login"}
        </button>
      </form>

      <div>
        Not registered yet? <Link to="/register">Register</Link>
      </div>
    </div>
  );
}

// ================= PROFILE =================
export function Profile() {
  const [profile, setProfile] = useState({ username: "", email: "" });
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);

  const navigate = useNavigate();

  // ✅ Redirect if not logged in
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login");
      return;
    }

    const fetchData = async () => {
      try {
        const res1 = await axios.get(`${API_URL}/api/users/profile`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        setProfile({
          username: res1.data.username,
          email: res1.data.email,
        });

        const res2 = await axios.get(
          `${API_URL}/api/vitya/financial_overview`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        setOverview(res2.data);
      } catch (err) {
        console.error(err);
        alert("Session expired, please login again");
        localStorage.removeItem("token");
        navigate("/login");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [navigate]);

  const handleDownloadCSV = async () => {
    const token = localStorage.getItem("token");

    try {
      const res = await fetch(`${API_URL}/api/vitya/csv`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = "expenses.csv";
      a.click();
    } catch (err) {
      alert("CSV download failed");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/login");
  };

  if (loading) return <p>Loading profile...</p>;

  return (
    <div className="card profile-card">
      <button
        type="button"
        className="button-8b"
        onClick={() => navigate("/")}
      >
        ← Go to Home
      </button>

      <h2>{profile.username}</h2>
      <p>{profile.email}</p>

      {overview && (
        <div>
          <p>Income: ₹{overview.total_income}</p>
          <p>Expenses: ₹{overview.total_expenses}</p>
          <p>Balance: ₹{overview.available_balance}</p>
        </div>
      )}

      <button className="button-8b" onClick={handleDownloadCSV}>
        Download CSV
      </button>

      <button className="button-8b" onClick={handleLogout}>
        Logout
      </button>
    </div>
  );
}