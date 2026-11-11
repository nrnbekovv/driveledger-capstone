FROM node:24-bookworm-slim
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY app.js dealership.js review.js ./
COPY data ./data
ENV HOST=0.0.0.0 PORT=3030
USER node
EXPOSE 3030
CMD ["node", "app.js"]
