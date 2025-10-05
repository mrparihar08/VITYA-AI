import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate, Link } from "react-router-dom";

export function Register() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";

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
          <div className="cards form-card">
            <h2>Register</h2>
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

  const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";

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
          <div className="cards form-card">
            <h2>Login</h2>
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
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";
  const token = localStorage.getItem("token");

  useEffect(() => {
    if (!token) {
      navigate("/login");
      return;
    }

    const fetchProfile = async () => {
      try {
        const res = await axios.get(`${API_URL}/api/profile`, {
          headers: { Authorization:`Bearer ${token}`},
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
        setLoading(false);
      }
    };

    fetchProfile();
  }, [token, navigate, API_URL]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    alert("Logged out successfully!");
    navigate("/login");
  };

  if (loading) return <p>Loading profile...</p>;

  return (
    <div className="card profile-card">
      <h2>Welcome!</h2>
      <p><strong>Username:</strong> {profile.username}</p>
      <p><strong>Email:</strong> {profile.email}</p>
      <button type="button" className='button-8b' onClick={handleLogout} style={{ marginLeft: '10px' }}>Logout</button>
    </div>
  );
}