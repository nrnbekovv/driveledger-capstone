const express = require('express');
const mongoose = require('mongoose');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
require('dotenv').config({ path: path.join(__dirname, '../../.env'), quiet: true });
const Dealers = require('./dealership');
const Reviews = require('./review');
const Counter = mongoose.model('Counter', new mongoose.Schema({ _id: String, value: Number }));
const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '32kb' }));
const projection = { _id: 0, __v: 0 };
function dealerId(value) {
  const id = Number(value);
  if (!Number.isSafeInteger(id) || id < 1) {
    const error = new Error('Dealer id must be a positive integer.');
    error.status = 400;
    throw error;
  }
  return id;
}
app.get('/', (req, res) => res.json({ service: 'DriveLedger Express-Mongo API' }));
app.get('/health', (req, res) => res.status(mongoose.connection.readyState === 1 ? 200 : 503)
  .json({ status: mongoose.connection.readyState === 1 ? 'ok' : 'unavailable', database: 'MongoDB' }));
app.get('/fetchDealers', async (req, res) => res.json(await Dealers.find({}, projection).sort({ id: 1 }).lean()));
app.get('/fetchDealers/:state', async (req, res) => {
  const filter = req.params.state === 'All' ? {} : { state: req.params.state };
  res.json(await Dealers.find(filter, projection).sort({ id: 1 }).lean());
});
app.get('/fetchDealer/:id', async (req, res) =>
  res.json(await Dealers.find({ id: dealerId(req.params.id) }, projection).lean()));
app.get('/fetchReviews', async (req, res) => res.json(await Reviews.find({}, projection).sort({ id: -1 }).lean()));
app.get('/fetchReviews/dealer/:id', async (req, res) =>
  res.json(await Reviews.find({ dealership: dealerId(req.params.id) }, projection).sort({ id: -1 }).lean()));

app.post('/insert_review', async (req, res) => {
  const expected = process.env.BACKEND_API_KEY || '';
  const supplied = req.get('X-API-Key') || '';
  if (!expected || Buffer.byteLength(supplied) !== Buffer.byteLength(expected) ||
      !crypto.timingSafeEqual(Buffer.from(supplied), Buffer.from(expected))) {
    return res.status(403).json({ error: 'Only the authenticated Django proxy may write reviews.' });
  }
  const data = req.body || {};
  const id = dealerId(data.dealership);
  if (!await Dealers.exists({ id })) return res.status(404).json({ error: 'Dealer not found.' });
  if (typeof data.purchase !== 'boolean' || typeof data.review !== 'string' ||
      !data.review.trim() || typeof data.name !== 'string' || !data.name.trim()) {
    return res.status(400).json({ error: 'Name, review, and a boolean purchase value are required.' });
  }
  if (data.purchase && (!/^\d{4}-\d{2}-\d{2}$/.test(data.purchase_date || '') ||
      !data.car_make || !data.car_model || !Number.isInteger(data.car_year))) {
    return res.status(400).json({ error: 'Purchase details are incomplete.' });
  }
  const counter = await Counter.findOneAndUpdate({ _id: 'reviews' }, { $inc: { value: 1 } }, { new: true });
  const review = await Reviews.create({
    id: counter.value, name: data.name, dealership: id, review: data.review.trim(),
    purchase: data.purchase, purchase_date: data.purchase ? data.purchase_date : '',
    car_make: data.purchase ? data.car_make : '', car_model: data.purchase ? data.car_model : '',
    car_year: data.purchase ? data.car_year : null, sentiment: data.sentiment
  });
  const result = review.toObject(); delete result._id;
  res.status(201).json(result);
});
app.use((error, req, res, next) => {
  const status = error.status || (error.name === 'ValidationError' || error.name === 'CastError' ? 400 : 500);
  if (status === 500) console.error(error.message);
  res.status(status).json({ error: status === 500 ? 'Database operation failed.' : error.message });
});
async function seed() {
  const dealers = JSON.parse(fs.readFileSync(path.join(__dirname, 'data/dealerships.json'), 'utf8')).dealerships;
  const reviews = JSON.parse(fs.readFileSync(path.join(__dirname, 'data/reviews.json'), 'utf8')).reviews;
  await Dealers.init(); await Reviews.init();
  // setOnInsert preserves posted reviews and edits across restarts.
  await Dealers.bulkWrite(dealers.map(d => ({ updateOne: { filter: { id: d.id }, update: { $setOnInsert: d }, upsert: true } })));
  await Reviews.bulkWrite(reviews.map(r => ({ updateOne: { filter: { id: r.id }, update: { $setOnInsert: r }, upsert: true } })));
  const latest = await Reviews.findOne().sort({ id: -1 });
  await Counter.updateOne({ _id: 'reviews' }, { $max: { value: latest?.id || 0 } }, { upsert: true });
  console.log('MongoDB ready: ' + await Dealers.countDocuments() + ' dealers; ' + await Reviews.countDocuments() + ' reviews.');
}
async function start(options = {}) {
  await mongoose.connect(options.mongoUrl || process.env.MONGO_URL || 'mongodb://127.0.0.1:27017/driveledger');
  await seed();
  const server = app.listen(options.port ?? Number(process.env.PORT || 3030), options.host || process.env.HOST || '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  console.log('Express-Mongo listening on port ' + server.address().port);
  return server;
}
if (require.main === module) start().catch(error => { console.error(error); process.exit(1); });
module.exports = { app, start, seed };
