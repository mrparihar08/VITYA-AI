import React, {useState} from "react";
import axios from "axios";
import {useNavigate} from "react-router-dom";

export default function Login() {
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
        navigate("/dashboard"); // redirect after login
      }
    } catch (err) {
      alert(err.response?.data?.error || "login failed");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    alert("Logged out successfully!");
    navigate("/login"); // send back to login page
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
              <button type="button" className='button-8b' onClick={handleLogout} style={{ marginLeft: '10px' }}>Logout</button>
            </form>
          </div>
  );
}
