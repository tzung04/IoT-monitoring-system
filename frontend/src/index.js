import React, { useEffect } from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";
import { AuthProvider } from "./context/AuthContext";
import logReactInfo from "./utils/logReactInfo";

// Call debug logger once when app mounts (this runs in the browser)
function Root() {
  useEffect(() => {
    logReactInfo();
  }, []);

  return (
    <AuthProvider>
      <App />
    </AuthProvider>
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>
);