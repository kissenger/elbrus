FROM node:14.2.0-alpine

WORKDIR /app
COPY package.json .
RUN npm install

EXPOSE 8080
CMD [ "node", "server.js" ]

COPY . .
