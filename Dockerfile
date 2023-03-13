# syntax=docker/dockerfile:1
   
FROM node:18-bullseye
WORKDIR /polygon-metrics-node
COPY package*.json ./
COPY build/* ./
RUN npm ci
CMD ["node", "index.js"]
