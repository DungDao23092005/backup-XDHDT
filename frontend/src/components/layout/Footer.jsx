import React from "react";

const Footer = () => {
  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="max-w-6xl mx-auto px-4 py-4 text-sm text-slate-500">
        © {new Date().getFullYear()} UTH Conference Microservices — Notification • Submission • Review • Conference
      </div>
    </footer>
  );
};

export default Footer;
