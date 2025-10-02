import React from 'react';

export default function Home() {
  return (
    <main className="card Home-card">
      <div>
        <div>
            <h2>
              Take Control of Your Finances
              <span>with Smart Expense Analysis</span>
            </h2>
            <p>
              Track, analyze, and optimize your spending patterns — all in one place. Simple, secure, and
              actionable insights to help you save more.
            </p>
            <div>
              <button>Get Started Free</button>
              <button>Learn More</button>
            </div>
          </div>
        <section>
          <h2>Why Choose Us?</h2>
          <div>
            <FeatureCard title="Smart Expense Tracking" desc="Automatically categorize and monitor your daily expenses." />
            <FeatureCard title="Data Insights" desc="Visual charts and reports to help you understand where your money goes." />
            <FeatureCard title="Budget Planning" desc="Set budgets, track progress, and stay on top of your financial goals." />
            <FeatureCard title="Secure & Private" desc="Your data is protected with industry-standard security measures." />
          </div>
        </section>
      </div>
    </main>
  );
}
function FeatureCard({ title, desc }) {
  return (
    <div>
      <h4>{title}</h4>
      <p>{desc}</p>
    </div>
  );
}
