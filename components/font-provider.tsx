"use client";

import React, { useEffect } from "react";

export function FontProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Force a font refresh on client side
    document.body.classList.add("fonts-loaded");

    // Add Jaro font directly to the document to ensure it's always loaded
    const style = document.createElement("style");
    style.textContent = `
      @import url("https://fonts.googleapis.com/css2?family=Jaro:opsz@6..72&display=swap");
      
      .font-jaro {
        font-family: "Jaro", sans-serif !important;
      }
      
      h1, h2, h3, h4, h5, h6 {
        font-family: "Jaro", sans-serif !important;
      }
    `;
    document.head.appendChild(style);

    return () => {
      document.body.classList.remove("fonts-loaded");
      document.head.removeChild(style);
    };
  }, []);

  return <>{children}</>;
}
