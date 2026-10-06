import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { Send, CheckCircle2, AlertTriangle, Smartphone } from 'lucide-react';

const StudentScanner = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const [rollNumber, setRollNumber] = useState('');
  const [status, setStatus] = useState({ type: '', message: '' });
  const [loading, setLoading] = useState(false);
  const [deviceId, setDeviceId] = useState('');

  // Generate a mock browser deviceId if not already stored
  useEffect(() => {
    let id = localStorage.getItem('browser_device_id');
    if (!id) {
      id = 'WEB-' + Math.random().toString(36).substring(2, 10).toUpperCase() + '-' + Date.now().toString(36).toUpperCase();
      localStorage.setItem('browser_device_id', id);
    }
    setDeviceId(id);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!rollNumber.trim()) return;
    setLoading(true);
    setStatus({ type: '', message: '' });

    try {
      // First try to register this browser device to this roll number (simulating first login binding)
      try {
        await axios.post('/api/student/register-device', {
          rollNumber: rollNumber.trim().toUpperCase(),
          deviceId,
          deviceModel: 'Web Browser Fallback'
        });
      } catch (regErr) {
        // If registration fails because it is registered to another device, capture error
        if (regErr.response?.status === 400 && regErr.response?.data?.message?.includes('another physical device')) {
          setStatus({
            type: 'error',
            message: regErr.response.data.message
          });
          setLoading(false);
          return;
        }
      }

      // Submit attendance
      const res = await axios.post('/api/attendance/submit', {
        token,
        deviceId,
        rollNumber: rollNumber.trim().toUpperCase()
      });

      setStatus({
        type: 'success',
        message: res.data.message || '✅ Attendance marked successfully!'
      });
    } catch (err) {
      setStatus({
        type: 'error',
        message: err.response?.data?.message || '❌ Failed to submit attendance.'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="student-scanner-container">
      <div className="scanner-card">
        <div className="scanner-header">
          <div className="logo-icon">📱</div>
          <h2>Mark Attendance</h2>
          <p className="token-display-badge">Token: {token || 'No Token Selected'}</p>
        </div>

        {status.type === 'success' ? (
          <div className="success-state fade-in">
            <CheckCircle2 size={64} className="icon-success" />
            <h3>Success!</h3>
            <p>{status.message}</p>
            <button onClick={() => setStatus({ type: '', message: '' })} className="btn-secondary">
              Submit Another
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="scanner-form">
            {status.type === 'error' && (
              <div className="error-banner">
                <AlertTriangle size={18} />
                <span>{status.message}</span>
              </div>
            )}

            <div className="input-group">
              <label htmlFor="rollNumber">Enter Roll Number</label>
              <input
                type="text"
                id="rollNumber"
                required
                maxLength={10}
                placeholder="e.g. 23261A05C8"
                value={rollNumber}
                onChange={(e) => setRollNumber(e.target.value.toUpperCase())}
                autoFocus
              />
            </div>

            <button type="submit" disabled={loading || !token} className="btn-primary">
              <Send size={18} />
              {loading ? 'Submitting...' : 'Submit Attendance'}
            </button>
          </form>
        )}

        <div className="device-fingerprint-footer">
          <Smartphone size={12} />
          <span>Device ID: {deviceId}</span>
        </div>
      </div>
    </div>
  );
};

export default StudentScanner;
