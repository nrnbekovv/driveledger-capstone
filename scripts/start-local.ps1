$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path $PSScriptRoot -Parent
Set-Location $projectRoot
if (-not (Test-Path .venv/Scripts/python.exe)) { python -m venv .venv }
$pythonPath = Join-Path $projectRoot '.venv/Scripts/python.exe'
& $pythonPath -m pip install -r server/requirements.txt -r server/djangoapp/microservices/requirements.txt
if ($LASTEXITCODE) { throw 'Python dependency installation failed.' }
if (-not (Test-Path .env)) {
  & $pythonPath -c "import secrets,pathlib; pathlib.Path('.env').write_text('DJANGO_SECRET_KEY='+secrets.token_hex(40)+'\nBACKEND_API_KEY='+secrets.token_hex(32)+'\n')"
}
Push-Location server/frontend
npm.cmd ci
if ($LASTEXITCODE) { throw 'Frontend installation failed.' }
npm.cmd run build
if ($LASTEXITCODE) { throw 'Frontend build failed.' }
Pop-Location
Push-Location server/database
npm.cmd ci
if ($LASTEXITCODE) { throw 'API installation failed.' }
Pop-Location
Push-Location server
& $pythonPath manage.py migrate
& $pythonPath manage.py seed_cars
& $pythonPath manage.py collectstatic --noinput
Pop-Location
New-Item -ItemType Directory -Force .local | Out-Null
Start-Process node -ArgumentList 'local.js' -WorkingDirectory "$projectRoot/server/database" -WindowStyle Hidden -RedirectStandardOutput "$projectRoot/.local/api.log" -RedirectStandardError "$projectRoot/.local/api-error.log"
Start-Process $pythonPath -ArgumentList 'app.py' -WorkingDirectory "$projectRoot/server/djangoapp/microservices" -WindowStyle Hidden -RedirectStandardOutput "$projectRoot/.local/sentiment.log" -RedirectStandardError "$projectRoot/.local/sentiment-error.log"
Start-Process $pythonPath -ArgumentList 'manage.py runserver 127.0.0.1:8000 --noreload' -WorkingDirectory "$projectRoot/server" -WindowStyle Hidden -RedirectStandardOutput "$projectRoot/.local/django.log" -RedirectStandardError "$projectRoot/.local/django-error.log"
Write-Host 'Open http://127.0.0.1:8000 after the services finish starting.'
Write-Host 'Create an administrator with: .venv/Scripts/python.exe server/manage.py createsuperuser'
