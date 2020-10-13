const mongoose = require('mongoose');
const userSchema = mongoose.Schema({
  email: {type: String, required: true},
  userName: {type: String, required: true},
  hash: {type: String, required: true},
  validationString: {type: String},
  firstName: {type: String},
  lastName: {type: String},
  homeLngLat: {
    lat: {
      type: Number
    },
    lng: {
      type: Number
    }
  },
  isHomeLocSet: {type: Boolean},
  units: {
    distance: {type: String},
    elevation: {type: String}
  }
})

const Users = mongoose.model('user', userSchema);
module.exports = {
  Users
}
