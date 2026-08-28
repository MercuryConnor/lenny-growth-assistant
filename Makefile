.PHONY: build up down logs restart test clean frontend-install backend-install

# Docker Compose commands
build:
	docker-compose build

up:
	docker-compose up -d

down:
	docker-compose down

logs:
	docker-compose logs -f

restart:
	docker-compose restart

# Local development helpers
frontend-install:
	cd frontend && npm install

frontend-dev:
	cd frontend && npm run dev

backend-install:
	cd backend && pip install -r requirements.txt

backend-dev:
	cd backend && uvicorn app.main:app --reload

# Testing
test:
	cd backend && pytest

# Clean up
clean:
	docker-compose down -v
	rm -rf frontend/node_modules
	rm -rf backend/__pycache__
