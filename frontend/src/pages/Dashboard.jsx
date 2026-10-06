import React, { useState, useEffect, useContext, useRef } from 'react';
import { AuthContext } from '../context/AuthContext';
import { io } from 'socket.io-client';
import axios from 'axios';
import { Download, Users, Play, LogOut, Clock, CheckCircle } from 'lucide-react';

const Dashboard = () => {
  const { logout, user } = useContext(AuthContext);
  const [className, setClassName] = useState('');
  const [activeSession, setActiveSession] = useState(null);
  const [presentStudents, setPresentStudents] = useState([]);
  const [countdown, setCountdown] = useState(10);
  const [loading, setLoading] = useState(false);
  const socketRef = useRef();

  // 1. Fetch current active session on load
  useEffect(() => {
    fetchActiveSession();
  }, []);

  const fetchActiveSession = async () => {
    try {
      const res = await axios.get('/api/sessions/active');
      setActiveSession(res.data);
      // Fetch initial attendance for this active session
      fetchAttendanceList(res.data._id);
    } catch (err) {
      setActiveSession(null);
    }
  };

  const fetchAttendanceList = async (sessionId) => {
    try {
      const res = await axios.get(`/api/attendance/session/${sessionId}`);
      setPresentStudents(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  // 2. Manage Socket.io connection and token countdown
  useEffect(() => {
    if (!activeSession) return;

    // Connect to the socket server
    const backendUrl = axios.defaults.baseURL || window.location.origin.replace(':5173', ':3000');
    socketRef.current = io(backendUrl);

    // Listen for live student check-ins
    socketRef.current.on('studentCheckedIn', (data) => {
      if (data.sessionId === activeSession._id) {
        setPresentStudents((prev) => {
          // Prevent duplicates in state
          if (prev.some((s) => s.rollNumber === data.rollNumber)) return prev;
          return [{
            rollNumber: data.rollNumber,
            studentId: { name: data.name },
            timestamp: data.timestamp
          }, ...prev];
        });
      }
    });

    // Listen for token rotations
    socketRef.current.on('tokenUpdate', (data) => {
      if (data.sessionId === activeSession._id) {
        setActiveSession((prev) => ({
          ...prev,
          currentToken: data.token
        }));
        setCountdown(10); // Reset timer
      }
    });

    // Countdown Timer Interval
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          // Trigger a silent API call to fetch token rotation
          axios.get('/api/sessions/active').catch(() => {});
          return 10;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      clearInterval(timer);
      if (socketRef.current) socketRef.current.disconnect();
    };
  }, [activeSession]);

  const handleStartSession = async (e) => {
    e.preventDefault();
    if (!className.trim()) return;
    setLoading(true);

    try {
      const res = await axios.post('/api/sessions', { className });
      setActiveSession(res.data);
      setPresentStudents([]);
      setCountdown(10);
    } catch (err) {
      alert('❌ Failed to start session: ' + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  };

  const handleEndSession = async () => {
    if (!window.confirm('Are you sure you want to end this attendance session?')) return;
    try {
      await axios.put(`/api/sessions/${activeSession._id}/end`);
      setActiveSession(null);
      setPresentStudents([]);
    } catch (err) {
      alert('Failed to end session');
    }
  };

  const handleDownloadCSV = () => {
    if (!activeSession) return;
    // Direct link to download route
    const downloadUrl = `/api/attendance/session/${activeSession._id}/export`;
    const backendUrl = axios.defaults.baseURL || window.location.origin.replace(':5173', ':3000');
    
    // Open in a new tab to trigger browser download
    const token = localStorage.getItem('token');
    window.open(`${backendUrl}${downloadUrl}?token=${token}`, '_blank');
  };

  // Generate dynamic URL for scanning
  const getScannerUrl = () => {
    if (!activeSession) return '';
    const origin = window.location.origin; // e.g. http://192.168.1.50:5173
    return `${origin}/scanner?token=${activeSession.currentToken}`;
  };

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <div className="header-left">
          <h1>📸 MGIT QR Attendance</h1>
          <p>Welcome, {user?.name || 'Lecturer'}</p>
        </div>
        <button onClick={logout} className="btn-logout">
          <LogOut size={18} />
          Logout
        </button>
      </header>

      <main className="dashboard-content">
        {!activeSession ? (
          // Start Session Card
          <div className="card start-session-card">
            <h2>Start Attendance Session</h2>
            <p>Enter the class details to generate a dynamic live QR code for scanning.</p>
            <form onSubmit={handleStartSession} className="start-form">
              <input
                type="text"
                required
                placeholder="e.g., CSE-C (Software Engineering)"
                value={className}
                onChange={(e) => setClassName(e.target.value)}
              />
              <button type="submit" disabled={loading} className="btn-primary">
                <Play size={18} />
                {loading ? 'Creating...' : 'Start Session'}
              </button>
            </form>
          </div>
        ) : (
          // Active Session Dashboard
          <div className="active-session-grid">
            {/* Left Column: QR and Info */}
            <div className="card qr-display-card">
              <div className="card-header">
                <h2>Active Session: {activeSession.className}</h2>
                <button onClick={handleEndSession} className="btn-danger">
                  End Session
                </button>
              </div>

              <div className="qr-box">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(getScannerUrl())}`}
                  alt="Attendance QR Code"
                  className="qr-img"
                />
                <div className="timer-wrapper">
                  <Clock size={16} />
                  <span>Refreshes in: <strong>{countdown}s</strong></span>
                </div>
              </div>

              <div className="token-info">
                <p>Manual Token: <span className="token-code">{activeSession.currentToken}</span></p>
                <small className="link-text">URL: {getScannerUrl()}</small>
              </div>
            </div>

            {/* Right Column: Present Students List */}
            <div className="card students-list-card">
              <div className="card-header">
                <div className="stats-header">
                  <Users size={20} />
                  <h3>Students Present: <span className="count-badge">{presentStudents.length}</span></h3>
                </div>
                <button 
                  onClick={handleDownloadCSV} 
                  disabled={presentStudents.length === 0} 
                  className="btn-success"
                >
                  <Download size={16} />
                  Export CSV
                </button>
              </div>

              <div className="table-wrapper">
                {presentStudents.length === 0 ? (
                  <div className="empty-state">
                    <p>Waiting for students to scan the QR code...</p>
                  </div>
                ) : (
                  <table className="students-table">
                    <thead>
                      <tr>
                        <th>Roll Number</th>
                        <th>Student Name</th>
                        <th>Check-in Time</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {presentStudents.map((std, i) => (
                        <tr key={i} className="fade-in">
                          <td><strong>{std.rollNumber}</strong></td>
                          <td>{std.studentId?.name || 'MGIT Student'}</td>
                          <td>{new Date(std.timestamp).toLocaleTimeString()}</td>
                          <td>
                            <span className="badge-present">
                              <CheckCircle size={12} />
                              Present
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default Dashboard;
