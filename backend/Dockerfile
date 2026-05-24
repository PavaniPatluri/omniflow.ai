FROM node:18-alpine

WORKDIR /usr/src/app

COPY package*.json ./

RUN npm install

COPY . .

RUN npx prisma generate || echo "Prisma client generate fallback"

EXPOSE 5000

CMD [ "npm", "start" ]
