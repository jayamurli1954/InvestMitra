FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    && rm -rf /var/lib/apt-lists/*

# Copy requirements and install
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Broker SDKs for live holdings import (Angel One + Fyers).
# fyers-apiv3's aws-lambda-powertools chain downgrades boto3 (1.40 -> 1.34) and
# jmespath (1.0 -> 0.10); this is safe here because the app does not import boto3
# (email uses SMTP). Installed in its own layer so pip resolves it against the base.
RUN pip install --no-cache-dir smartapi-python==1.5.5 pyotp==2.9.0 logzero==1.7.0 \
    && pip install --no-cache-dir fyers-apiv3==3.2.1

# Copy backend code
COPY . /app/backend

WORKDIR /app/backend

EXPOSE 8000

ENV PYTHONPATH="/app:/app/backend"

CMD ["uvicorn", "server:app", "--host", "0.0.0.0", "--port", "8000"]
