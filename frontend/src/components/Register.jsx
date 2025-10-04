import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

export default function Register() {
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

      // ✅ Show message
      alert(res.data.message || "Registration successful!");

      // ✅ If token is returned → save & redirect
      if (res.data.token) {
        localStorage.setItem("token", res.data.token);
        navigate("/dashboard"); // redirect after signup
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
          <div className="card  regicter-form-card">
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
          </div>
  );
}
