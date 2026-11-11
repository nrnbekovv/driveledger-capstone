const mongoose = require('mongoose');
const schema = new mongoose.Schema({
  id: { type: Number, required: true, unique: true },
  city: String, state: String, st: String, address: String, zip: String,
  lat: Number, long: Number, short_name: String, full_name: { type: String, required: true }
}, { versionKey: false });
module.exports = mongoose.model('Dealership', schema);
