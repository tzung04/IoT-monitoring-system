import React from "react";
import { Outlet } from "react-router-dom";
import HeaderSimple from "../Common/HeaderSimple";
import FooterSimple from "../Common/FooterSimple";

const SimpleLayout = () => {
  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      <HeaderSimple />
      <main style={{ flex: 1, padding: 16 }}>
        <Outlet />
      </main>
      <FooterSimple />
    </div>
  );
};

export default SimpleLayout;
