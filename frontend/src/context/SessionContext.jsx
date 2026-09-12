import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api';

const SessionContext = createContext();

export const SessionProvider = ({ children }) => {
  const [activeSessionId, setActiveSessionIdState] = useState(() => {
    return localStorage.getItem('vnsgu_active_session') || '';
  });
  const [sessions, setSessions] = useState([]);
  const [loadingSessions, setLoadingSessions] = useState(true);

  const refreshSessions = async () => {
    setLoadingSessions(true);
    try {
      const res = await api.getSessions();
      if (res.success && res.sessions && res.sessions.length > 0) {
        setSessions(res.sessions);
        const storedId = localStorage.getItem('vnsgu_active_session');
        // Only keep active session if the user explicitly uploaded/set it and it still exists
        if (storedId && res.sessions.some(s => String(s.id) === String(storedId))) {
          setActiveSessionIdState(storedId);
        } else if (res.sessions.length > 0) {
          // Auto-select latest active session so candidate records and colleges are instantly visible across all devices
          const defaultId = String(res.sessions[0].id);
          setActiveSessionIdState(defaultId);
          localStorage.setItem('vnsgu_active_session', defaultId);
        } else {
          setActiveSessionIdState('');
          localStorage.removeItem('vnsgu_active_session');
        }
      } else {
        setSessions([]);
        setActiveSessionIdState('');
        localStorage.removeItem('vnsgu_active_session');
      }
    } catch (_) {
    } finally {
      setLoadingSessions(false);
    }
  };

  const setActiveSessionId = (id) => {
    const sId = String(id || '');
    setActiveSessionIdState(sId);
    if (sId) {
      localStorage.setItem('vnsgu_active_session', sId);
    } else {
      localStorage.removeItem('vnsgu_active_session');
    }
  };

  const clearSession = () => {
    setActiveSessionIdState('');
    localStorage.removeItem('vnsgu_active_session');
  };

  useEffect(() => {
    refreshSessions();
  }, []);

  const hasUploaded = Boolean(activeSessionId);

  return (
    <SessionContext.Provider
      value={{
        activeSessionId,
        setActiveSessionId,
        clearSession,
        sessions,
        loadingSessions,
        refreshSessions,
        hasUploaded
      }}
    >
      {children}
    </SessionContext.Provider>
  );
};

export const useSession = () => useContext(SessionContext);
