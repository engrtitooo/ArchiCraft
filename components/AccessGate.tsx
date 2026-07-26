import React, { useState, useEffect, useRef } from 'react';

type AuthStep = 'CHECKING' | 'PASSWORD' | 'OTP' | 'AUTHENTICATED';

interface AccessGateProps {
    children: React.ReactNode;
}

export const AccessGate: React.FC<AccessGateProps> = ({ children }) => {
    const [step, setStep] = useState<AuthStep>('CHECKING');
    const [password, setPassword] = useState('');
    const [otp, setOtp] = useState('');
    const [maskedEmail, setMaskedEmail] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    
    const activityTimeout = useRef<number | null>(null);

    // Initial load check
    useEffect(() => {
        const checkAuth = async () => {
            const isTabActive = sessionStorage.getItem('tab_session_active');
            
            if (!isTabActive) {
                // If this flag is missing, the tab was closed and reopened, or it's a new tab.
                // Destroy backend session (if any) and reset.
                try {
                    await fetch('/api/logout', { method: 'POST', credentials: 'include' });
                } catch (e) {
                    console.error("Logout error", e);
                }
                setStep('PASSWORD');
                return;
            }

            try {
                const res = await fetch('/api/check-auth', { credentials: 'include' });
                const data = await res.json().catch(() => null);
                if (res.ok && data && data.status === 'authenticated') {
                    setStep('AUTHENTICATED');
                    setupInactivityTimer();
                } else {
                    sessionStorage.removeItem('tab_session_active');
                    setStep('PASSWORD');
                }
            } catch (err) {
                sessionStorage.removeItem('tab_session_active');
                setStep('PASSWORD');
            }
        };

        checkAuth();

        return () => {
            if (activityTimeout.current) window.clearTimeout(activityTimeout.current);
        };
    }, []);

    const logout = async () => {
        try {
            await fetch('/api/logout', { method: 'POST' });
        } catch (e) {
            console.error(e);
        }
        sessionStorage.removeItem('tab_session_active');
        setStep('PASSWORD');
        setPassword('');
        setOtp('');
        setError('');
    };

    const setupInactivityTimer = () => {
        const resetTimer = () => {
            if (activityTimeout.current) window.clearTimeout(activityTimeout.current);
            // 5 minutes (300,000 ms)
            activityTimeout.current = window.setTimeout(() => {
                logout();
            }, 300000);
        };

        const events = ['mousemove', 'keydown', 'touchstart', 'scroll'];
        
        const handleActivity = () => {
            // Check if we are still authenticated before resetting the timer
            if (step === 'AUTHENTICATED') {
                resetTimer();
            }
        };

        events.forEach(evt => window.addEventListener(evt, handleActivity));
        resetTimer();

        return () => {
            events.forEach(evt => window.removeEventListener(evt, handleActivity));
            if (activityTimeout.current) window.clearTimeout(activityTimeout.current);
        };
    };

    const handlePasswordSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const res = await fetch('/api/verify-access', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password })
            });

            const data = await res.json();
            if (res.ok) {
                setMaskedEmail(data.email || '');
                setStep('OTP');
            } else if (res.status === 429) {
                setError('Too many attempts. Please wait 1 minute.');
            } else {
                setError(data.detail || 'Invalid password');
            }
        } catch (err) {
            setError('Connection error');
        } finally {
            setLoading(false);
        }
    };

    const handleOtpSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const res = await fetch('/api/verify-2fa', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ otp })
            });

            const data = await res.json();
            if (res.ok) {
                sessionStorage.setItem('tab_session_active', 'true');
                setStep('AUTHENTICATED');
                setupInactivityTimer();
            } else if (res.status === 429) {
                setError('Too many attempts. Please wait 1 minute.');
            } else {
                setError(data.detail || 'Invalid OTP');
            }
        } catch (err) {
            setError('Connection error');
        } finally {
            setLoading(false);
        }
    };

    if (step === 'CHECKING') {
        return (
            <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center font-sans">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-arch-900 mb-4"></div>
                <p className="text-gray-500 font-medium">Verifying Server Session...</p>
            </div>
        );
    }

    if (step === 'PASSWORD') {
        return (
            <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center font-sans p-4">
                <div className="max-w-md w-full bg-white p-8 rounded-2xl shadow-lg border border-gray-100">
                    <h2 className="text-2xl font-serif font-bold text-gray-900 mb-6 text-center">Secure Access</h2>
                    <form onSubmit={handlePasswordSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Master Password</label>
                            <input 
                                type="password" 
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-arch-900 focus:border-transparent outline-none"
                                required
                            />
                        </div>
                        {error && <p className="text-red-500 text-sm text-center">{error}</p>}
                        <button 
                            type="submit" 
                            disabled={loading}
                            className="w-full bg-arch-900 text-white font-bold py-3 rounded-lg hover:bg-black transition-colors disabled:opacity-50"
                        >
                            {loading ? 'Verifying...' : 'Continue'}
                        </button>
                    </form>
                </div>
            </div>
        );
    }

    if (step === 'OTP') {
        return (
            <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center font-sans p-4">
                <div className="max-w-md w-full bg-white p-8 rounded-2xl shadow-lg border border-gray-100">
                    <h2 className="text-2xl font-serif font-bold text-gray-900 mb-2 text-center">2-Step Verification</h2>
                    <p className="text-center text-sm text-gray-500 mb-6">
                        Enter the 6-digit code sent to {maskedEmail}
                    </p>
                    <form onSubmit={handleOtpSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Verification Code</label>
                            <input 
                                type="text" 
                                value={otp}
                                onChange={(e) => setOtp(e.target.value)}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-arch-900 focus:border-transparent outline-none text-center tracking-widest text-lg"
                                maxLength={6}
                                required
                            />
                        </div>
                        {error && <p className="text-red-500 text-sm text-center">{error}</p>}
                        <button 
                            type="submit" 
                            disabled={loading}
                            className="w-full bg-arch-900 text-white font-bold py-3 rounded-lg hover:bg-black transition-colors disabled:opacity-50"
                        >
                            {loading ? 'Verifying...' : 'Verify & Access'}
                        </button>
                    </form>
                </div>
            </div>
        );
    }

    // Must be AUTHENTICATED
    return <>{children}</>;
};
