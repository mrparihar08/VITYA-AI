import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import './App.css';

import SpleshScreen from './Router/SpleshScreen';
import {Profile,Singup,Login} from './Router/Register';
import Dashboard from './Router/Dashboard';
import Advice from './Router/Advice';
import {Income,Expense} from './Router/Income';
import {Graph, TrendGraph} from './Router/Graphs';

export default function App() {
  return (
    <Router>
      <Routes>
        {/* Splash screen / landing page */}
        <Route path="/ghj" element={<SpleshScreen />} />

        {/* Main dashboard / registration */}
        <Route path="/Singup" element={<Singup />} />
        <Route path="/Login" element={<Login />} />
        <Route path="/Profile" element={<Profile />} />
        <Route path="/" element={<Dashboard />} />

        {/* Expense, Income, Advice, Graphs */}
        <Route path="/expense" element={<Expense />} />
        <Route path="/income" element={<Income />} />
        <Route path="/advice" element={<Advice />} />
        <Route path="/graphs" element={<Graph/>} />
        <Route path="/trendgraphs" element={<TrendGraph/>} />

        {/* Catch all unmatched routes */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
    
    
  );
}

