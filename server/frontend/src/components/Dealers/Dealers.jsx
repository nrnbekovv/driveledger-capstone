import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../../api';
import { useSession } from '../../App';
export default function Dealers() {
  const { user } = useSession();
  const [params, setParams] = useSearchParams();
  const state = params.get('state') || 'All';
  const [dealers, setDealers] = useState([]);
  const [states, setStates] = useState([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  useEffect(() => {
    api('/djangoapp/get_dealers').then(r => { setStates([...new Set(r.dealers.map(d => d.state))].sort()); setTotal(r.dealers.length); }).catch(e => setError(e.message));
  }, []);
  useEffect(() => {
    let active = true; setLoading(true); setError(''); setPage(1);
    api('/djangoapp/get_dealers/' + encodeURIComponent(state)).then(r => { if (active) setDealers(r.dealers); })
      .catch(e => { if (active) setError(e.message); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [state]);
  const filtered = dealers.filter(d => (d.full_name + ' ' + d.city).toLowerCase().includes(search.toLowerCase()));
  const pageCount = Math.max(1, Math.ceil(filtered.length / 8));
  return <main className="catalogue">
    <section className="hero"><div className="hero-copy"><p className="eyebrow"><span/> YOUR NEXT CHAPTER STARTS HERE</p>
      <h1>Great drives begin<br/>with the <em>right dealer.</em></h1>
      <p>Explore dealerships across the US. Read customer experiences<br className="desktop"/> and share the story of your own journey.</p>
      <div className="hero-stats"><div><strong>{total || '—'}</strong><span>Dealerships</span></div><div><strong>{states.length || '—'}</strong><span>States to explore</span></div><div className="stat-note">Real places.<br/>Your perspective.</div></div>
    </div><div className="hero-photo"><img src="/static/car_dealership.jpg" alt="Cars displayed at a dealership"/><div className="photo-tag">A better way to find your next stop <span>↗</span></div></div></section>
    <section className="directory" aria-labelledby="directory-title"><div className="section-top"><div><p className="eyebrow">THE DEALERSHIP DIRECTORY</p><h2 id="directory-title">Find your place to drive.</h2></div>
      <span className="count-pill">{loading ? 'Loading…' : filtered.length + ' dealerships'}</span></div>
      <div className="filters"><label className="search-label"><span>Search dealerships</span><input type="search" value={search} placeholder="Search by dealership or city" onChange={e => { setSearch(e.target.value); setPage(1); }}/></label>
        <label><span>Filter by state</span><select value={state} onChange={e => setParams(e.target.value === 'All' ? {} : { state: e.target.value })}><option value="All">All states</option>{states.map(s => <option key={s}>{s}</option>)}</select></label>
        <p>{user ? 'Your next review could help someone choose.' : <><Link to="/login">Log in</Link> to share a review.</>}</p>
      </div>
      {error ? <p className="error" role="alert">{error}</p> : loading ? <p className="empty" role="status">Loading dealerships…</p> :
        <div className="table-wrap"><table><thead><tr><th>DEALERSHIP</th><th>CITY / STATE</th><th>ADDRESS</th><th>{user ? 'REVIEW DEALER' : 'EXPLORE'}</th></tr></thead>
          <tbody>{filtered.slice((page-1)*8, page*8).map(d => <tr key={d.id}><td><Link className="dealer-name" to={'/dealer/'+d.id}>{d.full_name}</Link><span className="dealer-number">DEALER #{String(d.id).padStart(3,'0')}</span></td>
            <td><strong>{d.city}</strong><span className="subtext">{d.state}</span></td><td>{d.address}<span className="subtext">ZIP {d.zip}</span></td>
            <td>{user ? <Link className="review-link" to={'/postreview/'+d.id}>Post Review ↗</Link> : <Link className="details-link" to={'/dealer/'+d.id}>View details ↗</Link>}</td></tr>)}</tbody></table>
          {!filtered.length && <p className="empty">No dealerships match your search. Try another city or state.</p>}</div>}
      <div className="pagination"><span>Page {Math.min(page,pageCount)} of {pageCount}</span><div><button className="button ghost small" disabled={page === 1} onClick={() => setPage(page-1)}>← Previous</button><button className="button ghost small" disabled={page >= pageCount} onClick={() => setPage(page+1)}>Next →</button></div></div>
    </section></main>;
}
