import { useEffect, useState } from "react";
import axios from "axios";

export default function AdviceContent() {

  const [token, setToken] = useState("");
  const [category, setCategory] = useState("");
  const [prediction, setPrediction] = useState(null);
  const [advisor, setAdvisor] = useState(null);
  const [overspending, setOverspending] = useState(null);
  const [anomaly, setAnomaly] = useState([]);

  const API_URL = process.env.REACT_APP_API_URL || "http://127.0.0.1:8000";

  // Load token
  useEffect(() => {
    const savedToken = localStorage.getItem("token");
    if (savedToken) setToken(savedToken);
  }, []);

  const authHeaders = () => ({
    headers: { Authorization: `Bearer ${token}` }
  });

  const getAIAdvice = async () => {

    if (!category || !token) return;

    try {

      const predict = await axios.get(
        `${API_URL}/ai/predict/${category}`,
        authHeaders()
      );

      const advisorRes = await axios.get(
        `${API_URL}/ai/advisor/${category}`,
        authHeaders()
      );

      const over = await axios.get(
        `${API_URL}/ai/overspending/${category}`,
        authHeaders()
      );

      const anomaly = await axios.get(
        `${API_URL}/ai/anomaly/${category}`,
        authHeaders()
      );

      setPrediction(predict.data);
      setAdvisor(advisorRes.data);
      setOverspending(over.data);
      setAnomaly(anomaly.data)

    } catch (err) {
      console.log("AI error");
    }
  };

  // refresh function
  const refreshAdvice = () => {
    getAIAdvice();
  };

  // auto load + refresh
  useEffect(() => {

    refreshAdvice();

    const interval = setInterval(() => {
      refreshAdvice();
    }, 30000); // 30 sec refresh

    return () => clearInterval(interval);

  }, [token, category]);

  return (
    <div className="card advice-card">

      <h1 className="h1-title">AI Financial Advisor</h1>

      <input
        type="text"
        placeholder="Enter category (food, travel...)"
        value={category}
        onChange={(e) => setCategory(e.target.value)}
        className="input-box"
      />

      {prediction && (
        <div className="advice-item">
          <h3>Prediction</h3>
          Next Month Expense: ₹{prediction.predicted_next_month_expense.toFixed(2)}
        </div>
      )}

      {advisor && (
        <div className="advice-item">
          <h3>Advisor</h3>
          <p>{advisor.advice}</p>
          <p>Recommended Budget: ₹{advisor.recommended_budget.toFixed(2)}</p>
        </div>
      )}

      {overspending && (
        <div className="advice-item">
          <h3>Overspending Check</h3>
          <p>Average: ₹{overspending.average_spending}</p>
          <p>Last Expense: ₹{overspending.last_spending}</p>
          <p>
            Status: {overspending.overspending ? "⚠ Overspending" : "✅ Normal"}
          </p>
        </div>
      )}
      {anomaly.length > 0 && (
      <div>
          <h2>|| Anomaly Detection ||</h2>
          {anomaly.map((a, i) => (
            <div key={i}>
              ₹{a.amount} on {a.date}
            </div>
          ))}
        </div>
      )}

    </div>
  );
}