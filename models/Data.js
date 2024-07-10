const mongoose = require('mongoose');

const DataSchema = new mongoose.Schema({
    name: String,
    channel: String,
    signature: String
});

module.exports = mongoose.model('Data', DataSchema);
