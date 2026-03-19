import React, { useState } from "react";

const Chatbot = () => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");

  const token = localStorage.getItem("token"); // JWT token

  const sendMessage = async () => {
    if (!input.trim()) return;

    const userMessage = { sender: "user", text: input };

    setMessages((prev) => [...prev, userMessage]);

    try {
      const res = await fetch("http://127.0.0.1:8000/chat/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`, // important
        },
        body: JSON.stringify({ message: input }),
      });

      const data = await res.json();

      const botMessage = {
        sender: "bot",
        text: data.bot_reply || "No response",
      };

      setMessages((prev) => [...prev, botMessage]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { sender: "bot", text: "Server error ❌" },
      ]);
    }

    setInput("");
  };

  return (
    <div style={styles.container}>
      <div style={styles.chatBox}>
        {messages.map((msg, index) => (
          <div
            key={index}
            style={
              msg.sender === "user"
                ? styles.userMessage
                : styles.botMessage
            }
          >
            {msg.text}
          </div>
        ))}
      </div>

      <div style={styles.inputArea}>
        <input
          type="text"
          value={input}
          placeholder="Type message..."
          onChange={(e) => setInput(e.target.value)}
          style={styles.input}
          onKeyDown={(e) => e.key === "Enter" && sendMessage()}
        />
        <button onClick={sendMessage} style={styles.button}>
          Send
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
    background: "#f9f9f9",
  },

  chatBox: {
    flex: 1,
    padding: "10px",
    overflowY: "auto",
  },

  userMessage: {
    alignSelf: "flex-end",
    background: "#17333a",
    color: "white",
    padding: "8px 12px",
    borderRadius: "10px",
    margin: "5px 0",
    maxWidth: "70%",
  },

  botMessage: {
    alignSelf: "flex-start",
    background: "#e5e5ea",
    padding: "8px 12px",
    borderRadius: "10px",
    margin: "5px 0",
    maxWidth: "70%",
  },

  inputArea: {
    display: "flex",
    borderTop: "1px solid #ccc",
  },

  input: {
    flex: 1,
    padding: "10px",
    border: "none",
    outline: "none",
  },

  button: {
    padding: "10px",
    background: "#9d77ff",
    color: "white",
    border: "none",
    cursor: "pointer",
  },
};