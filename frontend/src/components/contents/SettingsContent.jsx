import React, { useEffect, useMemo, useState } from "react";

const SETTINGS_KEY = "app_settings_v2";

const defaultSettings = {
  darkMode: false,
  compactMode: false,
  primaryColor: "#6b46ff",
  fontSize: "16",
  reducedMotion: false,
  language: "en",
  currency: "INR",
  showTimestamps: true,
};

export default function SettingsContent() {
  const [settings, setSettings] = useState(defaultSettings);
  const [loaded, setLoaded] = useState(false);
  const [saveStatus, setSaveStatus] = useState("Saved");

  useEffect(() => {
    try {
      const saved = localStorage.getItem(SETTINGS_KEY);
      if (saved) {
        setSettings({ ...defaultSettings, ...JSON.parse(saved) });
      }
    } catch (error) {
      console.error("Failed to load settings:", error);
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (!loaded) return;

    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
      setSaveStatus("Saved");

      document.body.classList.toggle("dark-mode", settings.darkMode);
      document.body.classList.toggle("compact-mode", settings.compactMode);
      document.body.classList.toggle("reduced-motion", settings.reducedMotion);

      document.documentElement.style.setProperty(
        "--primary",
        settings.primaryColor
      );
      document.documentElement.style.setProperty(
        "--app-font-size",
        `${settings.fontSize}px`
      );
      document.documentElement.lang = settings.language;
      document.documentElement.dir = "ltr";
    } catch (error) {
      console.error("Failed to save settings:", error);
      setSaveStatus("Save failed");
    }
  }, [settings, loaded]);

  const updateSetting = (key, value) => {
    setSettings((prev) => ({
      ...prev,
      [key]: value,
    }));
    setSaveStatus("Saving...");
  };

  const resetSettings = () => {
    setSettings(defaultSettings);
    setSaveStatus("Reset done");
  };

  const themeLabel = useMemo(
    () => (settings.darkMode ? "Dark" : "Light"),
    [settings.darkMode]
  );

  const densityLabel = settings.compactMode ? "Compact" : "Comfortable";
  const motionLabel = settings.reducedMotion ? "Reduced" : "Full";
  const languageLabel = settings.language === "hi" ? "Hindi" : "English";

  return (
    <div className="settings-page">
      <div className="settings-card card">
        <div className="settings-header">
          <div>
            <h1 className="h1-title">Settings</h1>
            <p className="settings-subtitle">
              Customize the app look, feel, and behavior.
            </p>
          </div>

          <div className={`save-badge ${saveStatus === "Saved" ? "ok" : ""}`}>
            {saveStatus}
          </div>
        </div>

        <div className="settings-grid">
          <section className="settings-section">
            <h3>Appearance</h3>

            <div className="settings-option">
              <label className="toggle-label">
                <input
                  type="checkbox"
                  checked={settings.darkMode}
                  onChange={() => updateSetting("darkMode", !settings.darkMode)}
                />
                <span className="toggle-custom"></span>
                <span>
                  <strong>Dark Mode</strong>
                  <small>Switch between light and dark appearance</small>
                </span>
              </label>
            </div>

            <div className="settings-option">
              <label className="toggle-label">
                <input
                  type="checkbox"
                  checked={settings.compactMode}
                  onChange={() =>
                    updateSetting("compactMode", !settings.compactMode)
                  }
                />
                <span className="toggle-custom"></span>
                <span>
                  <strong>Compact Mode</strong>
                  <small>Reduce spacing for denser layout</small>
                </span>
              </label>
            </div>

            <div className="settings-option">
              <label className="toggle-label">
                <input
                  type="checkbox"
                  checked={settings.reducedMotion}
                  onChange={() =>
                    updateSetting("reducedMotion", !settings.reducedMotion)
                  }
                />
                <span className="toggle-custom"></span>
                <span>
                  <strong>Reduced Motion</strong>
                  <small>Minimize animations and transitions</small>
                </span>
              </label>
            </div>

            <div className="settings-option">
              <label className="field-label">
                <span>
                  <strong>Primary Color</strong>
                  <small>Used for buttons and highlights</small>
                </span>
                <input
                  type="color"
                  className="color-picker"
                  value={settings.primaryColor}
                  onChange={(e) => updateSetting("primaryColor", e.target.value)}
                />
              </label>
            </div>

            <div className="settings-option">
              <label className="field-label">
                <span>
                  <strong>Font Size</strong>
                  <small>Controls the base app text size</small>
                </span>
                <select
                  className="select-input"
                  value={settings.fontSize}
                  onChange={(e) => updateSetting("fontSize", e.target.value)}
                >
                  <option value="14">Small</option>
                  <option value="16">Default</option>
                  <option value="18">Large</option>
                  <option value="20">Extra Large</option>
                </select>
              </label>
            </div>
          </section>

          <section className="settings-section">
            <h3>Preferences</h3>

            <div className="settings-option">
              <label className="field-label">
                <span>
                  <strong>Language</strong>
                  <small>Choose the app language</small>
                </span>
                <select
                  className="select-input"
                  value={settings.language}
                  onChange={(e) => updateSetting("language", e.target.value)}
                >
                  <option value="en">English</option>
                  <option value="hi">Hindi</option>
                </select>
              </label>
            </div>

            <div className="settings-option">
              <label className="field-label">
                <span>
                  <strong>Currency</strong>
                  <small>Default currency for amounts</small>
                </span>
                <select
                  className="select-input"
                  value={settings.currency}
                  onChange={(e) => updateSetting("currency", e.target.value)}
                >
                  <option value="INR">INR (₹)</option>
                  <option value="USD">USD ($)</option>
                  <option value="EUR">EUR (€)</option>
                </select>
              </label>
            </div>

            <div className="settings-option">
              <label className="toggle-label">
                <input
                  type="checkbox"
                  checked={settings.showTimestamps}
                  onChange={() =>
                    updateSetting("showTimestamps", !settings.showTimestamps)
                  }
                />
                <span className="toggle-custom"></span>
                <span>
                  <strong>Show Timestamps</strong>
                  <small>Display message time in chat views</small>
                </span>
              </label>
            </div>

            <div className="settings-option">
              <label className="field-label">
                <span>
                  <strong>Current Mode</strong>
                  <small>Quick summary of active settings</small>
                </span>
                <div className="mini-pill-row">
                  <span className="mini-pill">{themeLabel}</span>
                  <span className="mini-pill">{densityLabel}</span>
                  <span className="mini-pill">{motionLabel}</span>
                </div>
              </label>
            </div>
          </section>

          <section className="settings-section settings-preview">
            <h3>Preview</h3>
            <div className="preview-box">
              <div className="preview-top">
                <span
                  className="preview-dot"
                  style={{ background: settings.primaryColor }}
                />
                <strong>App Theme</strong>
              </div>

              <p>
                <strong>Theme:</strong> {themeLabel}
              </p>
              <p>
                <strong>Density:</strong> {densityLabel}
              </p>
              <p>
                <strong>Font:</strong> {settings.fontSize}px
              </p>
              <p>
                <strong>Motion:</strong> {motionLabel}
              </p>
              <p>
                <strong>Language:</strong> {languageLabel}
              </p>
              <p>
                <strong>Currency:</strong> {settings.currency}
              </p>

              <div className="preview-button-row">
                <button
                  type="button"
                  className="preview-action"
                  style={{ background: settings.primaryColor }}
                >
                  Sample Button
                </button>
              </div>
            </div>
          </section>
        </div>

        <div className="settings-actions">
          <button className="button-8b" onClick={resetSettings}>
            Reset to Defaults
          </button>
        </div>
      </div>
    </div>
  );
}