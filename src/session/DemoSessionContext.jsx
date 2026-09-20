import React, { createContext, useContext, useState, useEffect } from 'react';
const DemoSessionContext = createContext();
export function DemoSessionProvider({ children }) {
  const [session, setSession] = useState(() => {
    const saved = localStorage.getItem('demo_session');
    return saved ? JSON.parse(saved) : null;
  });
  useEffect(() => {
    if (session) {
      localStorage.setItem('demo_session', JSON.stringify(session));
    } else {
      localStorage.removeItem('demo_session');
    }
  }, [session]);
  const login = (role, personId = null) => setSession({ role, personId });
  const logout = () => setSession(null);
  return (
    <DemoSessionContext.Provider value={{ session, login, logout }}>
      {children}
    </DemoSessionContext.Provider>
  );
}
export const useDemoSession = () => useContext(DemoSessionContext);
