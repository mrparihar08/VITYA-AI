import React, { useState, useEffect } from "react";

export default function SettingsContent() {
  // =======================
  // STATES
  // =======================
  const [darkMode, setDarkMode] = useState(
    localStorage.getItem("darkMode") === "true"
  );
  const [compactMode, setCompactMode] = useState(
    localStorage.getItem("compactMode") === "true"
  );
  const [primaryColor, setPrimaryColor] = useState(
    localStorage.getItem("primaryColor") || "#6b46ff"
  );

  // =======================
  // EFFECTS
  // =======================
  useEffect(() => {
    document.body.classList.toggle("dark-mode", darkMode);
    localStorage.setItem("darkMode", darkMode);
  }, [darkMode]);

  useEffect(() => {
    document.body.classList.toggle("compact-mode", compactMode);
    localStorage.setItem("compactMode", compactMode);
  }, [compactMode]);

  useEffect(() => {
    document.documentElement.style.setProperty("--primary", primaryColor);
    localStorage.setItem("primaryColor", primaryColor);
  }, [primaryColor]);

  // =======================
  // RENDER
  // =======================
  return (
    <div className="settings-card card">
      <h1 className="h1-title">Settings</h1>
      {/* Dark Mode */}
      <div className="settings-option">
        <label className="toggle-label">
          <input
            type="checkbox"
            checked={darkMode}
            onChange={() => setDarkMode(!darkMode)}
          />
          <span className="toggle-custom"></span>
          Dark Mode
        </label>
      </div>

      {/* Compact Mode */}
      <div className="settings-option">
        <label className="toggle-label">
          <input
            type="checkbox"
            checked={compactMode}
            onChange={() => setCompactMode(!compactMode)}
          />
          <span className="toggle-custom"></span>
          Compact Mode
        </label>
      </div>

      {/* Primary Color Picker */}
      <div className="settings-option">
        <label className="color-label">
          Primary Color
          <input
            type="color"
            className="color-picker"
            value={primaryColor}
            onChange={(e) => setPrimaryColor(e.target.value)}
          />
        </label>
      </div>
    </div>
  );
}
