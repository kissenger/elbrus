import { expose } from 'threads/worker';
import { gpxRead } from './gpx-read-write';

function gpxReadWorker(buffer) {
  return gpxRead.decode(buffer);
}

expose(gpxReadWorker);