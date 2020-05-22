import app from './src/app.js';
import { createServer } from 'http';

const normalizePort = val => {
  const port = parseInt(val, 10);
  if (isNaN(port)) { return val; }  // named pipe  
  if (port >= 0) { return port; }   // port number
  return false;
};

const onError = error => {
  if (error.syscall !== 'listen') {
    throw error;
  }
  const bind = typeof port === 'string' ? 'pipe ' + port : 'port ' + port;
  switch (error.code) {
    case 'EACCES':
      console.error(bind + ' requires elevated privileges');
      process.exit(1);
      break;
    case 'EADDRINUSE':
      console.error(bind + ' is already in use');
      process.exit(1);
      break;
    default:
      throw error;
  }
};

const onListening = () => {
  const bind = typeof port === 'string' ? 'pipe ' + port : 'port ' + port;
  console.log(`Listening on ${bind}`);
};

const port = normalizePort(process.env.PORT || '3000');
const server = createServer(app);
server
  .on('error', onError)
  .on('listening', onListening);

server.listen(port);