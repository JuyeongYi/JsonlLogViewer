# JsonlLogViewer 빌드 및 설치 스크립트
# 실행: .\install.ps1
# 옵션: .\install.ps1 -DevOnly  (의존성 설치만, 빌드 없음)
#       .\install.ps1 -Run      (빌드 없이 개발 서버 실행)

param(
    [switch]$DevOnly,
    [switch]$Run
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Write-Step($msg) {
    Write-Host "`n==> $msg" -ForegroundColor Cyan
}

function Write-Ok($msg) {
    Write-Host "  ✓ $msg" -ForegroundColor Green
}

function Write-Fail($msg) {
    Write-Host "  ✗ $msg" -ForegroundColor Red
    exit 1
}

# ── Node.js 확인 ──────────────────────────────────────────
Write-Step "환경 확인"

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Fail "Node.js가 설치되어 있지 않습니다. https://nodejs.org 에서 설치 후 재실행하세요."
}

$nodeVer = (node -v) -replace 'v',''
$major   = [int]($nodeVer -split '\.')[0]
if ($major -lt 18) {
    Write-Fail "Node.js 18 이상이 필요합니다. 현재: v$nodeVer"
}
Write-Ok "Node.js v$nodeVer"

if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
    Write-Fail "npm을 찾을 수 없습니다."
}
Write-Ok "npm $(npm -v)"

# ── 의존성 설치 ───────────────────────────────────────────
Write-Step "의존성 설치 (npm install)"
npm install
if ($LASTEXITCODE -ne 0) { Write-Fail "npm install 실패" }
Write-Ok "의존성 설치 완료"

# ── DevOnly 또는 Run 모드 ─────────────────────────────────
if ($DevOnly) {
    Write-Ok "의존성 설치만 완료. 개발 실행: .\install.ps1 -Run"
    exit 0
}

if ($Run) {
    Write-Step "개발 서버 실행 (npm run dev)"
    npm run dev
    exit 0
}

# ── 빌드 ─────────────────────────────────────────────────
Write-Step "앱 빌드 (electron-vite build)"
npm run build
if ($LASTEXITCODE -ne 0) { Write-Fail "빌드 실패" }
Write-Ok "빌드 완료"

# ── Windows 설치 패키지 생성 ──────────────────────────────
Write-Step "Windows 설치 파일 생성 (electron-builder)"
npx electron-builder --win
if ($LASTEXITCODE -ne 0) { Write-Fail "패키징 실패" }

$installer = Get-ChildItem -Path "dist" -Filter "*-setup.exe" -ErrorAction SilentlyContinue | Select-Object -First 1
if ($installer) {
    Write-Ok "설치 파일 생성 완료: dist\$($installer.Name)"
    Write-Host "`n  설치 실행: dist\$($installer.Name)" -ForegroundColor Yellow
} else {
    Write-Ok "빌드 완료 (dist\ 폴더 확인)"
}
