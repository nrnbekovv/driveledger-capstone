import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../../api';
import { useSession } from '../../App';
export default function Dealer() {
  const { id } = useParams(); const { user } = useSession();
  const [dealer, setDealer] = useState(null); const [reviews, setReviews] = useState([]);
  const [error, setError] = useState(''); const [loading, setLoading] = useState(true);
  useEffect(() => {
    let active = true; setLoading(true); setError('');
    Promise.all([api('/djangoapp/dealer/'+id), api('/djangoapp/reviews/dealer/'+id)])
      .then(([d,r]) => { if(active) { setDealer(d.dealer[0]); setReviews(r.reviews); } })
      .catch(e => { if(active) setError(e.message); }).finally(() => { if(active) setLoading(false); });
    return () => { active = false; };
  }, [id]);
  if(error) return <main><p className="error" role="alert">{error}</p><Link to="/">Back to dealerships</Link></main>;
  if(loading) return <main><p role="status">Loading dealership and reviews…</p></main>;
  return <main className="detail-page"><Link className="back-link" to="/">← All dealerships</Link>
    <section className="dealer-hero"><div><p className="eyebrow">DEALER #{String(dealer.id).padStart(3,'0')} · {dealer.state.toUpperCase()}</p><h1>{dealer.full_name}</h1><p>{dealer.address}, {dealer.city}, {dealer.state} {dealer.zip}</p><span className="count-pill">{reviews.length} customer reviews</span></div>
      <Link className="button" to={user ? '/postreview/'+id : '/login'}>{user ? 'Post Review ↗' : 'Log in to review ↗'}</Link></section>
    <div className="section-top"><div><p className="eyebrow">FROM THE DRIVER'S SEAT</p><h2>Customer experiences</h2></div><span className="subtext">Newest reviews first</span></div>
    {!reviews.length ? <div className="panel empty">Be the first to share your experience with this dealership.</div> :
      <div className="review-grid">{reviews.map(r => <article className="review-card" key={r.id} id={'review-'+r.id}><div className="review-top"><span className="avatar">{r.name.slice(0,1)}</span><div><h3>{r.name}</h3><span className="subtext">{r.purchase ? 'Vehicle purchase' : 'Dealership visit'}</span></div><span className={'sentiment '+r.sentiment}>{r.sentiment}</span></div>
        <p className="review-text">{r.review}</p>{r.purchase && <div className="purchase-details"><span>{r.car_year} {r.car_make} {r.car_model}</span><span>Purchased {r.purchase_date}</span></div>}</article>)}</div>}
  </main>;
}
