### build ###

# base image
FROM node:14.2.0-alpine AS build
WORKDIR /app
ENV PATH /app/node_modules/.bin:$PATH

# install and cache app dependencies
COPY package.json /app/
RUN apk update && apk add --no-cache bash git 
#openssh
RUN npm install
COPY . /app
RUN ng build --outputPath=./dist --configuration=production

### prod ###

# base image
FROM nginx:1.17.10-alpine

# copy artifact build from the 'build environment'
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80 443
CMD ["nginx", "-g", "daemon off;"]
