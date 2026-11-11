const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { start, seed } = require('../app');
let mongo, server, base;
before(async () => {
  process.env.BACKEND_API_KEY = 'integration-test-internal-key';
  let uri = process.env.TEST_MONGO_URL;
  if (!uri) { mongo = await MongoMemoryServer.create({ binary: { version: '8.0.16' } }); uri = mongo.getUri(); }
  const db = 'driveledger_test_' + Date.now();
  uri = uri.replace(/\/?$/, '/') + db;
  server = await start({ mongoUrl: uri, port: 0 });
  base = 'http://127.0.0.1:' + server.address().port;
});
after(async () => {
  if (mongoose.connection.readyState) await mongoose.connection.dropDatabase();
  if (server) await new Promise(resolve => server.close(resolve));
  await mongoose.disconnect();
  if (mongo) await mongo.stop();
});
test('dealer list, Kansas filter, details and reviews use MongoDB records', async () => {
  const all = await (await fetch(base+'/fetchDealers')).json();
  assert.ok(all.length > 10);
  const kansas = await (await fetch(base+'/fetchDealers/Kansas')).json();
  assert.ok(kansas.length > 0); assert.ok(kansas.every(d => d.state === 'Kansas'));
  const detail = await (await fetch(base+'/fetchDealer/'+all[0].id)).json();
  assert.equal(detail[0].id, all[0].id);
  const reviews = await (await fetch(base+'/fetchReviews/dealer/15')).json();
  assert.ok(reviews.length > 0); assert.ok(reviews.every(r => r.dealership === 15));
  assert.equal((await fetch(base+'/fetchDealer/not-an-id')).status, 400);
});
test('writes require proxy authentication and survive idempotent seeding', async () => {
  const data = {name:'Integration Tester',dealership:15,review:'Excellent helpful service.',purchase:false,sentiment:'positive'};
  const options = {method:'POST', headers:{'Content-Type':'application/json'},body:JSON.stringify(data)};
  assert.equal((await fetch(base+'/insert_review',options)).status,403);
  options.headers['X-API-Key'] = process.env.BACKEND_API_KEY;
  const response = await fetch(base+'/insert_review',options);
  assert.equal(response.status,201);
  const created = await response.json();
  await seed();
  const saved = await (await fetch(base+'/fetchReviews/dealer/15')).json();
  assert.ok(saved.some(r => r.id === created.id && r.review === data.review));
  const results = await Promise.all(Array.from({length:4}, async () => (await fetch(base+'/insert_review',options)).json()));
  assert.equal(new Set(results.map(r=>r.id)).size,4);
});
