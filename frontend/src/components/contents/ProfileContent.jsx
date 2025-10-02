import React, { useState, useEffect } from "react";
import axios from "axios";

export default function Profile() {
  const [token, setToken] = useState("");
  const [profile, setProfile] = useState({ username: "", email: "" });

  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);

  // Password fields
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");

  const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";

  useEffect(() => {
    const savedToken = localStorage.getItem("token");
    if (savedToken) setToken(savedToken);
  }, []);

  const authHeaders = () => ({
    headers: { Authorization: `Bearer ${token}` },
  });

  // -------- Fetch Profile --------
  const fetchProfile = async () => {
    if (!token) return;
    try {
      setLoading(true);
      const res = await axios.get(`${API_URL}/api/profile`, authHeaders());
      setProfile({
        username: res.data.username || "",
        email: res.data.email || "",
      });
    } catch (err) {
      alert(err.response?.data?.error || "Failed to load profile.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, [token]);

  // -------- Update Profile --------
  const handleUpdateProfile = async () => {
    try {
      const res = await axios.put(`${API_URL}/api/profile`, profile, authHeaders());
      alert(res.data.message || "Profile updated successfully!");
      setEditing(false);
      fetchProfile();
    } catch (err) {
      alert(err.response?.data?.error || "Failed to update profile.");
    }
  };

  // -------- Change Password --------
  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword) {
      return alert("Please fill in both password fields.");
    }
    try {
      const res = await axios.put(
        `${API_URL}/api/profile/password`,
        { currentPassword, newPassword },
        authHeaders()
      );
      alert(res.data.message || "Password updated successfully!");
      setCurrentPassword("");
      setNewPassword("");
    } catch (err) {
      alert(err.response?.data?.error || "Failed to update password.");
    }
  };

  if (loading) return <p>Loading profile...</p>;

  return (
    <div className="card profile-card">
      <h2>User Profile</h2>

      {/* Profile Section */}
      <div className="profile-field">
        <label>Username:</label>
        {editing ? (
          <input
            type="text"
            value={profile.username}
            onChange={(e) => setProfile({ ...profile, username: e.target.value })}
          />
        ) : (
          <p>{profile.username}</p>
        )}
      </div>

      <div className="profile-field">
        <label>Email:</label>
        {editing ? (
          <input
            type="email"
            value={profile.email}
            onChange={(e) => setProfile({ ...profile, email: e.target.value })}
          />
        ) : (
          <p>{profile.email}</p>
        )}
      </div>

      <div className="profile-actions">
        {editing ? (
          <>
            <button onClick={handleUpdateProfile}>Save</button>
            <button onClick={() => setEditing(false)}>Cancel</button>
          </>
        ) : (
          <button onClick={() => setEditing(true)}>Edit Profile</button>
        )}
      </div>

      <hr />

      {/* Password Section */}
      <h3>Change Password</h3>
      <div className="profile-field">
        <label>Current Password:</label>
        <input
          type="password"
          placeholder="Enter current password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
        />
      </div>

      <div className="profile-field">
        <label>New Password:</label>
        <input
          type="password"
          placeholder="Enter new password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
        />
      </div>

      <button onClick={handleChangePassword}>Update Password</button>
    </div>
  );
}
