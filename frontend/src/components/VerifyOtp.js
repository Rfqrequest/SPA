import React, { useState } from "react";

function VerifyOtp({ email, onVerifySuccess }) {
  const [otp, setOtp] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);

  const handleVerify = async (e) => {
    e.preventDefault();
    setLoading(true);
    setStatus("");

    try {
      const response = await fetch("https://spa-axlm.onrender.com/api/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code: otp }),
        credentials: "include"
      });

      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
      }

      const data = await response.json();

      if (data.success) {
        setStatus("OTP verified! Access granted.");
        onVerifySuccess();
      } else {
        setStatus(data.message || "Invalid OTP");
      }
    } catch (err) {
      setStatus(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleVerify}>
      <input 
        type="text" 
        placeholder="Enter OTP" 
        value={otp} 
        onChange={e => setOtp(e.target.value)} 
        required 
      />

      <button type="submit" disabled={loading}>
        {loading ? "Verifying..." : "Verify OTP"}
      </button>

      <div>{status}</div>
    </form>
  );
}

export default VerifyOtp;