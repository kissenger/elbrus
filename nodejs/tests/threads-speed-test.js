"use strict"

require('dotenv').config();

const readFile = require('fs').readFile;
const getRouteInstance = require('../src/path-helpers').getRouteInstance;
const gpxRead = require('../src/gpx').gpxRead;
const threadPool = require('../src/worker-pool').threadPool;
threadPool.create();

const OUT_AND_BACK =    require('../src/globals').OUT_AND_BACK;
const CIRCULAR =        require('../src/globals').CIRCULAR;
const ONE_WAY =         require('../src/globals').ONE_WAY;
const NO_DIRECTION =    require('../src/globals').NO_DIRECTION;
const ANTI_CLOCKWISE =  require('../src/globals').ANTI_CLOCKWISE;
const CLOCKWISE =       require('../src/globals').CLOCKWISE;
const NO_CATEGORY =     require('../src/globals').NO_CATEGORY;
const FIGURE_OF_EIGHT = require('../src/globals').FIGURE_OF_EIGHT;

let startTime;
const dir = './tests/data/';
let paramCheck = [];
let USE_THREADS;
const testList = [
  {
    "fileName": "mendip_way.gpx",
    "direction": "West to East",
    "category": ONE_WAY,
    "stravaDistanceMiles": 0,
    "stravaAscentFt": 0
  },
  {
    "fileName": "double-loop.gpx",
    "direction": ANTI_CLOCKWISE,
    "category": CIRCULAR,
    "stravaDistanceMiles": 4.26,
    "stravaAscentFt": 82
  },
  {
    "fileName": "short-near-loop.gpx",
    "direction": CLOCKWISE,
    "category": CIRCULAR,
    "stravaDistanceMiles": 14.53,
    "stravaAscentFt": 1053
  },
  {
    "fileName": "short-out-and-back-complex.gpx",
    "direction": NO_DIRECTION,
    "category": OUT_AND_BACK,
    "stravaDistanceMiles": 5.08,
    "stravaAscentFt": 187
  },
  {
    "fileName": "very-out-and-back.gpx",
    "direction": NO_DIRECTION,
    "category": OUT_AND_BACK,
    "stravaDistanceMiles": 14.02,
    "stravaAscentFt": 4595
  },
  {
    "fileName": "long-circular-with-out-and-back-section.gpx",
    "direction": NO_DIRECTION,
    "category": FIGURE_OF_EIGHT,
    "stravaDistanceMiles": 14.33,
    "stravaAscentFt": 427
  },
  {
    "fileName": "mostly-out-and-back.gpx",
    "direction": NO_DIRECTION,
    "category": OUT_AND_BACK,
    "stravaDistanceMiles": 6.00,
    "stravaAscentFt": 568
  },
  {
    "fileName": "stretched-out-loop.gpx",
    "direction": ANTI_CLOCKWISE,
    "category": CIRCULAR,
    "stravaDistanceMiles": 11.46,
    "stravaAscentFt": 951
  },
  {
    "fileName": "complex-hybrid.gpx",
    "direction": CLOCKWISE,
    "category": CIRCULAR,
    "stravaDistanceMiles": 6.91,
    "stravaAscentFt": 1214
  },
  {
    "fileName": "loop-with-inner-loop.gpx",
    "direction": ANTI_CLOCKWISE,
    "category": CIRCULAR,
    "stravaDistanceMiles": 4.65,
    "stravaAscentFt": 259
  },  
  {
    "fileName": "two-loops.gpx",
    "direction": CLOCKWISE,
    "category": CIRCULAR,
    "stravaDistanceMiles": 5.80,
    "stravaAscentFt": 256
  },
  {
    "fileName": "Beyond_stunning.gpx",
    "direction": "West to East",
    "category": ONE_WAY,
    "stravaDistanceMiles": 9.40,
    "stravaAscentFt": 1416
  },
  {
    "fileName": "figure-of-eightish.gpx",
    "direction": ANTI_CLOCKWISE,
    "category": CIRCULAR,
    "stravaDistanceMiles": 7.03,
    "stravaAscentFt": 187
  },
  {
    "fileName": "figure-of-eight-bike.gpx",
    "direction": NO_DIRECTION,
    "category": FIGURE_OF_EIGHT,
    "stravaDistanceMiles": 7.68,
    "stravaAscentFt": 174
  },  
];


(async () => {

  USE_THREADS = false;
  startTime = new Date();
  const noThreadsPromises = [];
  testList.forEach( async (testItem) => {
    noThreadsPromises.push( new Promise( async (res, rej) => { 
      console.log("Testing file: " + testItem.fileName);
      const result = await gpxToRoute(dir+testItem.fileName);
      const pcShared = Math.round(result.properties.params.matchedPoints.length / result.properties.stats.nPoints * 100);
      paramCheck.push({fn: testItem.fileName, category: testItem.category, direction: testItem.direction, pcShared, cw: result.properties.info.cw});
      res();
    }))
  });
  
  await Promise.all(noThreadsPromises);
  let noThreadsTimeDiff = timeDiff(new Date() - startTime);
  paramCheck.push({fn: '---------------', category: '---------------', direction: '---------------', pcShared: 0, cw: 0});
  
  USE_THREADS = true;
  const threadsPromises = [];
  startTime = new Date();
  testList.forEach( async (testItem) => {
    threadsPromises.push( new Promise( async (res, rej) => { 
      console.log("Testing file: " + testItem.fileName);
      const result = await gpxToRoute(dir+testItem.fileName);
      const pcShared = Math.round(result.properties.params.matchedPoints.length / result.properties.stats.nPoints * 100);
      paramCheck.push({fn: testItem.fileName, category: testItem.category, direction: testItem.direction, pcShared, cw: result.properties.info.cw});
      res();
    }))
  });
  
  await Promise.all(threadsPromises);
  console.table(paramCheck);
  console.log(`
  ****************************************************************************
  * Completed test:
  * > without threads in ${noThreadsTimeDiff}
  * > with threads in ${timeDiff(new Date() - startTime)}
  ****************************************************************************
  `);

})().catch(err => {
  console.error(err);
});





function gpxToRoute(fn) {

  return new Promise( async (res, rej) => { 

    try {
    
      const buffer = await loadFile(fn);
      const bufferString = buffer.toString();
      let gpxData;
      let routeInstance;
  
      if (USE_THREADS) {
        gpxData = await threadPool.addTaskToQueue('gpxRead', bufferString);  // use threads
        routeInstance = await threadPool.addTaskToQueue('getRouteInstance', gpxData.name, null, gpxData.lngLat, gpxData.elev);  // use threads
      } else {
        gpxData = gpxRead(bufferString);
        routeInstance = await getRouteInstance(gpxData.name, null, gpxData.lngLat, gpxData.elev);
      }

      res(routeInstance);

    } catch (error) {
      console.log(error);
    }
  
  })
}


/**
 * Load the data from the requested file into a buffer and give back a promise
 */
function loadFile(fn) {
  return new Promise ( (res, rej) => {
    readFile(fn, (err, data) => {
      if (err) {
        rej(err);
      };
      res(data);
    })

  })
}

function timeDiff(ms) {

  // var msec = diff;
  const hh = Math.floor(ms / 1000 / 60 / 60);
  ms -= hh * 1000 * 60 * 60;
  const mm = Math.floor(ms / 1000 / 60);
  ms -= mm * 1000 * 60;
  const ss = Math.floor(ms / 1000);
  ms -= ss * 1000;

  return String(hh).padStart(2,'0')+':'+
         String(mm).padStart(2,'0')+':'+
         String(ss).padStart(2,'0')+':'+
         String(ms).padStart(3,'0');
}

// module.exports = { pool, addTaskToQueue }
