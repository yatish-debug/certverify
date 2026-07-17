import { createContext, useContext, useState, useEffect, useRef } from 'react';
import { loginAdmin, setAuthToken } from '../services/api';
import { useNavigate } from 'react-router-dom';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(localStorage.getItem('adminToken'));
  const navigate = useNavigate();
  const inactivityTimerRef = useRef(null);

  const INACTIVITY_TIMEOUT = 15 * 60 * 1000;

  useEffect(() => {
    const resetInactivityTimer = () => {
      if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
      if (token) {
        inactivityTimerRef.current = setTimeout(() => {
          console.log("User inactive for 15 minutes. Auto-logging out.");
          logout();
        }, INACTIVITY_TIMEOUT);
      }
    };

    // Setup listeners for activity
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    const handleActivity = () => resetInactivityTimer();
    
    if (token) {
      resetInactivityTimer();
      events.forEach(event => window.addEventListener(event, handleActivity));
    }
    
    return () => {
      events.forEach(event => window.removeEventListener(event, handleActivity));
      if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
    };
  }, [token]);

  const login = async (username, password) => {
    const data = await loginAdmin(username, password);
    if (data.mfa_required) {
      return data;
    }
    setToken(data.access_token);
    localStorage.setItem('adminToken', data.access_token);
    setAuthToken(data.access_token);
    return data;
  };

  const loginWithMfa = async (username, otp_code) => {
    const { loginAdminMfa } = await import('../services/api');
    const data = await loginAdminMfa(username, otp_code);
    setToken(data.access_token);
    localStorage.setItem('adminToken', data.access_token);
    setAuthToken(data.access_token);
    return data;
  };

  const logout = () => {
    setToken(null);
    localStorage.removeItem('adminToken');
    setAuthToken(null);
    navigate('/admin/login');
  };

  return (
    <AuthContext.Provider value={{ token, isAuthenticated: !!token, login, loginWithMfa, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
