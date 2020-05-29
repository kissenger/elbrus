"use strict"

/**
 * This test imports test route, creates a Path object and compares the calculated
 * path properties against our expectations
 */

// const chai = require('chai');
// var expect = chai.expect;
// var reject = chai.reject;;
require('dotenv').config();

// const createThreadPool = require
// const getRouteInstance = require('../src/path-helpers').getRouteInstance;
// const gpxRead = require('../src/gpx').gpxRead;
// const getRouteInstance = require('../src/path-helpers').getRouteInstance;
const gpxToRoute = require('./path-analysis-threads-helper').gpxToRoute;
console.log('legs')

// const createThreadPool = require('../src/thread-tasks').createThreadPool;
// const addTaskToQueue = require('../src/thread-tasks').addTaskToQueue;
// const pool = createThreadPool();
// const spawn = require('threads').spawn;
// const Thread = require('threads').Thread;
// const Worker = require('threads').Worker;
// const Pool = require('threads').Pool;
// const pool = Pool(() => spawn(new Worker('../src/thread-workers.js')), 8);

// async function addTaskToQueue(functionName, argument) {

//   return new Promise((resolve, reject) => {
//     pool.queue(async workerFunctions => {
//       try {

//         const result = await workerFunctions[functionName](argument);
//         resolve(result);

//       } catch (error) {

//         reject(error)

//       }
//     })
//   })
// }
// Object.freeze(pool);
// const initThreadPool = require('./thread-tasks').initThreadPool;
// const threadPool = initThreadPool();


const OUT_AND_BACK =    require('../src/globals').OUT_AND_BACK;
const CIRCULAR =        require('../src/globals').CIRCULAR;
const ONE_WAY =         require('../src/globals').ONE_WAY;
const NO_DIRECTION =    require('../src/globals').NO_DIRECTION;
const ANTI_CLOCKWISE =  require('../src/globals').ANTI_CLOCKWISE;
const CLOCKWISE =       require('../src/globals').CLOCKWISE;
const NO_CATEGORY =     require('../src/globals').NO_CATEGORY;
const FIGURE_OF_EIGHT = require('../src/globals').FIGURE_OF_EIGHT;

const startTime = new Date();
const dir = './tests/data/';
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
let printSummary = '';
let paramCheck = [];
let route;              // not declaring this has caused problems more than once, dont forget it
// const pool = Pool(() => spawn(new Worker('../src/workers.js')), 8 /* optional size */);



const promises = [];
testList.forEach( async (testItem) => {
  promises.push( new Promise( async (res, rej) => { 
    console.log("Testing file: " + testItem.fileName);
    const result = await gpxToRoute(dir+testItem.fileName);
    const pcShared = Math.round(result.properties.params.matchedPoints.length / result.properties.stats.nPoints * 100);
    paramCheck.push({fn: testItem.fileName, category: testItem.category, direction: testItem.direction, pcShared, cw: result.properties.info.cw});
    res();
  }))
});

Promise.all(promises).then( () => {
  console.table(paramCheck);
  console.log(`Completed in ${timeDiff(new Date() - startTime)}`) 
})


// function gpxToRoute(fn) {

//   return new Promise( async (res, rej) => { 


//     // loadFile(fn)
//     //   .then( function(buffer) { return gpxReadUseThreads(buffer.toString()) })
//     //   .then( function(pathFromGPX) { return getRouteInstance(pathFromGPX.name, null, pathFromGPX.lngLat, pathFromGPX.elev) })
//     //   .then( function(routeInstance) { res(routeInstance.asMongoObject('testId', 'testUserName', false)) })
//     //   .catch( function(error) {console.log(error)} )
    
//     // const buffer = await loadFile(fn);
//     // const buffString = buffer.toString();

//     // console.log(fn, 'start task 1');
//     // const gpxPath = await addTaskToQueue('gpxRead', buffString);
//     // console.log(fn, 'task 1 complete, start task 2');
//     // const routeInstance = await addTaskToQueue('getPath', gpxPath);
//     // console.log(fn, 'task 2 complete');


//     try {
      

      

//       const buffer = await loadFile(fn);
//       const bufferString = buffer.toString();
      
//       const gpxData = gpxRead(bufferString);
//       // const gpxData = await addTaskToQueue('gpxRead', bufferString);
// // console.log(gpxData)
//       // const gpxData = await gpxReadUseThreads(bufferString);
//       const routeInstance = await getRouteInstance(gpxData.name, null, gpxData.lngLat, gpxData.elev);
//       // const routeInstance = await pool.addTaskToQueue('getRouteInstance', gpxData);
//       res(routeInstance);
//     } catch (error) {
//       rej(error);
//       console.log(error);
//     }
  
//   })
// }

// function addTaskToQueue(functionName, argument) {

//   return new Promise((resolve, reject) => {

//   pool.queue(async workerFunctions => {

//     try {
//       const result = await workerFunctions[functionName](argument);
//       resolve(result);

//     } catch (error) {
//       reject(error)

//     }

//   })

// })}


/**
 * Load the data from the requested file into a buffer and give back a promise
 */
// function loadFile(fn) {
//   return new Promise ( (res, rej) => {
//     readFile(fn, (err, data) => {
//       if (err) {
//         rej(err);
//       };
//       res(data);
//     })

//   })
// }

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
