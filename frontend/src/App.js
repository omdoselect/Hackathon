import React from "react";
import { BrowserRouter, Routes, Route, NavLink } from "react-router-dom";
import JobsList from "./pages/JobsList";
import Profile from "./pages/Profile";
import logo from "./images/logo.png";

const Navbar = () => (
  <nav className="navbar">
    <NavLink to="/" className="navbar-brand" aria-label="Go to home page">
      <img src={logo} alt="JobsPortal logo" className="brand-logo" />
    </NavLink>
    <div className="navbar-links">
      <NavLink to="/jobs" className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>
        Jobs
      </NavLink>
      <NavLink to="/profile" className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>
        Profile
      </NavLink>
    </div>
    <div className="navbar-right">
      <button className="btn-outline">Auto Apply</button>
    </div>
  </nav>
);

const App = () => (
  <BrowserRouter>
    <Navbar />
    <div className="app-container">
      <Routes>
        <Route path="/" element={<JobsList />} />
        <Route path="/jobs" element={<JobsList />} />
        <Route path="/profile" element={<Profile />} />
      </Routes>
    </div>
  </BrowserRouter>
);

export default App;
