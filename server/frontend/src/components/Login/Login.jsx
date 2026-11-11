import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../../api';
import { useSession } from '../../App';
export default function Login() {
  const navigate = useNavigate(); const { refresh, setNotice } = useSession();
  const [error, setError] = useState(''); const [busy, setBusy] = useState(false);
  async function submit(e) {
    e.preventDefault(); setBusy(true); setError('');
    const data = Object.fromEntries(new FormData(e.currentTarget));
    try { await api('/djangoapp/login', data); await refresh(); setNotice('Welcome back, '+data.userName+'.'); navigate('/'); }
    catch(e) { setError(e.message); } finally { setBusy(false); }
  }
  return <main className="auth-layout"><section className="auth-story"><p className="eyebrow">WELCOME BACK</p><h1>Your next drive.<br/>Your community.</h1><p>Sign in to share a review and help other drivers find a dealership they can trust.</p><img src="/static/cars.jpeg" alt="A selection of vehicles"/></section>
    <section className="auth-card"><h2>Log in</h2><p className="subtext">Good to see you again.</p><form onSubmit={submit}>
      <label>Username<input name="userName" autoComplete="username" required maxLength="150"/></label>
      <label>Password<input name="password" type="password" autoComplete="current-password" required maxLength="128"/></label>
      {error && <p className="error" role="alert">{error}</p>}<button className="button full" disabled={busy}>{busy ? 'Signing in…' : 'Log in →'}</button>
    </form><p className="auth-switch">New here? <Link to="/register">Create an account</Link></p></section></main>;
}
