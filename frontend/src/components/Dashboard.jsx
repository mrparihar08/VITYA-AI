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
    { id: 'trendGraphs', title: 'Trend Graphs', desc: 'Show trends over time' },
    { id: 'help', title: 'Help', desc: 'Get help & support' },
  ];

  return (
    <div className="dashboard">
      <div className="dashboard-wrapper">
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
           <div className="mobile-logo" role="banner" aria-label="VITYA.AI logo">
                <div className="logo-circle">V</div>
                <div className="logo-text">
                   <h2>VITYA.AI</h2>
                    <p>Expense Dashboard</p>
                </div>
                </div>    
            <nav className="menu">      
            {options.map((o) => (
              <button
                key={o.id}
                onClick={() => setActive(o.id)}
                className={`sidebar-btn ${active === o.id ? 'active' : ''}`}
              >
                {o.title}
              </button>
            ))}
            </nav>
          <div className="pro-card">
          <div className="pro-icon">E</div>
          <span>Expensio Pro</span>
          <span className="pro-badge">Pro</span>
        </div>
          </aside>
        </main>
        <div className="open-options-mo">
           <div className="mobile-logo" role="banner" aria-label="VITYA.AI logo">
                <div className="logo-circle">V</div>
                <div className="logo-text">
                   <h2>VITYA.AI</h2>
                    <p>Expense Dashboard</p>
                </div>
                </div>           
          <button 
            onClick={() => setOpen(true)}
            className="open-options-btn" 
          > ☰
          </button>
        </div>
  
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
