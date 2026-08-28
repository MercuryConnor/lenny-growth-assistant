# Start the Docker Compose stack
docker-compose up -d

Write-Host "Services are starting up!"
Write-Host "Backend API: http://localhost:8000"
Write-Host "Frontend UI: http://localhost:3000"
Write-Host "To view logs, run: docker-compose logs -f"
