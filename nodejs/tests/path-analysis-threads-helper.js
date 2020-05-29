
const readFile = require('fs').readFile;
const gpxRead = require('../src/gpx').gpxRead;
const getRouteInstance = require('../src/path-helpers').getRouteInstance;
// const pool = require('../src/thread-tasks').pool;
const myPool = require('../src/worker-pool').myPool; 
const addTaskToQueue = require('../src/worker-pool').addTaskToQueue;

console.log('elbows')

function gpxToRoute(fn) {

  return new Promise( async (res, rej) => { 

    try {
      
      const buffer = await loadFile(fn);
      const bufferString = buffer.toString();
      
      // const gpxData = gpxRead(bufferString);
      const gpxData = await addTaskToQueue('gpxRead', bufferString);

      // const routeInstance = await getRouteInstance(gpxData.name, null, gpxData.lngLat, gpxData.elev);
      const routeInstance = await addTaskToQueue('getRouteInstance', gpxData);

      res(routeInstance);
    } catch (error) {
      rej(error);
      console.log(error);
    }
  
  })
}

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

module.exports = {
  gpxToRoute
}