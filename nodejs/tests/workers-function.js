


import { getRouteInstance } from '../src/app-functions.js';
import { gpxRead } from '../src/gpx-read-write.js';
import workerpool from 'workerpool';

function bufferToRouteInstance(buffer) {
  console.log('start')
  // return gpxRead(buffer.toString());

  // return new Promise( async (res, rej) => { 

    const pathFromGPX = gpxRead(buffer.toString());
    console.lpg('end');
    return pathFromGPX;
  //   const routeInstance = await getRouteInstance(pathFromGPX.name, null, pathFromGPX.lngLat, pathFromGPX.elev);

  //   res(routeInstance);

  // })

}

workerpool.worker({
  gpxRead: gpxRead
});

// export function fibonacci(n) {
//   if (n < 2) return n;
//   return fibonacci(n - 2) + fibonacci(n - 1);
// }


// workerpool.worker({
//   fibonacci: fibonacci
// });