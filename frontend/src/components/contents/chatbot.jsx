import React, { useEffect, useMemo, useRef, useState } from "react";
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
const COLORS = ["#8b5cf6", "#22c55e", "#f59e0b", "#f97316", "#ef4444", "#38bdf8"];
const CHART_HEIGHT = 240;

const MODES = [
  { key: "chat", label: "Chat", hint: "Default mode" },
  { key: "news", label: "News", hint: "Latest updates" },
  { key: "wiki", label: "Wikipedia", hint: "Search knowledge" },
  { key: "file", label: "Create File", hint: "Generate file output" },
];

const safeJSON = (value) => {
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  if (!trimmed) return value;
  if ((trimmed.startsWith("{") && trimmed.endsWith("}")) || (trimmed.startsWith("[") && trimmed.endsWith("]"))) {
    try {
      return JSON.parse(trimmed);
    } catch {
      return value;
    }
  }
  return value;
};

const formatMonth = (dateStr) => {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString("en-IN", { month: "short", year: "numeric" });
};

const normalizeWikiData = (value) => {
  const parsed = safeJSON(value);
  const data = typeof parsed === "string" ? safeJSON(parsed) : parsed;
  if (!data || typeof data !== "object" || Array.isArray(data)) return {};

  return {
    title: data.title || data.name || data.pageTitle || "Wikipedia",
    summary: data.summary || data.extract || data.description || "",
    image:
      data.image || data.images?.[0] || data.thumbnail?.source || data.thumbnail || data.imageUrl || "",
    url: data.url || data.pageUrl || data.content_urls?.desktop?.page || "",
  };
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

  const parsed = safeJSON(value);
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

const Chatbot = () => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [listening, setListening] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [plusOpen, setPlusOpen] = useState(false);
  const [mode, setMode] = useState("chat");

  const token = localStorage.getItem("token");
  const bottomRef = useRef(null);
  const recognitionRef = useRef(null);
  const isSpeakingRef = useRef(false);
  const chartRefs = useRef({});
  const forceStopRef = useRef(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.continuous = false;
      rec.interimResults = false;
      rec.lang = "en-IN";
      recognitionRef.current = rec;
    }

    const onDocClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setPlusOpen(false);
    };

    document.addEventListener("mousedown", onDocClick);

    return () => {
      document.removeEventListener("mousedown", onDocClick);
      try {
        recognitionRef.current?.stop();
      } catch {}
      try {
        window.speechSynthesis?.cancel();
      } catch {}
    };
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const speak = (text) => {
    if (!text || !window.speechSynthesis || typeof SpeechSynthesisUtterance === "undefined") return;
    try {
      window.speechSynthesis.cancel();
    } catch {}

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-IN";
    isSpeakingRef.current = true;
    utterance.onend = () => (isSpeakingRef.current = false);
    utterance.onerror = () => (isSpeakingRef.current = false);
    window.speechSynthesis.speak(utterance);
  };

  const preprocessVoice = (text) =>
    (text || "")
      .toLowerCase()
      .replace(/\b(rupees|rs|rupee)\b/g, "")
      .trim();

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
    if (!voiceEnabled) return;
    if (listening) {
      stopRecognition();
      return;
    }
    if (isSpeakingRef.current) return;

    forceStopRef.current = false;
    setListening(true);

    recognition.onresult = (event) => {
      const speechText = event?.results?.[0]?.[0]?.transcript;
      if (!speechText) {
        setListening(false);
        return;
      }
      setListening(false);
      sendMessage(preprocessVoice(speechText));
    };

    recognition.onerror = () => setListening(false);
    recognition.onend = () => {
      if (forceStopRef.current) return;
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
        try {
          window.speechSynthesis?.cancel();
        } catch {}
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
      setTimeout(startListening, 50);
      return;
    }
    startListening();
  };

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

  const getChartData = (msg) => {
    const raw = msg.content ?? msg.text ?? msg.data ?? null;
    if (msg.type === "multi_line") {
      return normalizeMultiLineData(safeJSON(raw));
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
    const raw = msg.content ?? msg.text ?? [];
    let data = [];

    if (Array.isArray(raw)) data = raw;
    else {
      const parsed = safeJSON(raw);
      if (Array.isArray(parsed)) data = parsed;
      else if (parsed?.articles && Array.isArray(parsed.articles)) data = parsed.articles;
    }

    if (!data.length) return <div style={styles.emptyState}>No news available</div>;

    return (
      <div style={styles.stack}>
        {data.map((item, i) => (
          <div key={i} style={styles.infoCard}>
            {item?.image ? (
              <img
                src={item.image}
                alt={item.title || "news"}
                style={styles.mediaLarge}
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                }}
              />
            ) : null}

            <div style={styles.cardTitle}>{item?.title || "No title"}</div>
            <div style={styles.cardBody}>{item?.description || "No description"}</div>
            {item?.url ? (
              <a href={item.url} target="_blank" rel="noreferrer" style={styles.link}>
                Read more →
              </a>
            ) : null}
          </div>
        ))}
      </div>
    );
  };

  const renderWiki = (msg) => {
    const data = normalizeWikiData(msg.content ?? msg.text ?? msg.data ?? {});
    if (!data.title && !data.summary && !data.url && !data.image) return <div style={styles.emptyState}>No Wikipedia data available</div>;

    return (
      <div style={styles.infoCard}>
        {data.image ? (
          <img
            src={data.image}
            alt={data.title || "wikipedia"}
            style={styles.mediaLarge}
            onError={(e) => {
              e.currentTarget.style.display = "none";
            }}
          />
        ) : null}

        <div style={styles.cardTitle}>{data.title}</div>
        <div style={styles.cardBody}>{data.summary || "No summary available"}</div>
        {data.url ? (
          <a href={data.url} target="_blank" rel="noreferrer" style={styles.link}>
            Read more →
          </a>
        ) : null}
      </div>
    );
  };

  const downloadChartPNG = async (index, msg) => {
    const element = chartRefs.current[index];
    if (!element) return;
    const canvas = await html2canvas(element, { backgroundColor: "#ffffff", scale: 2 });
    const link = document.createElement("a");
    link.download = `${msg.type || "chart"}_${index + 1}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  };

  const renderChart = (msg) => {
    const type = (msg.type || "").toLowerCase().trim();
    const data = getChartData(msg);
    if (!data || !Array.isArray(data) || data.length === 0) return <div style={styles.emptyState}>No chart data</div>;

    const { xKey, yKey } = getKeys(data, type);

    switch (type) {
      case "bar":
      case "chart":
        return (
          <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
            <BarChart data={data} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey={xKey} />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey={yKey} fill="#8b5cf6" />
            </BarChart>
          </ResponsiveContainer>
        );
      case "line":
      case "line_chart":
        return (
          <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
            <LineChart data={data} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey={xKey} />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey={yKey} stroke="#8b5cf6" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        );
      case "multi_line":
        return (
          <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
            <LineChart data={data} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="income" stroke="#22c55e" strokeWidth={2} />
              <Line type="monotone" dataKey="expense" stroke="#ef4444" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        );
      case "pie":
      case "donut":
        return (
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
        );
      case "composed":
        return (
          <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
            <ComposedChart data={data} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey={xKey} />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey={yKey} fill="#8b5cf6" />
              <Line type="monotone" dataKey={yKey} stroke="#f59e0b" />
            </ComposedChart>
          </ResponsiveContainer>
        );
      case "area":
        return (
          <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
            <AreaChart data={data} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey={xKey} />
              <YAxis />
              <Tooltip />
              <Area type="monotone" dataKey={yKey} fill="#8b5cf6" stroke="#8b5cf6" />
            </AreaChart>
          </ResponsiveContainer>
        );
      case "scatter":
        return (
          <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
            <ScatterChart margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
              <CartesianGrid />
              <XAxis dataKey={xKey} type="number" />
              <YAxis dataKey={yKey} type="number" />
              <Tooltip />
              <Scatter data={data} fill="#8b5cf6" />
            </ScatterChart>
          </ResponsiveContainer>
        );
      case "stacked":
        return (
          <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
            <BarChart data={data} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey={xKey} />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey={yKey} stackId="a" fill="#8b5cf6" />
            </BarChart>
          </ResponsiveContainer>
        );
      case "radar":
        return (
          <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
            <RadarChart data={data}>
              <PolarGrid />
              <PolarAngleAxis dataKey={xKey} />
              <PolarRadiusAxis />
              <Tooltip />
              <Radar dataKey={yKey} fill="#8b5cf6" stroke="#8b5cf6" />
            </RadarChart>
          </ResponsiveContainer>
        );
      case "heatmap":
        return (
          <div style={styles.heatmapGrid}>
            {data.map((item, i) => {
              const value = item.amount ?? item.value ?? item.count ?? 0;
              return (
                <div
                  key={i}
                  style={{
                    ...styles.heatCell,
                    background: `rgba(139,92,246, ${Math.min(Number(value) / 1000 || 0, 1)})`,
                  }}
                  title={`${item.category || item.name || item.month || i}: ${value}`}
                />
              );
            })}
          </div>
        );
      case "waterfall":
        return (
          <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
            <BarChart data={data} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey={xKey} />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey={yKey} fill="#8b5cf6" />
            </BarChart>
          </ResponsiveContainer>
        );
      default:
        return <div style={styles.emptyState}>No chart available</div>;
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

    if (type === "text") return msg.content || msg.text || msg.reply || "";

    if (type === "chat") {
      const data = msg.content ?? msg.reply ?? msg.text ?? "";
      if (typeof data === "string") return data;
      if (data && typeof data === "object") return data.content || data.reply || JSON.stringify(data, null, 2);
      return "";
    }

    if (type === "news") {
      const parsed = Array.isArray(raw) ? raw : safeJSON(raw);
      const data = Array.isArray(parsed) ? parsed : parsed?.articles || [];
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
      const data = normalizeWikiData(raw);
      if (!data.title && !data.summary && !data.url) return "Wikipedia response";
      return [
        data.title ? `Title: ${data.title}` : "",
        data.summary ? `Summary: ${data.summary}` : "",
        data.url ? `Link: ${data.url}` : "",
      ]
        .filter(Boolean)
        .join("\n\n");
    }

    if (MEDIA_TYPES.has(type)) return "Media message";
    if (CHAT_TYPES.has(type)) return typeof raw === "string" ? raw : JSON.stringify(raw, null, 2);
    if (typeof raw === "string") return raw;
    if (raw && typeof raw === "object") return JSON.stringify(raw, null, 2);
    return "";
  };

  const getSpeakText = (msg) => {
    const type = (msg.type || "").toLowerCase().trim();
    const text = getMessageText(msg);
    if (!text) return "";
    if (type === "news" || type === "wiki") return text;
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
    if (CHAT_TYPES.has(type)) return downloadChartPNG(index, msg);

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
    if (text) downloadTextFile(text, `${type || "message"}_${index + 1}.txt`);
  };

  const sendMessage = async (explicitText = null) => {
    const messageToSend = (explicitText ?? input).trim();
    if (!messageToSend || loading) return;
    if (!token) {
      alert("Please login again.");
      return;
    }

    setMessages((prev) => [
      ...prev,
      {
        sender: "user",
        type: "text",
        text: messageToSend,
        mode,
      },
    ]);
    setLoading(true);

    try {
      const res = await fetch("https://vitya-ai-qlbn.onrender.com/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          message: messageToSend,
          mode,
          requestType: mode,
        }),
      });

      if (res.status === 401) {
        alert("Session expired. Please login again.");
        return;
      }

      if (!res.ok) throw new Error(`Request failed: ${res.status}`);

      const contentType = res.headers.get("content-type") || "";
      const isFile = await handleFileResponse(res, contentType);
      if (isFile) return;

      let data = {};
      try {
        data = await res.json();
      } catch {
        data = {};
      }

      const payload = data?.content ?? data?.data ?? data?.reply ?? data?.result ?? data?.message ?? data?.payload ?? null;
      const normalizedPayload = data?.type === "wiki" ? normalizeWikiData(payload) : payload;

      const botMessage = {
        sender: "bot",
        type: data?.type || (mode === "wiki" ? "wiki" : mode === "news" ? "news" : "text"),
        text: typeof normalizedPayload === "string" ? normalizedPayload : "",
        content: normalizedPayload,
      };

      setMessages((prev) => [...prev, botMessage].slice(-50));

      if (explicitText !== null && getSpeakText(botMessage)) {
        setTimeout(() => speak(getSpeakText(botMessage)), 250);
      }
    } catch (error) {
      console.error(error);
      setMessages((prev) => [...prev, { sender: "bot", type: "text", text: "Server error ❌" }]);
    } finally {
      setLoading(false);
      setInput("");
    }
  };

  const showLanding = messages.length === 0;
  const currentMode = useMemo(() => MODES.find((m) => m.key === mode) || MODES[0], [mode]);
  const placeholderMap = {
    chat: "Type your message...",
    news: "Ask for news, e.g. latest AI news",
    wiki: "Search Wikipedia, e.g. Alan Turing",
    file: "Describe the file you want to create...",
  };

  const openMode = (nextMode) => {
    setMode(nextMode);
    setPlusOpen(false);
  };

  return (
    <div style={styles.page}>
      <style>{`
        .chat-scroll::-webkit-scrollbar { display: none; }
        .chat-scroll { scrollbar-width: none; -ms-overflow-style: none; }
      `}</style>

      <div style={styles.main}>
        {showLanding ? (
          <div style={styles.hero}>
            <div style={styles.heroText}>
              <div style={styles.heroTitle}>What can I help you with today?</div>
            </div>
          </div>
        ) : (
          <div style={styles.chatArea} className="chat-scroll">
            {messages.map((msg, i) => {
              const type = (msg.type || "").toLowerCase().trim();
              const chartElement = CHAT_TYPES.has(type) ? renderChart(msg) : null;
              const bubbleMaxWidth = CHAT_TYPES.has(type) || type === "news" || type === "wiki" ? "95%" : "78%";

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
                    <div style={{ ...styles.bubble, background: msg.sender === "user" ? styles.userBubble.background : styles.botBubble.background }}>
                      {msg.sender === "user" }

                      {type === "news" ? (
                        <div ref={(el) => (chartRefs.current[i] = el)} style={styles.cardWrap}>
                          {renderNews(msg)}
                        </div>
                      ) : type === "wiki" ? (
                        <div ref={(el) => (chartRefs.current[i] = el)} style={styles.cardWrap}>
                          {renderWiki(msg)}
                        </div>
                      ) : MEDIA_TYPES.has(type) ? (
                        <div style={styles.stack}>
                          {getMediaSrc(msg) ? (
                            <img
                              src={getMediaSrc(msg)}
                              alt={type}
                              style={styles.mediaSmall}
                              onError={(e) => {
                                e.currentTarget.style.display = "none";
                              }}
                            />
                          ) : (
                            <div style={styles.emptyState}>Invalid QR / image data</div>
                          )}
                        </div>
                      ) : CHAT_TYPES.has(type) ? (
                        <div ref={(el) => (chartRefs.current[i] = el)} style={styles.cardWrap}>
                          {chartElement || <div style={styles.emptyState}>No chart data</div>}
                        </div>
                      ) : (
                        <span>{typeof msg.text === "string" ? msg.text : JSON.stringify(msg.text)}</span>
                      )}
                    </div>

                    {msg.sender === "bot" && (
                      <div style={styles.messageActions}>
                        <button onClick={() => handleCopyMessage(msg)} style={styles.actionBtn} title="Copy">
                          <img src="/copy.png" alt="copy" style={styles.iconTiny} />
                        </button>
                        <button onClick={() => handleSpeakMessage(msg)} style={styles.actionBtn} title="Speak">
                          <img src="/speak.png" alt="speak" style={styles.iconTiny} />
                        </button>
                        <button onClick={() => handleDownloadMessage(msg, i)} style={styles.actionBtn} title="Download">
                          <img src="/downloading.png" alt="download" style={styles.iconTiny} />
                        </button>
                        <button onClick={() => alert("Add action here")} style={styles.actionBtn} title="add more">
                          <img src="/dots.png" alt="more" style={{ width: 10, height: 10 }} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {loading && <div style={styles.typing}>Bot typing…</div>}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      <div style={styles.bottomDock}>
        <div style={styles.composerWrap} ref={menuRef}>
          {plusOpen && (
            <div style={styles.menuPanel}>
              {MODES.map((item) => (
                <button
                  key={item.key}
                  onClick={() => openMode(item.key)}
                  style={{
                    ...styles.menuItem,
                    background: mode === item.key ? "rgba(139,92,246,0.16)" : "transparent",
                  }}
                >
                  <div style={styles.menuItemLabel}>{item.label}</div>
                  <div style={styles.menuItemHint}>{item.hint}</div>
                </button>
              ))}
            </div>
          )}

          <div style={styles.composer}>
            <button onClick={() => setPlusOpen((v) => !v)} style={styles.iconBtn} title="More actions">
              <img src="/plus.png" alt="Plus" style={styles.iconMain} />
            </button>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={placeholderMap[mode]}
              style={styles.input}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage();
                }
              }}
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
                background: listening ? "rgba(139,92,246,0.18)" : "transparent",
                boxShadow: listening ? "0 0 0 6px rgba(139,92,246,0.12)" : "none",
              }}
            >
              <img src={getMicIcon()} alt="Mic" style={styles.iconMain} />
            </button>

            <button onClick={() => sendMessage()} style={{ ...styles.sendBtn, opacity: loading ? 0.7 : 1 }}>
              <img src="/send.png" alt="Send" style={styles.iconSend} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Chatbot;

const glass = "rgba(18, 24, 40, 0.72)";
const border = "1px solid rgba(255,255,255,0.10)";

const styles = {
  page: {
    width: "100%",
    height: "100vh",
    display: "flex",
    flexDirection: "column",
    background: "radial-gradient(circle at top, #172033 0%, #0b1020 52%, #090d18 100%)",
    color: "#fff",
    position: "relative",
    overflow: "hidden",
    fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif",
  },
  main: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    padding: "20px",
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
    padding: "24px",
  },
  heroText: { maxWidth: 760, marginTop: "-4vh" },
  heroTitle: {
    fontSize: "clamp(28px, 4vw, 10px)",
    fontWeight: 800,
    lineHeight: 1.08,
    letterSpacing: "-0.04em",
    marginBottom: 12,
  },
  heroSub: {
    fontSize: "clamp(14px, 1.5vw, 18px)",
    color: "rgba(255,255,255,0.72)",
    lineHeight: 1.6,
  },
  chatArea: {
    width: "min(1120px, 100%)",
    flex: 1,
    overflowY: "auto",
    padding: "72px 8px 10px",
    display: "flex",
    flexDirection: "column",
    gap: 12,
    boxSizing: "border-box",
    alignItems: "center",
  },
  messageRow: {
    display: "flex",
    width: "100%",
  },
  bubble: {
    padding: 12,
    borderRadius: 18,
    wordBreak: "break-word",
    boxSizing: "border-box",
    maxWidth: "100%",
    backdropFilter: "blur(12px)",
    border,
    boxShadow: "0 12px 30px rgba(0,0,0,0.16)",
  },
  userBubble: { background: "linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)" },
  botBubble: { background: glass },
  modeChip: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    fontSize: 11,
    padding: "4px 10px",
    borderRadius: 999,
    background: "rgba(255,255,255,0.12)",
    color: "rgba(255,255,255,0.88)",
    marginBottom: 10,
    width: "fit-content",
  },
  cardWrap: {
    width: 520,
    maxWidth: "100%",
    overflow: "hidden",
    background: "rgba(255,255,255,0.96)",
    padding: 16,
    borderRadius: 16,
    boxSizing: "border-box",
    color: "#111",
  },
  infoCard: {
    display: "flex",
    flexDirection: "column",
    gap: 10,
    background: "#fff",
    borderRadius: 16,
    padding: 0,
    color: "#111",
  },
  stack: {
    display: "flex",
    flexDirection: "column",
    gap: 12,
  },
  cardTitle: { fontWeight: 800, fontSize: 18, lineHeight: 1.3 },
  cardBody: { fontSize: 14, color: "#4b5563", lineHeight: 1.6 },
  link: {
    display: "inline-block",
    textDecoration: "none",
    color: "#4f46e5",
    fontWeight: 700,
    marginTop: 2,
  },
  mediaLarge: { width: "100%", height: 220, objectFit: "cover", borderRadius: 14 },
  mediaSmall: { width: "100%", maxWidth: 260, height: "auto", display: "block", borderRadius: 14 },
  emptyState: { color: "#64748b", fontSize: 14 },
  typing: { color: "rgba(255,255,255,0.75)", paddingLeft: 8 },
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
    background: "linear-gradient(to top, #090d18 72%, transparent)",
  },
  composerWrap: {
    width: "min(980px, 100%)",
    position: "relative",
  },
  menuPanel: {
    position: "absolute",
    left: 0,
    bottom: 88,
    width: 260,
    padding: 10,
    borderRadius: 20,
    background: "rgba(15, 20, 36, 0.96)",
    border,
    boxShadow: "0 18px 40px rgba(0,0,0,0.4)",
    backdropFilter: "blur(18px)",
    display: "grid",
    gap: 8,
    zIndex: 30,
  },
  menuItem: {
    width: "100%",
    textAlign: "left",
    border: "none",
    borderRadius: 14,
    padding: "10px 12px",
    background: "transparent",
    color: "#fff",
    cursor: "pointer",
  },
  menuItemLabel: { fontSize: 14, fontWeight: 700, marginBottom: 3 },
  menuItemHint: { fontSize: 12, color: "rgba(255,255,255,0.65)" },
  composer: {
    width: "100%",
    minHeight: 76,
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "12px 14px",
    borderRadius: 28,
    background: "rgba(15, 20, 36, 0.92)",
    border,
    boxShadow: "0 12px 30px rgba(0,0,0,0.38)",
    boxSizing: "border-box",
    backdropFilter: "blur(16px)",
  },
  iconBtn: {
    width: 48,
    height: 48,
    borderRadius: "50%",
    border: "none",
    background: "rgba(255,255,255,0.04)",
    color: "#fff",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  iconMain: { width: 20, height: 20 },
  iconSend: { width: 18, height: 18 },
  iconTiny: { width: 10, height: 10 },
  modePill: {
    padding: "8px 12px",
    borderRadius: 999,
    background: "rgba(139,92,246,0.18)",
    border: "1px solid rgba(139,92,246,0.25)",
    color: "#e9d5ff",
    fontSize: 12,
    fontWeight: 700,
    whiteSpace: "nowrap",
  },
  input: {
    flex: 1,
    height: 48,
    border: "1px solid rgba(255,255,255,0.08)",
    outline: "none",
    borderRadius: 18,
    background: "rgba(255,255,255,0.04)",
    color: "#fff",
    padding: "0 16px",
    minWidth: 0,
    fontSize: 15,
  },
  sendBtn: {
    width: 48,
    height: 48,
    borderRadius: "50%",
    border: "none",
    background: "linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)",
    color: "#fff",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    boxShadow: "0 10px 22px rgba(99,102,241,0.32)",
  },
  messageActions: {
    display: "flex",
    gap: 8,
    flexWrap: "wrap",
    alignItems: "center",
    marginTop: 2,
  },
  actionBtn: {
    width: 32,
    height: 32,
    border: "none",
    borderRadius: 10,
    background: "rgba(255,255,255,0.10)",
    color: "inherit",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  heatmapGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(7, minmax(0, 1fr))",
    gap: 4,
    width: "100%",
    boxSizing: "border-box",
  },
  heatCell: {
    height: 30,
    borderRadius: 6,
  },
};
