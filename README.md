# DriveLedger — Car Dealership Review Portal

**Repository name:** `driveledger-capstone`
**Project name:** DriveLedger — Car Dealership Review Portal

A full-stack dealership directory and review application for the IBM Full Stack Application Development Capstone. This repository is a fork of the [official IBM starter](https://github.com/ibm-developer-skills-network/xrwvm-fullstack_developer_capstone). The implementation was developed with AI assistance; the owner should review the code and the course's assistance policy before submitting.

## Features

- Django serves a React frontend with 50 dealerships, state filtering, search, pagination, dealer details and customer reviews.
- Registration, login and logout use Django sessions and CSRF protection. Review authors come from the authenticated account.
- Express and MongoDB store dealerships and reviews. Seed records are inserted idempotently; restarting the API does not erase new reviews.
- CarMake and CarModel are editable in Django admin; 5 makes and 153 models are imported from the course's vehicle data.
- A separate Flask/VADER service analyzes review sentiment. No paid inference API is required.
- About Us and Contact Us are separate HTML pages.
- Docker Compose runs all four services with persistent local volumes.
- GitHub Actions runs tests, builds the frontend, builds all containers, deploys an isolated Compose test stack and verifies it over HTTP.
- A Skills Network script builds IBM Container Registry images and deploys the application to Kubernetes.

## Architecture

Browser → Django (React, authentication, car models) → Express API → MongoDB
Django → Flask/VADER sentiment service

Only Django is exposed publicly. Express writes require a shared internal API key. Secrets are supplied at runtime and excluded from Git.

## Run locally on Windows

Prerequisites: Python 3.12+ and Node.js 24.

```powershell
powershell -ExecutionPolicy Bypass -File scripts/start-local.ps1
```

Open http://127.0.0.1:8000. The first API start downloads an official MongoDB binary; it uses a persistent `.local/mongodb` directory. The wrapper package is named mongodb-memory-server, but this launcher uses the real MongoDB process with WiredTiger on disk.

Register an account in the UI. For Django administration:

```powershell
.venv/Scripts/python.exe server/manage.py createsuperuser
```

## Run with Docker

Copy `.env.example` to `.env`, replace the two secret values with long random strings, then:

```bash
docker compose up --build -d --wait
```

Open http://localhost:8000. Optionally set `DJANGO_SUPERUSER_PASSWORD` and `DEMO_PASSWORD` to create initial `root` and `capstone_driver` accounts. These accounts are created only when absent.

## Deploy in Skills Network Labs

Inside the Kubernetes Cloud IDE, clone your fork and run:

```bash
git clone https://github.com/nrnbekovv/driveledger-capstone.git
cd driveledger-capstone
bash scripts/deploy-lab.sh
```

The script targets the currently selected `sn-labs-*` namespace, creates only DriveLedger resources, builds and pushes three images, and applies the Kubernetes deployment. It does not delete unrelated deployments or images. Credentials stay in `.local/deployment.env`; the deployment URL is written to `.local/deploymentURL` when a route is available.

The laboratory manifest uses `emptyDir` volumes: data survives container restarts but is lost if the pod is replaced or the lab is reset. Use persistent volumes and a managed database before treating this as a production service. Laboratory availability is temporary.

## API routes

| Route | Purpose |
|---|---|
| GET /djangoapp/session | Session status and CSRF token |
| POST /djangoapp/register | Register with userName, firstName, lastName, email, password |
| POST /djangoapp/login | Sign in with userName and password |
| POST /djangoapp/logout | Sign out |
| GET /djangoapp/get_dealers[/State] | All dealerships or exact state filter |
| GET /djangoapp/dealer/15 | Dealer details |
| GET /djangoapp/reviews/dealer/15 | Dealer reviews with sentiment |
| GET /djangoapp/get_cars | Car makes and models |
| POST /djangoapp/add_review | Authenticated review submission |
| GET /djangoapp/analyze_review/Fantastic%20services | Sentiment analysis |
| GET /djangoapp/health | End-to-end service health |

Express endpoints: `/fetchDealers`, `/fetchDealers/Kansas`, `/fetchDealer/15`, `/fetchReviews/dealer/15`, `/insert_review`. The sentiment endpoint is `/analyze/Fantastic%20services`.

## Tests and CI/CD

```bash
cd server
python manage.py test djangoapp
cd djangoapp/microservices
python -m unittest -v
cd ../../database
npm test
cd ../frontend
npm run build
```

CI runs on pushes to main and pull requests. The deployment job creates an isolated stack on the GitHub runner, tests the homepage, Kansas API and service health, then removes the test stack. The separately documented Skills Network deployment is performed from the lab; CI does not retain a hosted service after a run.

## Evidence for Option 1

See [docs/option1-checklist.md](docs/option1-checklist.md). Submission evidence must come from actual commands and running pages. Never substitute example logs for a successful execution. Question 14 combines Tasks 14 and 15, so subsequent question and task numbers differ by one.

## Credits

- IBM Developer Skills Network starter code and seeded dealership, review and vehicle datasets; original Apache 2.0 license retained.
- VADER sentiment analysis via vaderSentiment.
- Sample staff portraits: Unsplash images `photo-1500648767791-00dcc994a43e`, `photo-1580489944761-15a19d654956`, and `photo-1506794778202-cad84cf45f1d`. Names, roles and contact details on the demo pages are fictional.
