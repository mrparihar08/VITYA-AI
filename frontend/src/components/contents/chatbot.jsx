import React, { useState, useEffect, useRef } from "react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
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
  const [voiceEnabled, setVoiceEnabled] = useState(false);

  const token = localStorage.getItem("token");
  const bottomRef = useRef(null);
  const recognitionRef = useRef(null);
  const isSpeakingRef = useRef(false);
  const chartRefs = useRef({});

  useEffect(() => {
    if ("webkitSpeechRecognition" in window) {
      const rec = new window.webkitSpeechRecognition();
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
    if (!voiceEnabled) return;
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
    recognition.onend = () => setListening(false);

    try {
      recognition.start();
    } catch (err) {
      setListening(false);
      console.error("Speech recognition start error:", err);
    }
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

  const handleFileResponse = async (res, contentType) => {
    const lower = (contentType || "").toLowerCase();

    if (lower.includes("text/csv")) {
      await downloadBlob(res, "chat_data.csv");
      setMessages((prev) => [
        ...prev,
        { sender: "bot", type: "text", text: "CSV downloaded ✅" },
      ]);
      return true;
    }

    if (
      lower.includes("application/vnd.openxmlformats-officedocument.wordprocessingml.document") ||
      lower.includes("wordprocessingml.document") ||
      lower.includes("application/msword")
    ) {
      await downloadBlob(res, "chat_data.docx");
      setMessages((prev) => [
        ...prev,
        { sender: "bot", type: "text", text: "DOCX downloaded ✅" },
      ]);
      return true;
    }

    if (lower.includes("application/pdf")) {
      await downloadBlob(res, "chat_data.pdf");
      setMessages((prev) => [
        ...prev,
        { sender: "bot", type: "text", text: "PDF downloaded ✅" },
      ]);
      return true;
    }

    if (
      lower.includes("application/vnd.openxmlformats-officedocument.presentationml.presentation") ||
      lower.includes("presentationml.presentation") ||
      lower.includes("powerpoint")
    ) {
      await downloadBlob(res, "chat_data.pptx");
      setMessages((prev) => [
        ...prev,
        { sender: "bot", type: "text", text: "PPTX downloaded ✅" },
      ]);
      return true;
    }

    return false;
  };

  const sendMessage = async (voiceText = null) => {
    const messageToSend = (voiceText || input).trim();
    if (!messageToSend || loading) return;

    setMessages((prev) => [
      ...prev,
      { sender: "user", type: "text", text: messageToSend },
    ]);
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

      if (await handleFileResponse(res, contentType)) {
        return;
      }

      let data = null;
      try {
        data = await res.json();
      } catch {
        data = {};
      }

      const payload =
        data?.data ??
        data?.reply ??
        data?.content ??
        data?.result ??
        data?.message ??
        data?.payload ??
        null;

      const botMessage = {
        sender: "bot",
        type: data?.type || "text",
        text: typeof payload === "string" ? payload : "",
        content: payload,
      };

      setMessages((prev) => [...prev, botMessage]);

      if (botMessage.type === "text" && typeof botMessage.text === "string") {
        speak(botMessage.text);
      }
    } catch (error) {
      console.error(error);
      setMessages((prev) => [
        ...prev,
        { sender: "bot", type: "text", text: "Server error ❌" },
      ]);
    } finally {
      setLoading(false);
      setInput("");
    }
  };

  const formatMonth = (dateStr) => {
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString("en-IN", {
      month: "short",
      year: "numeric",
    });
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
      const preferredKeys = [
        "data",
        "items",
        "rows",
        "result",
        "content",
        "reply",
        "payload",
        "chartData",
      ];

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
    const raw = msg.content ?? msg.text ?? [];
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
              maxWidth: 520,
            }}
          >
            {item.image ? (
              <img
                src={item.image}
                alt={item.title || "news"}
                style={{
                  width: "100%",
                  maxWidth: "100%",
                  height: 180,
                  objectFit: "cover",
                  borderRadius: 10,
                }}
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                }}
              />
            ) : null}

            <div style={{ fontWeight: "bold", fontSize: 16 }}>
              {item.title || "No title"}
            </div>

            <div style={{ fontSize: 14, color: "#444" }}>
              {item.description || "No description"}
            </div>

            {item.url ? (
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

  const exportCSV = (msg, index) => {
    const data = getChartData(msg);
    if (!data || !Array.isArray(data) || data.length === 0) return;

    const allKeys = Array.from(
      data.reduce((set, row) => {
        Object.keys(row || {}).forEach((k) => set.add(k));
        return set;
      }, new Set())
    );

    const escapeCSV = (value) => {
      if (value === null || value === undefined) return "";
      const str = String(value);
      if (str.includes(",") || str.includes('"') || str.includes("\n")) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const csv = [
      allKeys.join(","),
      ...data.map((row) => allKeys.map((k) => escapeCSV(row[k])).join(",")),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = window.URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = `${msg.type || "chart"}_${index + 1}.csv`;
    a.click();

    setTimeout(() => window.URL.revokeObjectURL(url), 1000);
  };

  const exportPDF = async (index, msg) => {
    const element = chartRefs.current[index];
    if (!element) return;

    const canvas = await html2canvas(element, {
      backgroundColor: "#ffffff",
      scale: 2,
    });

    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF("p", "mm", "a4");

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 10;

    const imgWidth = pageWidth - margin * 2;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    const finalHeight = Math.min(imgHeight, pageHeight - margin * 2);

    pdf.addImage(imgData, "PNG", margin, margin, imgWidth, finalHeight);
    pdf.save(`${msg.type || "chart"}_${index + 1}.pdf`);
  };

  const chartWrapperStyle = {
    width: 500,
    maxWidth: "100%",
    minWidth: 0,
    overflow: "hidden",
    background: "#fff",
    padding: 16,
    borderRadius: 12,
    boxSizing: "border-box",
  };

  const renderChart = (msg) => {
    const type = (msg.type || "").toLowerCase();
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

  return (
    <div style={styles.container}>
      <div style={styles.toolbar}>
        <button
          onClick={() => setVoiceEnabled((v) => !v)}
          style={styles.voiceBtn}
        >
          {voiceEnabled ? "🔊" : "🔇"}
        </button>
      </div>

      <div style={styles.chatBox}>
        {messages.map((msg, i) => {
          const chartElement = CHAT_TYPES.has(msg.type) ? renderChart(msg) : null;

          return (
            <div
              key={i}
              style={{
                ...styles.message,
                alignSelf: msg.sender === "user" ? "flex-end" : "flex-start",
                background: msg.sender === "user" ? "#17333a" : "#e5e5ea",
                color: msg.sender === "user" ? "white" : "black",
                maxWidth: CHAT_TYPES.has(msg.type) || msg.type === "news" ? "95%" : "75%",
              }}
            >
              {msg.type === "news" ? (
                <div
                  ref={(el) => (chartRefs.current[i] = el)}
                  style={{
                    ...chartWrapperStyle,
                    width: "100%",
                    maxWidth: 560,
                  }}
                >
                  {renderNews(msg)}
                </div>
              ) : MEDIA_TYPES.has(msg.type) ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {getMediaSrc(msg) ? (
                    <>
                      <img
                        src={getMediaSrc(msg)}
                        alt={msg.type}
                        style={{
                          width: "100%",
                          maxWidth: 220,
                          height: "auto",
                          display: "block",
                        }}
                        onError={(e) => {
                          e.currentTarget.style.display = "none";
                        }}
                      />

                      <button
                        onClick={() => {
                          const link = document.createElement("a");
                          link.href = getMediaSrc(msg);
                          link.download = `${msg.type}.png`;
                          link.click();
                        }}
                        style={styles.downloadBtn}
                      >
                        Download
                      </button>
                    </>
                  ) : (
                    <div>Invalid QR / image data</div>
                  )}
                </div>
              ) : CHAT_TYPES.has(msg.type) ? (
                <div
                  ref={(el) => (chartRefs.current[i] = el)}
                  style={chartWrapperStyle}
                >
                  {chartElement || <div>No chart data</div>}

                  <div style={styles.exportRow}>
                    <button
                      style={styles.exportBtn}
                      onClick={() => downloadChartPNG(i, msg)}
                    >
                      PNG
                    </button>
                    <button
                      style={styles.exportBtn}
                      onClick={() => exportCSV(msg, i)}
                    >
                      CSV
                    </button>
                    <button
                      style={styles.exportBtn}
                      onClick={() => exportPDF(i, msg)}
                    >
                      PDF
                    </button>
                  </div>
                </div>
              ) : (
                <span>
                  {typeof msg.text === "string" ? msg.text : JSON.stringify(msg.text)}
                </span>
              )}
            </div>
          );
        })}

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
          <img src="/send.png" alt="Send" style={{ width: 20, height: 20 }} />
        </button>

        <button onClick={startListening} style={styles.mic}>
          <img src="/mic.png" alt="Mic" style={{ width: 24, height: 24 }} />
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
    minWidth: 0,
  },
  toolbar: {
    display: "flex",
    justifyContent: "flex-end",
    padding: "8px 10px",
    borderBottom: "1px solid #eee",
  },
  voiceBtn: {
    padding: "8px 12px",
    border: "none",
    borderRadius: 8,
    background: "#17333a",
    color: "#fff",
    cursor: "pointer",
  },
  chatBox: {
    flex: 1,
    overflowY: "auto",
    overflowX: "hidden",
    display: "flex",
    flexDirection: "column",
    padding: 10,
    minWidth: 0,
  },
  message: {
    padding: 10,
    borderRadius: 10,
    margin: 5,
    maxWidth: "75%",
    width: "fit-content",
    minWidth: 0,
    wordBreak: "break-word",
    boxSizing: "border-box",
  },
  inputArea: {
    display: "flex",
    gap: 8,
    borderTop: "1px solid #ccc",
    padding: 8,
    minWidth: 0,
  },
  input: {
    flex: 1,
    padding: 10,
    borderRadius: 8,
    border: "1px solid #ccc",
    outline: "none",
    minWidth: 0,
  },
  button: {
    padding: 12,
    background: "#9d77ff",
    color: "#fff",
    border: "none",
    borderRadius: 12,
    cursor: "pointer",
  },
  mic: {
    padding: 10,
    background: "#17333a",
    color: "#fff",
    border: "none",
    borderRadius: 12,
    cursor: "pointer",
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
};