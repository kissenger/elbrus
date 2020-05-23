import mongoose from 'mongoose';

const pathSchema = mongoose.Schema({

  userId: {type: String, required: true},
  creationDate: {type: Date, default: Date.now},
  lastEditDate: {type: Date, default: Date.now},
  isSaved: {type: Boolean, default: false},

  // geometric information defining the path, in geoJSON format to aid searching
  geometry: {
    type: {type: String, required: true},
    coordinates: {type: [[Number]], required: true}
  },

  // params are the additional parameters from the recording devi
  params: {
    elev: {type: [Number], default: null},
    time: {type: [Number], default: null},
    cumDistance: {type: [Number]},
    smoothedElev: {type: [Number], default: null},
    matchedPoints: {type: [[Number]]}
  },

  // user entered information to describe/tag route
  info: {
    direction: {type: String},
    category: {type: String},
    name: {type: String},
    description: {type: String},
    pathType: {type: String},           // 'route' or 'track'
    isLong: {type: Boolean},
    isElevations: {type: Boolean}
  },

  // statistics calculated from the device data
  stats: {
    bbox: {
      minLng: Number,
      minLat: Number,
      maxLng: Number,
      maxLat: Number
    },
    nPoints: {type: Number},
    simplificationRatio: {type: Number},
    duration: {type: Number},
    distance: {type: Number},
    pace: {type: Number},
    elevations: {
      ascent: {type: Number},
      descent: {type: Number},
      maxElev: {type: Number},
      minElev: {type: Number},
      lumpiness: {type: Number}
    },
    p2p: {
      max: {type: Number},
      ave: {type: Number}
    },
    movingStats: {
      movingTime: {type: Number},
      movingDist: {type: Number},
      movingPace: {type: Number},
    },
    hills: {type: [
      { dHeight: {type: Number},
        dDist: {type: Number},
        startPoint: {type: Number},
        endPoint: {type: Number},
        maxGrad: {type: Number},
        aveGrad: {type: Number}
      }
    ]},
    splits: {
      kmSplits: {type: [[Number]]},
      mileSplits: {type: [[Number]]}
    }

  }

})

pathSchema.index({ userId: 1, creationDate: 1});
pathSchema.index({ userId: 1, startTime: 1});

//const Challenges = mongoose.model('challenges', pathSchema);
export const Tracks = mongoose.model('tracks', pathSchema);
export const Routes = mongoose.model('routes', pathSchema);


// export const Tracks = Tracks;
// export const Routes = Routes;
