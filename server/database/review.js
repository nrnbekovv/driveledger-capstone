const mongoose = require('mongoose');
const schema = new mongoose.Schema({
  id: { type: Number, required: true, unique: true },
  name: { type: String, required: true, maxlength: 301 },
  dealership: { type: Number, required: true, index: true },
  review: { type: String, required: true, maxlength: 4000 },
  purchase: { type: Boolean, required: true },
  purchase_date: { type: String, default: '' },
  car_make: { type: String, default: '' },
  car_model: { type: String, default: '' },
  car_year: { type: Number, default: null },
  sentiment: { type: String, enum: ['positive', 'neutral', 'negative'] }
}, { versionKey: false });
module.exports = mongoose.model('Review', schema);
