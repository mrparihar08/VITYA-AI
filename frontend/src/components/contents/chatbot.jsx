import React, { useState, useEffect, useRef } from "react";
import html2canvas from "html2canvas";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  CartesianGrid,
  ComposedChart,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ScatterChart,
  Scatter,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
} from "recharts";

const CHAT_TYPES = new Set([
  "bar",
  "chart",
  "line",
  "line_chart",
  "pie",
  "donut",
  "area",
  "composed",
  "multi_line",
  "scatter",
  "radar",
  "heatmap",
  "waterfall",
  "stacked",
]);

const MEDIA_TYPES = new Set(["image", "qr", "barcode"]);
const COLORS = ["#8884d8", "#82ca9d", "#ffc658", "#ff8042", "#ff6b6b", "#4dabf7"];
const CHART_HEIGHT = 240;

const Chatbot = () => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [listening, setListening] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);

  const token = localStorage.getItem("token");
  const bottomRef = useRef(null);
  const recognitionRef = useRef(null);
  const isSpeakingRef = useRef(false);
  const chartRefs = useRef({});
  const forceStopRef = useRef(false);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.continuous = false;
      rec.interimResults = false;
      rec.lang = "en-IN";
      recognitionRef.current = rec;
    }
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const speak = (text) => {
    if (!text || isSpeakingRef.current) return;
    if (!window.speechSynthesis || typeof SpeechSynthesisUtterance === "undefined") return;

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

  const preprocessVoice = (text) => {
    return (text || "")
      .toLowerCase()
      .replace(/\b(rupees|rs|rupee)\b/g, "")
      .trim();
  };

  const stopRecognition = () => {
    const recognition = recognitionRef.current;
    if (!recognition) return;

    forceStopRef.current = true;

    try {
      recognition.stop();
    } catch {}
    setListening(false);
  };

  const startListening = () => {
  const recognition = recognitionRef.current;

  if (!recognition) {
    alert("Voice not supported");
    return;
  }

  if (!voiceEnabled) return;   // 👈 block start if disabled

  if (listening) {
    stopRecognition();
    return;
  }

  if (isSpeakingRef.current) return;

  forceStopRef.current = false;   // 👈 reset

  setListening(true);

  recognition.onresult = (event) => {
    const speechText = event?.results?.[0]?.[0]?.transcript;
    if (!speechText) {
      setListening(false);
      return;
    }

    const cleaned = preprocessVoice(speechText);
    setListening(false);
    sendMessage(cleaned);
  };

  recognition.onerror = () => setListening(false);

  recognition.onend = () => {
    if (forceStopRef.current) return;   // 👈 stop loop
    setListening(false);
  };

  try {
    recognition.start();
  } catch (err) {
    setListening(false);
    console.error("Speech recognition start error:", err);
  }
};

  const toggleVoiceEnabled = () => {
    setVoiceEnabled((prev) => {
      const next = !prev;
      if (!next) {
        forceStopRef.current = true;
        stopRecognition();
      }
      return next;
    });
  };

  const getMicIcon = () => {
    if (listening) return "/speak.png";
    if (!voiceEnabled) return "/mic-off.png";
    return "/mic.png";
  };

  const handleMicClick = () => {
    if (!voiceEnabled) {
      setVoiceEnabled(true);
      setTimeout(() => startListening(), 50);
      return;
    }

    startListening();
  };

  useEffect(() => {
  return () => {
    recognitionRef.current?.stop();
  };
}, []);

  const downloadBlob = async (res, filename) => {
    const blob = await res.blob();
    const fileUrl = window.URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = fileUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();

    setTimeout(() => window.URL.revokeObjectURL(fileUrl), 1000);
  };

  const downloadTextFile = (text, filename) => {
    const blob = new Blob([text || ""], { type: "text/plain;charset=utf-8" });
    const url = window.URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();

    setTimeout(() => window.URL.revokeObjectURL(url), 1000);
  };

  const handleFileResponse = async (res, contentType) => {
    const lower = (contentType || "").toLowerCase();

    if (lower.includes("text/csv")) {
      await downloadBlob(res, "chat_data.csv");
      setMessages((prev) => [...prev, { sender: "bot", type: "text", text: "CSV downloaded ✅" }]);
      return true;
    }

    if (
      lower.includes("application/vnd.openxmlformats-officedocument.wordprocessingml.document") ||
      lower.includes("wordprocessingml.document") ||
      lower.includes("application/msword")
    ) {
      await downloadBlob(res, "chat_data.docx");
      setMessages((prev) => [...prev, { sender: "bot", type: "text", text: "DOCX downloaded ✅" }]);
      return true;
    }

    if (lower.includes("application/pdf")) {
      await downloadBlob(res, "chat_data.pdf");
      setMessages((prev) => [...prev, { sender: "bot", type: "text", text: "PDF downloaded ✅" }]);
      return true;
    }

    if (
      lower.includes("application/vnd.openxmlformats-officedocument.presentationml.presentation") ||
      lower.includes("presentationml.presentation") ||
      lower.includes("powerpoint")
    ) {
      await downloadBlob(res, "chat_data.pptx");
      setMessages((prev) => [...prev, { sender: "bot", type: "text", text: "PPTX downloaded ✅" }]);
      return true;
    }

    return false;
  };

  const sendMessage = async (voiceText = null) => {
      const isVoiceMessage = !!voiceText;   // ⭐ track source
      const messageToSend = (voiceText || input).trim();
    if (!messageToSend || loading) return;

    setMessages((prev) => [...prev, { sender: "user", type: "text", text: messageToSend }]);
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

      if (!res.ok) throw new Error(`Request failed: ${res.status}`);

      const contentType = res.headers.get("content-type") || "";

      if (await handleFileResponse(res, contentType)) return;

      let data = {};
      try {
        data = await res.json();
      } catch {
        data = {};
      }

      const payload =
        data?.content ?? data?.data ?? data?.reply ?? data?.result ?? data?.message ?? data?.payload ?? null;

      const botMessage = {
        sender: "bot",
        type: data?.type || "text",
        text: typeof payload === "string" ? payload : "",
        content: payload,
      };

     setMessages((prev) => {
        const updated = [...prev, botMessage];

  // ⭐ Only auto speak if user used voice
        if (isVoiceMessage) {
           const speakText = getSpeakText(botMessage);
           if (speakText) {
             setTimeout(() => speak(speakText), 300);
    }
  }

        return updated;
      });
    } catch (error) {
      console.error(error);
      setMessages((prev) => [...prev, { sender: "bot", type: "text", text: "Server error ❌" }]);
    } finally {
      setLoading(false);
      setInput("");
    }
  };

  const formatMonth = (dateStr) => {
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString("en-IN", { month: "short", year: "numeric" });
  };

  const parseMaybeJSON = (value) => {
    if (typeof value !== "string") return value;

    const trimmed = value.trim();
    if (!trimmed) return value;

    if (
      (trimmed.startsWith("{") && trimmed.endsWith("}")) ||
      (trimmed.startsWith("[") && trimmed.endsWith("]"))
    ) {
      try {
        return JSON.parse(trimmed);
      } catch {
        return value;
      }
    }

    return value;
  };

  const normalizeMultiLineData = (data) => {
    if (!data || typeof data !== "object" || Array.isArray(data)) return data;

    const incomeData = data.income || [];
    const expenseData = data.expense || [];
    const merged = {};

    incomeData.forEach((i) => {
      merged[i.month] = {
        month: formatMonth(i.month),
        income: i.amount ?? 0,
        expense: 0,
      };
    });

    expenseData.forEach((e) => {
      if (merged[e.month]) {
        merged[e.month].expense = e.amount ?? 0;
      } else {
        merged[e.month] = {
          month: formatMonth(e.month),
          income: 0,
          expense: e.amount ?? 0,
        };
      }
    });

    return Object.values(merged);
  };

  const findArrayDeep = (value, depth = 0) => {
    if (depth > 4 || value == null) return null;

    if (Array.isArray(value)) return value;

    const parsed = parseMaybeJSON(value);
    if (Array.isArray(parsed)) return parsed;

    if (parsed && typeof parsed === "object") {
      const preferredKeys = ["data", "items", "rows", "result", "content", "reply", "payload", "chartData"];

      for (const key of preferredKeys) {
        const found = findArrayDeep(parsed[key], depth + 1);
        if (found) return found;
      }

      for (const val of Object.values(parsed)) {
        const found = findArrayDeep(val, depth + 1);
        if (found) return found;
      }
    }

    return null;
  };

  const getChartData = (msg) => {
    const raw = msg.content ?? msg.text ?? msg.data ?? null;

    if (msg.type === "multi_line") {
      const parsed = parseMaybeJSON(raw);
      return normalizeMultiLineData(parsed);
    }

    return findArrayDeep(raw);
  };

  const getKeys = (data, type) => {
    const first = data?.[0] || {};

    let xKey = "category";
    if (first.category !== undefined) xKey = "category";
    else if (first.month !== undefined) xKey = "month";
    else if (first.name !== undefined) xKey = "name";
    else if (first.label !== undefined) xKey = "label";
    else if (first.title !== undefined) xKey = "title";
    else if (first.x !== undefined && type === "scatter") xKey = "x";

    let yKey = "amount";
    if (first.amount !== undefined) yKey = "amount";
    else if (first.value !== undefined) yKey = "value";
    else if (first.count !== undefined) yKey = "count";
    else if (first.y !== undefined && type === "scatter") yKey = "y";

    return { xKey, yKey };
  };

  const renderNews = (msg) => {
    const raw = parseMaybeJSON(msg.content ?? msg.text ?? []);
    const data = Array.isArray(raw) ? raw : [];

    if (!data.length) return <div>No news available</div>;

    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 12, width: "100%" }}>
        {data.map((item, i) => (
          <div
            key={i}
            style={{
              border: "1px solid #ddd",
              borderRadius: 12,
              padding: 12,
              background: "#fff",
              display: "flex",
              flexDirection: "column",
              gap: 8,
              maxWidth: 560,
              boxSizing: "border-box",
            }}
          >
            {item?.image ? (
              <img
                src={item.image}
                alt={item.title || "news"}
                style={{ width: "100%", height: 180, objectFit: "cover", borderRadius: 10 }}
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                }}
              />
            ) : null}

            <div style={{ fontWeight: "bold", fontSize: 16, color: "#111" }}>
              {item?.title || "No title"}
            </div>

            <div style={{ fontSize: 14, color: "#444", lineHeight: 1.5 }}>
              {item?.description || "No description"}
            </div>

            {item?.url ? (
              <a
                href={item.url}
                target="_blank"
                rel="noreferrer"
                style={{
                  display: "inline-block",
                  marginTop: 4,
                  textDecoration: "none",
                  color: "#17333a",
                  fontWeight: "600",
                }}
              >
                Read More →
              </a>
            ) : null}
          </div>
        ))}
      </div>
    );
  };

  const renderWiki = (msg) => {
    const raw = parseMaybeJSON(msg.content ?? {});
    const data = typeof raw === "string" ? parseMaybeJSON(raw) : raw || {};

    if (!data || typeof data !== "object") {
      return <div>No Wikipedia data available</div>;
    }

    return (
      <div
        style={{
          border: "1px solid #ddd",
          borderRadius: 12,
          padding: 12,
          background: "#fff",
          display: "flex",
          flexDirection: "column",
          gap: 10,
          maxWidth: 560,
          boxSizing: "border-box",
        }}
      >
        {data.image ? (
          <img
            src={data.image}
            alt={data.title || "wikipedia"}
            style={{ width: "100%", height: 220, objectFit: "cover", borderRadius: 10 }}
            onError={(e) => {
              e.currentTarget.style.display = "none";
            }}
          />
        ) : null}

        <div style={{ fontWeight: "bold", fontSize: 18, color: "#111" }}>
          {data.title || "Wikipedia"}
        </div>

        <div style={{ fontSize: 14, color: "#444", lineHeight: 1.6 }}>
          {data.summary || "No summary available"}
        </div>

        {data.url ? (
          <a
            href={data.url}
            target="_blank"
            rel="noreferrer"
            style={{
              display: "inline-block",
              textDecoration: "none",
              color: "#17333a",
              fontWeight: "600",
            }}
          >
            Read More →
          </a>
        ) : null}
      </div>
    );
  };

  const downloadChartPNG = async (index, msg) => {
    const element = chartRefs.current[index];
    if (!element) return;

    const canvas = await html2canvas(element, {
      backgroundColor: "#ffffff",
      scale: 2,
    });

    const link = document.createElement("a");
    link.download = `${msg.type || "chart"}_${index + 1}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  };

  const renderChart = (msg) => {
    const type = (msg.type || "").toLowerCase().trim();
    const data = getChartData(msg);

    if (!data || !Array.isArray(data) || data.length === 0) {
      return <div>No chart data</div>;
    }

    const { xKey, yKey } = getKeys(data, type);

    switch (type) {
      case "bar":
      case "chart":
        return (
          <div style={{ width: "100%", overflow: "hidden" }}>
            <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
              <BarChart data={data} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey={xKey} />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey={yKey} fill="#8884d8" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        );

      case "line":
      case "line_chart":
        return (
          <div style={{ width: "100%", overflow: "hidden" }}>
            <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
              <LineChart data={data} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey={xKey} />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey={yKey} stroke="#8884d8" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        );

      case "multi_line":
        return (
          <div style={{ width: "100%", overflow: "hidden" }}>
            <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
              <LineChart data={data} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="income" stroke="#00c853" />
                <Line type="monotone" dataKey="expense" stroke="#ff1744" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        );

      case "pie":
      case "donut":
        return (
          <div style={{ width: "100%", overflow: "hidden" }}>
            <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
              <PieChart>
                <Pie
                  data={data}
                  dataKey={yKey}
                  nameKey={xKey}
                  cx="50%"
                  cy="50%"
                  innerRadius={type === "donut" ? 50 : 0}
                  outerRadius={80}
                >
                  {data.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        );

      case "composed":
        return (
          <div style={{ width: "100%", overflow: "hidden" }}>
            <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
              <ComposedChart data={data} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey={xKey} />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey={yKey} fill="#8884d8" />
                <Line type="monotone" dataKey={yKey} stroke="#ff7300" />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        );

      case "area":
        return (
          <div style={{ width: "100%", overflow: "hidden" }}>
            <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
              <AreaChart data={data} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey={xKey} />
                <YAxis />
                <Tooltip />
                <Area type="monotone" dataKey={yKey} fill="#8884d8" stroke="#8884d8" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        );

      case "scatter":
        return (
          <div style={{ width: "100%", overflow: "hidden" }}>
            <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
              <ScatterChart margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
                <CartesianGrid />
                <XAxis dataKey={xKey} type="number" />
                <YAxis dataKey={yKey} type="number" />
                <Tooltip />
                <Scatter data={data} fill="#8884d8" />
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        );

      case "stacked":
        return (
          <div style={{ width: "100%", overflow: "hidden" }}>
            <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
              <BarChart data={data} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey={xKey} />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey={yKey} stackId="a" fill="#8884d8" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        );

      case "radar":
        return (
          <div style={{ width: "100%", overflow: "hidden" }}>
            <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
              <RadarChart data={data}>
                <PolarGrid />
                <PolarAngleAxis dataKey={xKey} />
                <PolarRadiusAxis />
                <Tooltip />
                <Radar dataKey={yKey} fill="#8884d8" stroke="#8884d8" />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        );

      case "heatmap":
        return (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(7, minmax(0, 1fr))",
              gap: 4,
              width: "100%",
              boxSizing: "border-box",
            }}
          >
            {data.map((item, i) => {
              const value = item.amount ?? item.value ?? item.count ?? 0;
              return (
                <div
                  key={i}
                  style={{
                    height: 30,
                    borderRadius: 4,
                    background: `rgba(0,128,0, ${Math.min(Number(value) / 1000 || 0, 1)})`,
                  }}
                  title={`${item.category || item.name || item.month || i}: ${value}`}
                />
              );
            })}
          </div>
        );

      case "waterfall":
        return (
          <div style={{ width: "100%", overflow: "hidden" }}>
            <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
              <BarChart data={data} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey={xKey} />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey={yKey} fill="#8884d8" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        );

      default:
        return <div>No chart available</div>;
    }
  };

  const getMediaSrc = (msg) => {
    const raw = msg.content ?? msg.text ?? "";
    if (typeof raw !== "string" || !raw) return "";
    if (raw.startsWith("data:image/")) return raw;
    return `data:image/png;base64,${raw}`;
  };

  const getMessageText = (msg) => {
    const type = (msg.type || "").toLowerCase().trim();
    const raw = msg.content ?? msg.text ?? msg.data ?? "";

    if (type === "news") {
      const parsed = parseMaybeJSON(raw);
      const data = Array.isArray(parsed) ? parsed : [];
      if (!data.length) return "News response";

      return data
        .map((item, index) => {
          const title = item?.title ? `Title: ${item.title}` : `News item ${index + 1}`;
          const desc = item?.description ? `Description: ${item.description}` : "";
          const url = item?.url ? `Link: ${item.url}` : "";
          return [title, desc, url].filter(Boolean).join("\n");
        })
        .join("\n\n");
    }

    if (type === "wiki") {
      const parsed = parseMaybeJSON(raw);
      const data = typeof parsed === "string" ? parseMaybeJSON(parsed) : parsed || {};
      if (!data || typeof data !== "object") return "Wikipedia response";

      return [
        data.title ? `Title: ${data.title}` : "",
        data.summary ? `Summary: ${data.summary}` : "",
        data.url ? `Link: ${data.url}` : "",
      ]
        .filter(Boolean)
        .join("\n\n");
    }

    if (MEDIA_TYPES.has(type)) {
      return "Media message";
    }

    if (CHAT_TYPES.has(type)) {
      return typeof raw === "string" ? raw : JSON.stringify(raw, null, 2);
    }

    if (typeof raw === "string") return raw;
    if (raw && typeof raw === "object") return JSON.stringify(raw, null, 2);
    return "";
  };

  const getSpeakText = (msg) => {
    const type = (msg.type || "").toLowerCase().trim();
    const text = getMessageText(msg);

    if (!text) return "";

    if (type === "news") return text;
    if (type === "wiki") return text;
    if (CHAT_TYPES.has(type)) return "Chart response received.";
    if (MEDIA_TYPES.has(type)) return "Media response received.";
    return text;
  };

  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch (err) {
      console.error("Copy failed:", err);
    }
  };

  const handleCopyMessage = async (msg) => {
    const text = getMessageText(msg);
    if (text) await copyToClipboard(text);
  };

  const handleSpeakMessage = (msg) => {
    const text = getSpeakText(msg);
    if (text) speak(text);
  };

  const handleDownloadMessage = (msg, index) => {
    const type = (msg.type || "").toLowerCase().trim();

    if (CHAT_TYPES.has(type)) {
      downloadChartPNG(index, msg);
      return;
    }

    if (MEDIA_TYPES.has(type)) {
      const src = getMediaSrc(msg);
      if (!src) return;

      const link = document.createElement("a");
      link.href = src;
      link.download = `${type || "media"}_${index + 1}.png`;
      link.click();
      return;
    }

    const text = getMessageText(msg);
    if (text) {
      downloadTextFile(text, `${type || "message"}_${index + 1}.txt`);
    }
  };

  const showLanding = messages.length === 0;

  return (
    <div style={styles.page}>
      <style>{`
        .chat-scroll::-webkit-scrollbar {
          display: none;
        }
      `}</style>

      <div style={styles.main}>
        {showLanding ? (
          <div style={styles.hero}>
            <div style={styles.heroText}>
              <div style={styles.heroLine2}>What can I help you with today?</div>
            </div>
          </div>
        ) : (
          <div style={styles.chatArea} className="chat-scroll">
            {messages.map((msg, i) => {
              const type = (msg.type || "").toLowerCase().trim();
              const chartElement = CHAT_TYPES.has(type) ? renderChart(msg) : null;
              const bubbleMaxWidth =
                CHAT_TYPES.has(type) || type === "news" || type === "wiki" ? "95%" : "75%";

              return (
                <div
                  key={i}
                  style={{
                    ...styles.messageRow,
                    justifyContent: msg.sender === "user" ? "flex-end" : "flex-start",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 8,
                      width: "fit-content",
                      maxWidth: bubbleMaxWidth,
                      alignItems: msg.sender === "user" ? "flex-end" : "flex-start",
                    }}
                  >
                    <div
                      style={{
                        ...styles.bubble,
                        background: msg.sender === "user" ? "#17333a" : "#e5e5ea",
                        color: msg.sender === "user" ? "#fff" : "#000",
                        width: "100%",
                      }}
                    >
                      {type === "news" ? (
                        <div
                          ref={(el) => (chartRefs.current[i] = el)}
                          style={{ ...styles.cardWrap, width: "100%" }}
                        >
                          {renderNews(msg)}
                        </div>
                      ) : type === "wiki" ? (
                        <div
                          ref={(el) => (chartRefs.current[i] = el)}
                          style={{ ...styles.cardWrap, width: "100%" }}
                        >
                          {renderWiki(msg)}
                        </div>
                      ) : MEDIA_TYPES.has(type) ? (
                        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                          {getMediaSrc(msg) ? (
                            <img
                              src={getMediaSrc(msg)}
                              alt={type}
                              style={{ width: "100%", maxWidth: 220, height: "auto", display: "block" }}
                              onError={(e) => {
                                e.currentTarget.style.display = "none";
                              }}
                            />
                          ) : (
                            <div>Invalid QR / image data</div>
                          )}
                        </div>
                      ) : CHAT_TYPES.has(type) ? (
                        <div ref={(el) => (chartRefs.current[i] = el)} style={styles.cardWrap}>
                          {chartElement || <div>No chart data</div>}
                        </div>
                      ) : (
                        <span>{typeof msg.text === "string" ? msg.text : JSON.stringify(msg.text)}</span>
                      )}
                    </div>

                    {msg.sender === "bot" && (
                      <div style={styles.messageActions}>
                        <button onClick={() => handleCopyMessage(msg)} style={styles.actionBtn}>
                          <img src="/copy.png" alt="copy" style={{ width: 10, height: 10 }} />
                        </button>

                        <button onClick={() => handleSpeakMessage(msg)} style={styles.actionBtn}>
                          <img src="/speak.png" alt="speak" style={{ width: 10, height: 10 }} />
                        </button>

                        <button onClick={() => handleDownloadMessage(msg, i)} style={styles.actionBtn}>
                          <img src="/downloading.png" alt="download" style={{ width: 10, height: 10 }} />
                        </button>
                        <button onClick={() => alert("Add action here")} style={styles.actionBtn}>
                          <img src="/dots.png" alt="more" style={{ width: 10, height: 10 }} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {loading && <div style={styles.typing}>Bot typing...</div>}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      <div style={styles.bottomDock}>
        <div style={styles.composer}>
          <button onClick={() => alert("Add action here")} style={styles.iconBtn}>
            <img src="/plus.png" alt="Plus" style={{ width: 20, height: 20 }} />
          </button>

          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your message..."
            style={styles.input}
            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
          />

          <button
            onClick={handleMicClick}
            onContextMenu={(e) => {
              e.preventDefault();
              toggleVoiceEnabled();
            }}
            title="Click to talk. Right-click to turn voice on/off."
            style={{
              ...styles.iconBtn,
              background: listening ? "rgba(72,118,255,0.22)" : "transparent",
              boxShadow: listening ? "0 0 0 6px rgba(72,118,255,0.15)" : "none",
            }}
          >
            <img src={getMicIcon()} alt="Mic" style={{ width: 20, height: 20 }} />
          </button>

          <button onClick={() => sendMessage()} style={styles.iconBtn}>
            <img src="/send.png" alt="Send" style={{ width: 18, height: 18 }} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default Chatbot;

const styles = {
  page: {
    width: "100%",
    height: "100vh",
    display: "flex",
    flexDirection: "column",
    background: "#0f1424",
    color: "#fff",
    position: "relative",
    overflow: "hidden",
    fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif",
  },

  main: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    padding: "24px",
    boxSizing: "border-box",
    overflow: "hidden",
  },

  hero: {
    width: "100%",
    flex: 1,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    textAlign: "center",
  },

  heroText: {
    marginTop: "-6vh",
  },

  heroLine1: {
    fontSize: "clamp(30px, 4vw, 56px)",
    fontWeight: 700,
    lineHeight: 1.1,
    color: "#fff",
    marginBottom: 12,
  },

  heroLine2: {
    fontSize: "clamp(28px, 3.6vw, 50px)",
    fontWeight: 700,
    lineHeight: 1.15,
    color: "#fff",
  },

  chatArea: {
    width: "min(1100px, 100%)",
    flex: 1,
    overflowY: "auto",
    padding: "72px 10px 10px",
    display: "flex",
    flexDirection: "column",
    gap: 12,
    boxSizing: "border-box",
    scrollbarWidth: "none",
    msOverflowStyle: "none",
    alignItems: "center",
  },

  messageRow: {
    display: "flex",
    width: "100%",
  },

  bubble: {
    padding: 12,
    borderRadius: 14,
    wordBreak: "break-word",
    boxSizing: "border-box",
    maxWidth: "100%",
  },

  cardWrap: {
    width: 500,
    maxWidth: "100%",
    overflow: "hidden",
    background: "#17333a",
    padding: 16,
    borderRadius: 12,
    boxSizing: "border-box",
    color: "#fff",
  },

  typing: {
    color: "rgba(255,255,255,0.75)",
    paddingLeft: 8,
  },

  bottomDock: {
    width: "100%",
    position: "sticky",
    bottom: 0,
    left: 0,
    padding: "0 10px 10px",
    boxSizing: "border-box",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 10,
    background: "linear-gradient(to top, #0f1424 70%, transparent)",
  },

  composer: {
    width: "min(920px, 100%)",
    height: 76,
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "12px 16px",
    borderRadius: 28,
    background: "rgba(36, 36, 36, 0.95)",
    border: "1px solid rgba(255,255,255,0.12)",
    boxShadow: "0 12px 30px rgba(0,0,0,0.35)",
    boxSizing: "border-box",
  },

  iconBtn: {
    width: 48,
    height: 48,
    borderRadius: "50%",
    border: "none",
    background: "transparent",
    color: "#fff",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    fontSize: 26,
  },

  input: {
    flex: 1,
    height: 48,
    border: "1px solid rgba(255,255,255,0.08)",
    outline: "none",
    borderRadius: 18,
    background: "#111",
    color: "#fff",
    padding: "0 18px",
    minWidth: 0,
    fontSize: 16,
  },

  footer: {
    width: "min(920px, 100%)",
    fontSize: 12,
    lineHeight: 1.4,
    color: "rgba(255,255,255,0.55)",
    textAlign: "center",
    paddingBottom: 2,
  },

  downloadBtn: {
    padding: "8px 10px",
    border: "none",
    borderRadius: 8,
    background: "#444",
    color: "#fff",
    cursor: "pointer",
  },

  exportRow: {
    display: "flex",
    gap: 8,
    marginTop: 8,
    flexWrap: "wrap",
  },

  exportBtn: {
    padding: "8px 10px",
    border: "none",
    borderRadius: 8,
    background: "#17333a",
    color: "#fff",
    cursor: "pointer",
  },

  messageActions: {
    display: "flex",
    gap: 8,
    flexWrap: "wrap",
    alignItems: "center",
    marginTop: 2,
  },

  actionBtn: {
    padding: "6px 10px",
    border: "none",
    borderRadius: 8,
    background: "rgba(255,255,255,0.12)",
    color: "inherit",
    cursor: "pointer",
    fontSize: 12,
  },
};