import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../../api';
import { useSession } from '../../App';
export default function Register() {
  const navigate = useNavigate(); const { refresh, setNotice } = useSession();
  const [error, setError] = useState(''); const [busy, setBusy] = useState(false);
  async function submit(e) {
    e.preventDefault(); setBusy(true); setError('');
    const data = Object.fromEntries(new FormData(e.currentTarget));
    try { await api('/djangoapp/register', data); await refresh(); setNotice('Your account is ready, '+data.userName+'.'); navigate('/'); }
    catch(e) { setError(e.message); } finally { setBusy(false); }
  }
  return <main className="auth-layout"><section className="auth-story"><p className="eyebrow">JOIN THE CONVERSATION</p><h1>Every journey<br/>has a story.</h1><p>Make yours useful. Create an account to share dealership experiences with fellow drivers.</p><img src="/static/cars.jpeg" alt="Vehicles ready for their next journey"/></section>
    <section className="auth-card"><h2>Sign up</h2><p className="subtext">A few details, and you're on your way.</p><form onSubmit={submit}>
      <label>Username<input name="userName" autoComplete="username" required maxLength="150"/></label>
      <div className="form-row"><label>First Name<input name="firstName" autoComplete="given-name" required maxLength="150"/></label><label>Last Name<input name="lastName" autoComplete="family-name" required maxLength="150"/></label></div>
      <label>Email<input name="email" type="email" autoComplete="email" required maxLength="254"/></label>
      <label>Password<input name="password" type="password" autoComplete="new-password" required minLength="8" maxLength="128"/><small>At least 8 characters. Avoid common or entirely numeric passwords.</small></label>
      {error && <p className="error" role="alert">{error}</p>}<button className="button full" disabled={busy}>{busy ? 'Creating account…' : 'Register →'}</button>
    </form><p className="auth-switch">Already a member? <Link to="/login">Log in</Link></p></section></main>;
}
