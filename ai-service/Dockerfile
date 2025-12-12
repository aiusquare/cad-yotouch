FROM python:3.11-slim
WORKDIR /app
COPY pyproject.toml ./
RUN pip install --upgrade pip
RUN pip install . || true
COPY . .
EXPOSE 9000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "9000"]
