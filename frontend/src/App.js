import React, { useState } from "react";
import Login from "./components/Login";
import VerifyOtp from "./components/VerifyOtp";

function App() {
  const [email, setEmail] = useState(null);
  const [authenticated, setAuthenticated] = useState(false);

  const handleLoginSuccess = (loggedInEmail) => setEmail(loggedInEmail);
  const handleVerifySuccess = () => setAuthenticated(true);

  if (authenticated) return <div>Welcome! Authenticated user, access granted.</div>;

  return (
    <div>
      {!email ? (
        <Login onLoginSuccess={handleLoginSuccess} />
      ) : (
        <VerifyOtp email={email} onVerifySuccess={handleVerifySuccess} />
      )}
    </div>
  );
}

export default App;