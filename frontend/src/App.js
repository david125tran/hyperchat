// src/Ap.js

import React, { useState } from "react";
import { Routes, Route, useNavigate } from "react-router-dom";
import ChatPage from "./ChatPage";
import "./App.css";

function Login() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    username: "",
    password: "",
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (
      form.username.toLowerCase().trim() === "admin" &&
      form.password === "admin"
    ) {
      alert("Login successful!");
      navigate("/chat");
    } else {
      alert("Invalid username or password.");
    }
  };

  return (
    <div className="app-root">
      <div className="auth-card">
        <h1 className="app-title">Hyperchat Portal</h1>

        <form className="auth-form" onSubmit={handleSubmit}>
          <label className="field-label" htmlFor="username">
            Username
          </label>
          <input
            id="username"
            name="username"
            className="text-input"
            type="text"
            value={form.username}
            onChange={handleChange}
            required
          />

          <label className="field-label" htmlFor="password">
            Password
          </label>
          <input
            id="password"
            name="password"
            className="text-input"
            type="password"
            value={form.password}
            onChange={handleChange}
            required
          />

          <button type="submit" className="primary-button">
            Sign In
          </button>
        </form>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Login />} />
      <Route path="/chat" element={<ChatPage />} />
    </Routes>
  );
}
