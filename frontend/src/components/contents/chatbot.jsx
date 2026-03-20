import React, { useState, useEffect, useRef } from "react";
import {
  BarChart, Bar,
  LineChart, Line,
  PieChart, Pie, Cell,
  AreaChart, Area,
  CartesianGrid,
  ComposedChart,
  XAxis, YAxis, Tooltip, ResponsiveContainer, Legend
} from "recharts";

const Chatbot = () => {

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [listening, setListening] = useState(false);

  const token = localStorage.getItem("token");
  const bottomRef = useRef(null);

  // 🔥 SAFE REFS
  const recognitionRef = useRef(null);
  const isSpeakingRef = useRef(false);

  // ---------------- INIT SPEECH ---------------- //
  useEffect(() => {
    if ("webkitSpeechRecognition" in window) {
      const rec = new window.webkitSpeechRecognition();
      rec.continuous = false;
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

    speechSynthesis.cancel(); // 🔥 stop previous speech

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-IN";

    isSpeakingRef.current = true;

    utterance.onend = () => {
      isSpeakingRef.current = false;
      startListening(); // 🔥 resume listening
    };

    speechSynthesis.speak(utterance);
  };

  // ---------------- VOICE INPUT ---------------- //
  const preprocessVoice = (text) => {
    return text.toLowerCase().replace(/rupees|rs/g, "").trim();
  };

  const startListening = () => {
    const recognition = recognitionRef.current;

    if (!recognition) {
      alert("Voice not supported in this browser");
      return;
    }

    // 🔥 prevent loop
    if (isSpeakingRef.current) return;

    setListening(true);

    try {
      recognition.start();
    } catch {
      return;
    }

    recognition.onresult = (event) => {
      const speechText = preprocessVoice(event.results[0][0].transcript);

      setListening(false);
      sendMessage(speechText); // 🔥 auto send
    };

    recognition.onerror = () => {
      setListening(false);
    };

    recognition.onend = () => {
      setListening(false);
    };
  };

  // ---------------- SEND MESSAGE ---------------- //
  const sendMessage = async (voiceText = null) => {
    const messageToSend = voiceText || input;

    if (!messageToSend.trim()) return;

    const userMessage = { sender: "user", text: messageToSend };
    setMessages((prev) => [...prev, userMessage]);

    setLoading(true);

    try {
      const res = await fetch("http://127.0.0.1:8000/chat/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ message: messageToSend }),
      });

      const data = await res.json();

      const botMessage = {
        sender: "bot",
        type: data.type || "text",
        text: data.content,
      };

      setMessages((prev) => [...prev, botMessage]);

      // 🔊 SPEAK
      if (typeof data.content === "string") {
        speak(data.content);
      }

    } catch {
      setMessages((prev) => [
        ...prev,
        { sender: "bot", text: "Server error ❌" },
      ]);
    }

    setLoading(false);
    setInput("");
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

  // ---------------- CHART RENDER ---------------- //
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
            <XAxis dataKey={xKey} />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line dataKey="amount" stroke="#8884d8" />
          </LineChart>
        );

      case "multi_line":
        return (
          <LineChart data={data}>
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line dataKey="income" stroke="#00c853" />
            <Line dataKey="expense" stroke="#ff1744" />
          </LineChart>
        );

      case "pie":
        return (
          <PieChart>
            <Pie data={data} dataKey="amount" nameKey={xKey}>
              {data.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        );

      case "area":
        return (
          <AreaChart data={data}>
            <XAxis dataKey={xKey} />
            <YAxis />
            <Tooltip />
            <Area dataKey="amount" fill="#8884d8" />
          </AreaChart>
        );

      case "composed":
        return (
          <ComposedChart data={data}>
            <XAxis dataKey={xKey} />
            <YAxis />
            <Tooltip />
            <Bar dataKey="amount" />
            <Line dataKey="amount" />
          </ComposedChart>
        );

      default:
        return null;
    }
  };

  return (
    <div style={styles.container}>

      <div style={styles.chatBox}>
        {messages.map((msg, i) => (
          <div key={i} style={{
            ...styles.message,
            alignSelf: msg.sender === "user" ? "flex-end" : "flex-start",
            background: msg.sender === "user" ? "#17333a" : "#e5e5ea",
            color: msg.sender === "user" ? "white" : "black",
          }}>
            {["bar","chart","line","line_chart","pie","area","composed","multi_line"].includes(msg.type) ? (
              <div style={{ width: 300, height: 200 }}>
                <ResponsiveContainer>
                  {renderChart(msg)}
                </ResponsiveContainer>
              </div>
            ) : (
              <span>{msg.text}</span>
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
          Send
        </button>

        <button onClick={startListening} style={styles.mic}>
          {listening ? "🎤 Listening..." : "🎤"}
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
    padding: 10,
    background: "#9d77ff",
    color: "#fff",
    border: "none",
  },
  mic: {
    padding: 10,
    background: "#17333a",
    color: "#fff",
    border: "none",
  },
};