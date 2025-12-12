import React, { useState } from 'react';
import { checkAccessCode, setSessionUnlocked } from '../utils/accessControl';

interface AccessModalProps {
  isOpen: boolean;
  onSuccess: () => void;
  onClose: () => void;
}

export const AccessModal: React.FC<AccessModalProps> = ({ isOpen, onSuccess, onClose }) => {
  const [code, setCode] = useState('');
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(false);

    try {
      const isValid = await checkAccessCode(code);
      if (isValid) {
        setSessionUnlocked();
        onSuccess();
      } else {
        setError(true);
      }
    } catch (err) {
      console.error(err);
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[110] overflow-y-auto" role="dialog" aria-modal="true">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-gray-900 bg-opacity-90 backdrop-blur-sm transition-opacity" onClick={onClose}></div>

      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-accent to-purple-600"></div>
          
          <div className="text-center mb-8">
            <div className="bg-gray-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
               <svg className="w-8 h-8 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
            </div>
            <h3 className="text-2xl font-serif font-bold text-gray-900">Hackathon Access</h3>
            <p className="text-gray-500 mt-2 text-sm">
              Please enter your Judge or Developer access code to unlock the high-definition rendering engine.
            </p>
            <div className="mt-4 p-3 bg-blue-50 border border-blue-100 rounded-lg">
              <p className="text-blue-800 text-xs font-bold flex items-center justify-center gap-1">
                 <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                 Judges & Reviewers
              </p>
              <p className="text-blue-600 text-xs mt-1">
                Please check the official submission notes/details for your access code.
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-2">Access Code</label>
              <input 
                type="password"
                value={code}
                onChange={(e) => { setCode(e.target.value); setError(false); }}
                placeholder="Enter access code..."
                className={`w-full p-4 bg-gray-50 border rounded-xl focus:ring-2 focus:outline-none transition-all text-lg tracking-widest ${error ? 'border-red-300 focus:ring-red-200' : 'border-gray-200 focus:ring-accent/20'}`}
                autoFocus
              />
              {error && <p className="text-red-500 text-xs mt-2 font-medium">Invalid access code. Please try again.</p>}
            </div>

            <button 
              type="submit"
              disabled={loading || !code}
              className={`w-full py-4 rounded-xl font-bold text-white shadow-lg transform transition-all 
                ${loading || !code ? 'bg-gray-300 cursor-not-allowed' : 'bg-arch-900 hover:bg-black hover:-translate-y-1'}`}
            >
              {loading ? 'Verifying...' : 'Unlock Rendering'}
            </button>
          </form>
          
          <div className="mt-6 text-center">
             <button onClick={onClose} className="text-sm text-gray-400 hover:text-gray-600 underline">Cancel</button>
          </div>
        </div>
      </div>
    </div>
  );
};