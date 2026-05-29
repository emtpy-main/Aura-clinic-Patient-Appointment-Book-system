# Use Node.js official LTS lightweight alpine image
FROM node:20-alpine

# Set working directory inside container
WORKDIR /app

# Copy package.json and package-lock.json first to leverage Docker caching
COPY package*.json ./

# Install clean, production-only dependencies
RUN npm ci --only=production

# Copy all backend source code to the container
COPY . .

# Expose the API port (default is 5000)
EXPOSE 5000

# Set Node environment to production
ENV NODE_ENV=production

# Command to run the Express API server
CMD ["node", "src/server.js"]
