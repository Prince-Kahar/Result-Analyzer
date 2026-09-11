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
        const exists = res.sessions.some(s => String(s.id) === String(activeSessionId));
        if (!activeSessionId || !exists) {
          const latestId = String(res.sessions[0].id);
          setActiveSessionIdState(latestId);
          localStorage.setItem('vnsgu_active_session', latestId);
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

  useEffect(() => {
    refreshSessions();
  }, []);

  const hasUploaded = Boolean(activeSessionId && sessions.length > 0);

  return (
    <SessionContext.Provider
      value={{
        activeSessionId,
        setActiveSessionId,
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
