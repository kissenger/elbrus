import mongoose from "mongoose"
// import { Schema, model } from 'mongoose';

const userSchema = mongoose.Schema({
  email: {type: String, required: true},
  userName: {type: String, required: true},
  hash: {type: String, required: true},
  firstName: {type: String},
  lastName: {type: String},
  homeLngLat: {
    lat: {
      type: Number,
      default: 51.47685
    },
    lng: {
      type: Number,
      default: -0.00005
    }
  },
  isHomeLocSet: {type: Boolean},
  units: {
    distance: {type: String},
    elevation: {type: String}
  }
})

export const Users = mongoose.model('user', userSchema);

// export const Users = Users;
