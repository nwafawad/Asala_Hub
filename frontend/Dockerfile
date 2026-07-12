FROM node:20-alpine

WORKDIR /app

COPY package*.json ./

# Install dependencies
RUN npm install

COPY . .

EXPOSE 3000

# Start development server
CMD ["npm", "run", "dev"]
