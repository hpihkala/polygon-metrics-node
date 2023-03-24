# syntax=docker/dockerfile:1
   
FROM node:18-bullseye
WORKDIR /polygon-metrics-node
COPY ./validator-node.sh ./
RUN chmod 755 ./validator-node.sh
COPY package*.json ./
COPY build/* ./
RUN npm ci
ENTRYPOINT ["./validator-node.sh"]
