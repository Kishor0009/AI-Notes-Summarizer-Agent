import React, { useState } from 'react';
import { db } from '../App'; // We'll export db from App.jsx or move init to a separate file

export function Login() {
    const [sentEmail, setSentEmail] = useState('');
    const [error, setError] = useState('');

    return (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh' }}>
            <div className="card" style={{ maxWidth: '400px', width: '100%', padding: '2rem' }}>
                <h1 style={{ marginTop: 0, textAlign: 'center' }}>Welcome Back</h1>
                {error && <div className="error-msg">{error}</div>}

                {!sentEmail ? (
                    <EmailStep onSendEmail={setSentEmail} setError={setError} />
                ) : (
                    <CodeStep sentEmail={sentEmail} setError={setError} />
                )}
            </div>
        </div>
    );
}

function EmailStep({ onSendEmail, setError }) {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            await db.auth.sendMagicCode({ email });
            onSendEmail(email);
        } catch (err) {
            setError(err.body?.message || 'Failed to send code.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit}>
            <p style={{ color: '#666', marginBottom: '1.5rem', textAlign: 'center' }}>
                Sign in with your email to access MetaNotes AI.
            </p>
            <div style={{ marginBottom: '1rem' }}>
                <input
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    style={{ width: '100%', padding: '0.75rem' }}
                />
            </div>
            <button
                type="submit"
                className="primary"
                style={{ width: '100%' }}
                disabled={loading}
            >
                {loading ? 'Sending...' : 'Send Code'}
            </button>
        </form>
    );
}

function CodeStep({ sentEmail, setError }) {
    const [code, setCode] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            await db.auth.signInWithMagicCode({ email: sentEmail, code });
            // App.jsx will handle the auth state change automatically
        } catch (err) {
            setError(err.body?.message || 'Invalid code.');
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit}>
            <p style={{ color: '#666', marginBottom: '1.5rem', textAlign: 'center' }}>
                Check your email <strong>{sentEmail}</strong> for the code.
            </p>
            <div style={{ marginBottom: '1rem' }}>
                <input
                    type="text"
                    placeholder="123456"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    required
                    style={{ width: '100%', padding: '0.75rem', textAlign: 'center', letterSpacing: '2px', fontSize: '1.2rem' }}
                />
            </div>
            <button
                type="submit"
                className="primary"
                style={{ width: '100%' }}
                disabled={loading}
            >
                {loading ? 'Verifying...' : 'Verify Code'}
            </button>
        </form>
    );
}
