FROM node:20-alpine

WORKDIR /app

# Copy dependency specifications
COPY package.json package-lock.json* ./

# Install packages
RUN npm install

# Copy application files
COPY . .

EXPOSE 3000

# Start Next.js in development mode
CMD ["npm", "run", "dev"]
