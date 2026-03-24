import React, { useState, useEffect, useRef } from "react";
import {
  BarChart, Bar,
  LineChart, Line,
  PieChart, Pie, Cell,
  AreaChart, Area,
  CartesianGrid,
  ComposedChart,
  XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
  ScatterChart, Scatter,
  RadarChart, Radar,
  PolarGrid, PolarAngleAxis, PolarRadiusAxis
} from "recharts";

const CHAT_TYPES = [
  "bar",
  "chart",
  "line_chart", // keep only this
  "pie",
  "donut",
  "area",
  "composed",
  "multi_line",
  "scatter",
  "radar",
  "heatmap",
  "waterfall",
  "stacked", // ADD THIS
  "qr",        // ✅ ADD
  "barcode"    // ✅ ADD
];

const Chatbot = () => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [listening, setListening] = useState(false);

  const token = localStorage.getItem("token");
  const bottomRef = useRef(null);

  const recognitionRef = useRef(null);
  const isSpeakingRef = useRef(false);

  // ---------------- INIT SPEECH ---------------- //
  useEffect(() => {
    if ("webkitSpeechRecognition" in window) {
      const rec = new window.webkitSpeechRecognition();
      rec.continuous = false;
      rec.interimResults = false;
      rec.lang = "en-IN";
      recognitionRef.current = rec;
    }
  }, []);

  // ---------------- AUTO SCROLL ---------------- //
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // ---------------- TEXT TO SPEECH ---------------- //
  const speak = (text) => {
    if (!text || isSpeakingRef.current) return;

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-IN";

    isSpeakingRef.current = true;

    utterance.onend = () => {
      isSpeakingRef.current = false;
    };

    utterance.onerror = () => {
      isSpeakingRef.current = false;
    };

    window.speechSynthesis.speak(utterance);
  };

  // ---------------- VOICE INPUT ---------------- //
  const preprocessVoice = (text) => {
    return (text || "").toLowerCase().replace(/\b(rupees|rs|rupee)\b/g, "").trim();
  };

  const startListening = () => {
    const recognition = recognitionRef.current;

    if (!recognition) {
      alert("Voice not supported");
      return;
    }

    if (listening) {
      recognition.stop();
      setListening(false);
      return;
    }

    if (isSpeakingRef.current) return;

    setListening(true);

    recognition.onresult = (event) => {
      if (!event.results || !event.results[0]) return;

      const speechText = preprocessVoice(event.results[0][0].transcript);

      setListening(false);
      sendMessage(speechText);
    };

    recognition.onerror = () => {
      setListening(false);
    };

    recognition.onend = () => {
      setListening(false);
    };

    try {
      recognition.start();
    } catch (err) {
      setListening(false);
      console.error("Speech recognition start error:", err);
    }
  };

  // ---------------- FILE DOWNLOAD HELPERS ---------------- //
  const downloadBlob = async (res, filename) => {
    const blob = await res.blob();
    const fileUrl = window.URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = fileUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();

    a.remove();
    window.URL.revokeObjectURL(fileUrl);
  };

  const handleFileResponse = async (res, contentType) => {
    const lower = (contentType || "").toLowerCase();

    if (lower.includes("text/csv")) {
      await downloadBlob(res, "chat_data.csv");
      setMessages((prev) => [...prev, { sender: "bot", text: "CSV downloaded ✅" }]);
      return true;
    }

    if (lower.includes("wordprocessingml.document") || lower.includes("application/msword")) {
      await downloadBlob(res, "chat_data.docx");
      setMessages((prev) => [...prev, { sender: "bot", text: "DOC downloaded ✅" }]);
      return true;
    }

    if (lower.includes("application/pdf")) {
      await downloadBlob(res, "chat_data.pdf");
      setMessages((prev) => [...prev, { sender: "bot", text: "PDF downloaded ✅" }]);
      return true;
    }

    if (lower.includes("presentationml.presentation") || lower.includes("powerpoint")) {
      await downloadBlob(res, "chat_data.pptx");
      setMessages((prev) => [...prev, { sender: "bot", text: "PPT downloaded ✅" }]);
      return true;
    }

    return false;
  };

  // ---------------- SEND MESSAGE ---------------- //
  const sendMessage = async (voiceText = null) => {
    const messageToSend = (voiceText || input).trim();
    if (!messageToSend) return;

    const userMessage = { sender: "user", text: messageToSend };
    setMessages((prev) => [...prev, userMessage]);
    setLoading(true);

    try {
      const res = await fetch("https://vitya-ai-qlbn.onrender.com/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ message: messageToSend }),
      });

      if (!res.ok) {
        throw new Error(`Request failed: ${res.status}`);
      }

      const contentType = res.headers.get("content-type") || "";

      // File response
      if (await handleFileResponse(res, contentType)) {
        return;
      }

      // JSON response
      const data = await res.json();

      const botContent = data.reply ?? data.content ?? "No response";

      const botMessage = {
        sender: "bot",
        type: data.type || "text",
        text: botContent,
      };

      setMessages((prev) => [...prev, botMessage]);

      if (typeof botContent === "string") {
        speak(botContent);
      }
    } catch (error) {
      console.error(error);
      setMessages((prev) => [...prev, { sender: "bot", text: "Server error ❌" }]);
    } finally {
      setLoading(false);
      setInput("");
    }
  };

  // ---------------- FORMAT MONTH ---------------- //
  const formatMonth = (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-IN", {
      month: "short",
      year: "numeric",
    });
  };

  const COLORS = ["#8884d8", "#82ca9d", "#ffc658", "#ff8042"];

  // ---------------- CHART ---------------- //
  const renderChart = (msg) => {
    let data = msg.text;

    if (msg.type === "multi_line") {
      const incomeData = data?.income || [];
      const expenseData = data?.expense || [];

      const merged = {};

      incomeData.forEach((i) => {
        merged[i.month] = {
          month: formatMonth(i.month),
          income: i.amount,
          expense: 0,
        };
      });

      expenseData.forEach((e) => {
        if (merged[e.month]) {
          merged[e.month].expense = e.amount;
        } else {
          merged[e.month] = {
            month: formatMonth(e.month),
            income: 0,
            expense: e.amount,
          };
        }
      });

      data = Object.values(merged);
    }

    if (!Array.isArray(data)) return null;

    const xKey = data[0]?.category ? "category" : "month";

    switch (msg.type) {
      case "bar":
      case "chart":
        return (
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey={xKey} />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="amount" fill="#8884d8" />
          </BarChart>
        );

      case "line":
      case "line_chart":
        return (
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey={xKey} />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="amount" stroke="#8884d8" />
          </LineChart>
        );

      case "multi_line":
        return (
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line dataKey="income" stroke="#00c853" />
            <Line dataKey="expense" stroke="#ff1744" />
          </LineChart>
        );

      case "pie":
      case "donut":
        return (
          <PieChart>
            <Pie data={data} dataKey="amount" nameKey={xKey} innerRadius={msg.type === "donut" ? 50 : 0} outerRadius={80}>
              {data.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        );

      case "composed":
        return (
          <ComposedChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey={xKey} />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="amount" fill="#8884d8" />
            <Line type="monotone" dataKey="amount" stroke="#ff7300" />
          </ComposedChart>
        );

      case "area":
        return (
          <AreaChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey={xKey} />
            <YAxis />
            <Tooltip />
            <Area type="monotone" dataKey="amount" fill="#8884d8" stroke="#8884d8" />
          </AreaChart>
        );

      case "scatter":
        return (
          <ScatterChart>
            <CartesianGrid />
            <XAxis dataKey="x" type="number" />
            <YAxis dataKey="y" type="number" />
            <Tooltip />
            <Scatter data={data} fill="#8884d8" />
          </ScatterChart>
        );
      case "stacked":
  return (
    <BarChart data={data}>
      <CartesianGrid strokeDasharray="3 3" />
      <XAxis dataKey={xKey} />
      <YAxis />
      <Tooltip />
      <Legend />
      <Bar dataKey="amount" stackId="a" fill="#8884d8" />
    </BarChart>
  );
      case "radar":
        return (
          <RadarChart data={data}>
            <PolarGrid />
            <PolarAngleAxis dataKey="category" />
            <PolarRadiusAxis />
            <Radar dataKey="amount" fill="#8884d8" stroke="#8884d8" />
          </RadarChart>
        );

      case "heatmap":
        return (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 4 }}>
            {data.map((item, i) => (
              <div
                key={i}
                style={{
                  height: 30,
                  background: `rgba(0,128,0, ${Math.min((item.amount || 0) / 1000, 1)})`,
                }}
              />
            ))}
          </div>
        );

      case "waterfall":
        return (
          <BarChart data={data}>
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="amount" fill="#8884d8" />
          </BarChart>
        );

      default:
        return <div>No chart available</div>;
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.chatBox}>
        {messages.map((msg, i) => (
          <div
            key={i}
            style={{
              ...styles.message,
              alignSelf: msg.sender === "user" ? "flex-end" : "flex-start",
              background: msg.sender === "user" ? "#17333a" : "#e5e5ea",
              color: msg.sender === "user" ? "white" : "black",
            }}
          >
{["image", "qr", "barcode"].includes(msg.type) ? (
  <div>
    <img
      src={`data:image/png;base64,${msg.text || msg.content}`}
      alt="Generated"
      style={{ width: 200 }}
    />
    
    {/* Download button */}
    <button
      onClick={() => {
        const link = document.createElement("a");
        link.href = `data:image/png;base64,${msg.text || msg.content}`;
        link.download = "code.png";
        link.click();
      }}
    >
      Download
    </button>
  </div>
) : CHAT_TYPES.includes(msg.type) ? (
              <div style={{ width: 300, height: 200 }}>
                <ResponsiveContainer width="100%" height="100%">
                  {renderChart(msg)}
                </ResponsiveContainer>
              </div>
            ) : (
              <span>
                {typeof msg.text === "string" ? msg.text : "Chart data received"}
              </span>
            )}
          </div>
        ))}

        {loading && <div>Bot typing...</div>}
        <div ref={bottomRef} />
      </div>

      <div style={styles.inputArea}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type or speak..."
          style={styles.input}
          onKeyDown={(e) => e.key === "Enter" && sendMessage()}
        />

        <button onClick={() => sendMessage()} style={styles.button}>
          <img src="/send.png" alt="Send" style={{ width: "20px", height: "20px" }} />
        </button>

        <button onClick={startListening} style={styles.mic}>
          <img
            src="/mic.png"
            alt="Mic"
            style={{ width: "24px", height: "24px" }}
          />
        </button>
      </div>
    </div>
  );
};

export default Chatbot;

const styles = {
  container: {
    width: "100%",
    height: "100%",
    display: "flex",
    flexDirection: "column",
  },
  chatBox: {
    flex: 1,
    overflowY: "auto",
    display: "flex",
    flexDirection: "column",
    padding: 10,
  },
  message: {
    padding: 10,
    borderRadius: 10,
    margin: 5,
    maxWidth: "70%",
  },
  inputArea: {
    display: "flex",
    borderTop: "1px solid #ccc",
  },
  input: {
    flex: 1,
    padding: 10,
  },
  button: {
    padding: 12,
    background: "#9d77ff",
    color: "#fff",
    border: "none",
    borderRadius: "55px",
  },
  mic: {
    padding: 10,
    background: "#17333a",
    color: "#fff",
    border: "none",
    borderRadius: "50px",
  },
};