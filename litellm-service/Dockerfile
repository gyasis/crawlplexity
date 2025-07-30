FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY app.py .
COPY .env* ./

# Create non-root user for security
RUN useradd -m -u 1000 litellm && chown -R litellm:litellm /app
USER litellm

# Expose port
EXPOSE 14782

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:14782/health || exit 1

# Run the application
CMD ["python", "app.py"]