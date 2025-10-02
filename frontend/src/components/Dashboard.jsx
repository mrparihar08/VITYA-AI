import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ActiveContent from './contents/ActiveContent';

export default function Dashboard() {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState('home');
  const [title] = useState('');

  const options = [
    { id: 'home', title: 'Home', desc: 'Main dashboard view' },
    { id: 'profile', title: 'Profile', desc: 'User profile settings' },
    { id: 'settings', title: 'Settings', desc: 'Application settings' },
    { id: 'advice', title: 'Advice', desc: 'AI-driven advice' },
    { id: 'income', title: 'Income', desc: 'Track income records' },
    { id: 'expense', title: 'Expense', desc: 'Manage expenses' },
    { id: 'graphs', title: 'Graphs', desc: 'Visualize data' },
    { id: 'trendGraphs', title: 'Trend Graphs', desc: 'Show trends over time' },
    { id: 'help', title: 'Help', desc: 'Get help & support' },
  ];

  return (
    <div className="dashboard-container">
      <div className="dashboard-wrapper">
        
        {/* Header */}
        <header className="dashboard-header">
          <h1 className="dashboard-title">VITYA.AI</h1>
          <button 
            onClick={() => setOpen(true)} 
            className="open-options-btn"
          > ☰
          </button>
        </header>
{/*========================================================= */}
        {/* Main Section */}
        <main className="dashboard-main">
          
          {/* Active Content */}
          <section className="active-section">
            <h2 className="active-title">{title}</h2>
            <ActiveContent id={active} />
          </section>

          {/* Sidebar (Desktop) */}
          <aside className="sidebar">
            {options.map((o) => (
              <button
                key={o.id}
                onClick={() => setActive(o.id)}
                className={`sidebar-btn ${active === o.id ? 'active' : ''}`}
              >
                {o.title}
              </button>
            ))}
          </aside>
        </main>

        {/* Drawer (Mobile) */}
        <AnimatePresence>
          {open && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.4 }}
                exit={{ opacity: 0 }}
                onClick={() => setOpen(false)}
                className="drawer-backdrop"
              />
              <motion.aside
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                className="drawer"
              >
                <h3 className="drawer-title">Options</h3>
                {options.map((o) => (
                  <button
                    key={o.id}
                    onClick={() => {
                      setActive(o.id);
                      setOpen(false);
                    }}
                    className="drawer-btn"
                  >
                    {o.title}
                  </button>
                ))}
              </motion.aside>
            </>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
