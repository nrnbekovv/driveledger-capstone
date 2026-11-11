import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../../api';
import { useSession } from '../../App';
export default function PostReview() {
  const { id } = useParams(); const navigate = useNavigate(); const { user, setNotice } = useSession();
  const [dealer, setDealer] = useState(null); const [cars, setCars] = useState([]);
  const [selected, setSelected] = useState(''); const [purchase, setPurchase] = useState(true);
  const [error, setError] = useState(''); const [busy, setBusy] = useState(false);
  useEffect(() => {
    Promise.all([api('/djangoapp/dealer/'+id),api('/djangoapp/get_cars')])
      .then(([d,c]) => { setDealer(d.dealer[0]); setCars(c.CarModels); }).catch(e => setError(e.message));
  }, [id]);
  async function submit(e) {
    e.preventDefault(); setBusy(true); setError('');
    const form = Object.fromEntries(new FormData(e.currentTarget));
    const car = cars.find(c => String(c.id) === selected);
    try {
      await api('/djangoapp/add_review', { dealership: Number(id), review: form.review, purchase,
        purchase_date: form.purchase_date || '', car_make: car?.CarMake || '',
        car_model: car?.CarModel || '', car_year: car?.CarYear || null });
      setNotice('Your review has been published. Thank you for sharing your experience.');
      navigate('/dealer/'+id);
    } catch(e) { setError(e.message); } finally { setBusy(false); }
  }
  if (!user) return <main><h1>Share your experience.</h1><p>Please <Link to="/login">log in</Link> to post a review.</p></main>;
  return <main className="review-form-page"><Link className="back-link" to={'/dealer/'+id}>← Back to dealership</Link><p className="eyebrow">YOUR EXPERIENCE MATTERS</p><h1>Post Review</h1><p className="lead">{dealer?.full_name || 'Loading dealership…'}</p>
    <div className="review-form-layout"><form className="panel" onSubmit={submit}>
      <label>Your review<textarea name="review" placeholder="What went well? What could have been better?" rows="4" required maxLength="4000"/></label>
      <label className="check-label"><input type="checkbox" checked={purchase} onChange={e => setPurchase(e.target.checked)}/> I purchased a vehicle from this dealership</label>
      {purchase && <><div className="form-row"><label>Car make and model<select value={selected} onChange={e => setSelected(e.target.value)} required><option value="">Choose a vehicle</option>{cars.map(c => <option key={c.id} value={c.id}>{c.CarMake} {c.CarModel} · {c.CarYear}</option>)}</select></label>
      <label>Purchase date<input name="purchase_date" type="date" required max={new Date().toLocaleDateString('en-CA')}/></label></div><p className="subtext">The vehicle year is saved with your selected model.</p></>}
      {error && <p className="error" role="alert">{error}</p>}<button className="button" disabled={busy || !dealer}>{busy ? 'Publishing…' : 'Post Review →'}</button>
    </form><aside className="review-aside"><span className="quote-mark">“</span><h2>A little detail<br/>goes a long way.</h2><p>Tell other drivers about the service, the vehicle, and the people who helped you.</p><div className="reviewer"><span className="avatar">{user.userName[0].toUpperCase()}</span><span>Posting as<br/><strong>{user.firstName} {user.lastName}</strong><small>{user.userName}</small></span></div></aside></div>
  </main>;
}
