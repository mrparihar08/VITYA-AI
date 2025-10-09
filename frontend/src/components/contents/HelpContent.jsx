import React, { useState, useRef } from "react";
import emailjs from "emailjs-com";

export default function HelpContent() {
  const form = useRef();
  const [status, setStatus] = useState({ sent: false, error: "" });

  function sendEmail(e) {
    e.preventDefault();
    setStatus({ sent: false, error: "" });
    if (!form.current) return;

    emailjs
      .sendForm(
        process.env.REACT_APP_EMAILJS_SERVICE_ID,
        process.env.REACT_APP_EMAILJS_TEMPLATE_ID,
        form.current,
        process.env.REACT_APP_EMAILJS_PUBLIC_KEY
      )
      .then(() => {
        setStatus({ sent: true, error: "" });
        form.current.reset();
      })
      .catch((err) => {
        console.error(err);
        setStatus({ sent: false, error: "Failed to send — please try again later." });
      });
  }

  return (
    <div className="card help-card">
      <h3>Help & Support</h3>
      <p>For assistance, please contact:</p>
      <ul>
        <li>Phone: +91-9876543210</li>
        <li>
          Docs: <a href="https://example.com/docs">Click here</a>
        </li>
      </ul>

      <section id="contact">
        <h3>Contact</h3>

        <form ref={form} onSubmit={sendEmail}>
          <div>
            <input name="user_name" placeholder="Your name" required />
            <input name="user_email" type="email" placeholder="Email" required />
          </div>
          <textarea name="message" rows={5} placeholder="How can I help?" required />

          <div>
            <button type="submit">Send Message</button>
            {status.sent && <div>✅ Sent</div>}
            {status.error && <div>{status.error}</div>}
          </div>
        </form>

        <div>
          Prefer email?{" "}
          <a href="mailto:pradeep081020parihar@gmail.com" className="underline">
            pradeep081020parihar@gmail.com
          </a>
        </div>
      </section>
    </div>
  );
}
