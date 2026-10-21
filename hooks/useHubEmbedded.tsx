import React, { createContext, useContext } from "react";

/** True when a screen is rendered inside the Patients hub (which owns the header). */
const HubEmbeddedContext = createContext(false);

export function HubEmbeddedProvider({ children }: { children: React.ReactNode }) {
  return (
    <HubEmbeddedContext.Provider value={true}>
      {children}
    </HubEmbeddedContext.Provider>
  );
}

export function useHubEmbedded(): boolean {
  return useContext(HubEmbeddedContext);
}
