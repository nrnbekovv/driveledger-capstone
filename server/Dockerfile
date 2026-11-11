FROM node:24-bookworm-slim AS frontend
WORKDIR /web
COPY server/frontend/package*.json ./
RUN npm ci
COPY server/frontend/ ./
RUN npm run build

FROM python:3.12-slim-bookworm
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 DJANGO_DB_PATH=/data/db.sqlite3
WORKDIR /app
COPY server/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt
COPY server/ ./
COPY --from=frontend /web/dist ./frontend/dist
RUN python manage.py collectstatic --noinput && mkdir -p /data && chgrp -R 0 /app /data && chmod -R g=u /app /data
USER 1001
EXPOSE 8000
CMD ["sh", "entrypoint.sh"]
