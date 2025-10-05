
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import{Register, Login,Profile} from "./components/contents/ProfileContent";
import Dashboard from "./components/Dashboard";
import "./App.css";
function App() {
  return (
    <Router>
      <Routes>
         <Route path="/profile" element={<Profile/>}/>
        <Route path="/login" element={<Login/>}/>
        <Route path="/register" element={<Register/>}/>
        <Route path="/dashboard"element={<Dashboard/>}/>
        <Route path="/"element={<Dashboard/>}/>
      </Routes>
    </Router>
  );
}

export default App;
