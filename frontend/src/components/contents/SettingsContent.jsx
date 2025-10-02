import React, { useState } from 'react';

export default function SettingsContent() {
  const [notifications, setNotifications] = useState(true);
  const [compact, setCompact] = useState(false);

  return (
    <div className="card settings-card">
      <h3 className="settings-title">Settings</h3>

      <div className="settings-option">
        <label className="toggle-label">
          <input
            type="checkbox"
            checked={notifications}
            onChange={() => setNotifications(!notifications)}
          />
          <span className="toggle-custom"></span>
          Enable Notifications
        </label>
      </div>

      <div className="settings-option">
        <label className="toggle-label">
          <input
            type="checkbox"
            checked={compact}
            onChange={() => setCompact(!compact)}
          />
          <span className="toggle-custom"></span>
          Use Compact Mode
        </label>
      </div>
    </div>
  );
}
