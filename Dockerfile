# Use official Python runtime as base image
FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Copy requirements file
COPY requirements.txt .

# Install dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Expose port (not strictly needed with Docker Compose, but good practice)
EXPOSE 8899

# Command to run Gunicorn
CMD ["gunicorn", "--workers", "3", "--bind", "0.0.0.0:8899", "app:app"]