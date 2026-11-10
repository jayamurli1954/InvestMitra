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

# Broker SDK for live holdings import. Angel One (smartapi-python) has clean deps.
# Fyers (fyers-apiv3) is intentionally NOT installed here: its aws-lambda-powertools
# chain forces a boto3 downgrade. The Fyers provider disables itself gracefully when
# the SDK is absent; add fyers-apiv3==3.2.1 here once that downgrade is acceptable.
RUN pip install --no-cache-dir smartapi-python==1.5.5 pyotp==2.9.0 logzero==1.7.0

# Copy backend code
COPY . /app/backend

WORKDIR /app/backend

EXPOSE 8000

ENV PYTHONPATH="/app:/app/backend"

CMD ["uvicorn", "server:app", "--host", "0.0.0.0", "--port", "8000"]
