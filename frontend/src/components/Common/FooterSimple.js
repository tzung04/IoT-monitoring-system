import React from "react";

const FooterSimple = () => {
  return (
    <footer style={{ padding: 12, textAlign: "center", background: "#f5f5f5" }}>
      © {new Date().getFullYear()} IoT Monitoring
    </footer>
  );
};

export default FooterSimple;
