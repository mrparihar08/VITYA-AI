import { useEffect, useState } from 'react';
import axios from 'axios';

export default function AdviceContent() {
  const [token, setToken] = useState('');
  const [advice, setAdvice] = useState([]);
  const [loading, setLoading] = useState(false);

  const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";

  useEffect(() => {
    const savedToken = localStorage.getItem('token');
    if (savedToken) setToken(savedToken);
  }, []);

  const authHeaders = () => ({ headers: { Authorization: `Bearer ${token}` } });

 const handleGetAdvice = async () => {
  setLoading(true);
  try {
      const res = await axios.get(`${API_URL}/api/advice`, authHeaders());
      setAdvice(res.data.recommendations || []);
    } catch (err) {
      alert(err.response?.data?.error || 'Error getting advice');
    }
  finally { setLoading(false); }
};
useEffect(() => {
  if(token) handleGetAdvice();
}, [token]);

  return (
        <div className="card advice-card">
  <h2>Expense Advice</h2>
  <button className='button-8b' onClick={handleGetAdvice} disabled={loading}>
    {loading ? 'Loading...' : 'Advice'}
  </button>
  
  {advice.length > 0 && (
    <div className="advice-grid">
      <h3>Advice:</h3>
      {advice.map((rec, idx) => (
        <div key={idx} className="advice-item">
          <span className="category">{rec.category}:</span>
          <span className="value">{rec.advice || 'No advice'}</span>
          <span className="prediction">(Predicted: {rec.predicted_next_month?.toFixed(2) ?? 'N/A'})</span>
        </div>
      ))}
    </div>
  )}
</div>

  );
}
