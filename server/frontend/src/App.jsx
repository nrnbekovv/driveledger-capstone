import React, { createContext, useContext, useEffect, useState } from 'react';
import { Routes, Route, Link, useNavigate } from 'react-router-dom';
import { api } from './api';
import Dealers from './components/Dealers/Dealers';
import Dealer from './components/Dealers/Dealer';
import PostReview from './components/Dealers/PostReview';
import Register from './components/Register/Register';
import Login from './components/Login/Login';
export const SessionContext = createContext(null);
export const useSession = () => useContext(SessionContext);
export default function App() {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();
  async function refresh() { const s = await api('/djangoapp/session'); setUser(s.authenticated ? s : null); }
  useEffect(() => { refresh().catch(e => setError(e.message)).finally(() => setReady(true)); }, []);
  async function signOut() {
    try { await api('/djangoapp/logout', {}); setUser(null); setNotice('You have been logged out successfully.'); navigate('/'); }
    catch (e) { setError(e.message); }
  }
  return <SessionContext.Provider value={{ user, ready, refresh, setNotice }}>
    <header className="site-header"><Link className="brand" to="/"><span className="brand-mark">D<span>↗</span></span>DriveLedger</Link>
      <nav aria-label="Main navigation"><Link to="/">Dealerships</Link><a href="/about">About Us</a><a href="/contact">Contact Us</a></nav>
      <div className="account">{user ? <><span className="username"><span className="online-dot" />{user.userName}</span><button className="button small ghost" onClick={signOut}>Log out</button></> :
        <><Link className="login-link" to="/login">Log in</Link><Link className="button small" to="/register">Sign up <span>↗</span></Link></>}</div>
    </header>
    {notice && <div className="notice" role="status">{notice}<button aria-label="Dismiss notification" onClick={() => setNotice('')}>×</button></div>}
    {error && <p className="error" role="alert">{error}</p>}
    {ready ? <Routes>
      <Route path="/" element={<Dealers/>}/><Route path="/dealers" element={<Dealers/>}/>
      <Route path="/dealer/:id" element={<Dealer/>}/><Route path="/postreview/:id" element={<PostReview/>}/>
      <Route path="/login" element={<Login/>}/><Route path="/register" element={<Register/>}/>
      <Route path="*" element={<main><h1>Page not found</h1><Link to="/">Browse dealerships</Link></main>}/>
    </Routes> : <main><p role="status">Loading your session…</p></main>}
    <footer><Link className="footer-brand" to="/">DriveLedger <span>↗</span></Link><span>Find the right place for your next drive.</span><span>Car dealership capstone · 2026</span></footer>
  </SessionContext.Provider>;
}
