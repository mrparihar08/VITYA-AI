
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Login from "./components/Login";
import Register from "./components/Register";
import Dashboard from "./components/Dashboard";
import "./App.css";
function App() {
  return (
    <Router>
      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={<Login/>}/>
        <Route path="/register" element={<Register/>}/>

        {/* Protected Route */}
        <Route path="/dashboard"element={<Dashboard/>}/>

        {/* Default Route */}
        <Route
          path="/"
          element={<Dashboard/>}
        />
      </Routes>
    </Router>
  );
}

export default App;
