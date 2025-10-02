import React, { useState, useEffect } from 'react';
import axios from 'axios';

export default function Graphs() {
  const [token, setToken] = useState('');
  const [graphBase64, setGraphBase64] = useState('');

  const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";

  useEffect(() => {
    const savedToken = localStorage.getItem('token');
    if (savedToken) setToken(savedToken);
  }, []);

  const authHeaders = () => ({ headers: { Authorization: `Bearer ${token}` } });

  const handleGetGraph = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/expenses/graph`, authHeaders());
      setGraphBase64(res.data.graph || '');
    } catch (err) {
      alert(err.response?.data?.error || 'Error fetching graph');
    }
  };

  return (
    <div className="card graph-card">
      <h2>Expense Graph</h2>
      <button onClick={handleGetGraph}>View Graph</button>
      {graphBase64 && <img src={`data:image/png;base64,${graphBase64}`} alt="Expense Graph" />}
    </div>
  );
}
