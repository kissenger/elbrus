#############
### build ###
#############

# base image
FROM node:14.2.0-alpine AS build 

# set working directory
WORKDIR /app

# add `/app/node_modules/.bin` to $PATH
ENV PATH /app/node_modules/.bin:$PATH

# install and cache app dependencies
COPY package.json /app/
RUN apk update && apk add --no-cache bash git openssh
RUN npm install

# add app
COPY . /app

# generate build
RUN ng build --outputPath=./dist --configuration=production

############
### prod ###
############

# base image
FROM nginx:1.17.10-alpine

# copy artifact build from the 'build environment'
COPY --from=build /app/dist /usr/share/nginx/html
COPY /nginx-custom.conf /etc/nginx/conf.d/default.conf

# expose port 80
EXPOSE 80

# run nginx
CMD ["nginx", "-g", "daemon off;"]
