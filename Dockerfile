FROM node:20-alpine
WORKDIR /app
RUN apk add --no-cache curl
COPY package*.json tsconfig*.json ./
RUN npm install
COPY . .
EXPOSE 3000 9229
CMD ["npm", "run", "dev"]