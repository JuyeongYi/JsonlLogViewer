# JsonlLogViewer 빌드 및 설치 스크립트
#
# 사용법:
#   .\install.ps1          → 빌드 + NSIS 설치 파일(.exe) 생성
#   .\install.ps1 -DevOnly → 의존성 설치만
#   .\install.ps1 -Run     → 개발 서버 실행

param(
    [switch]$DevOnly,
    [switch]$Run
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Write-Step($msg) { Write-Host "`n==> $msg" -ForegroundColor Cyan }
function Write-Ok($msg)   { Write-Host "  ✓ $msg" -ForegroundColor Green }
function Write-Fail($msg) { Write-Host "  ✗ $msg" -ForegroundColor Red; exit 1 }

# ── Node.js 확인 ──────────────────────────────────────────
Write-Step "환경 확인"

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Fail "Node.js가 설치되어 있지 않습니다. https://nodejs.org 에서 설치 후 재실행하세요."
}
$nodeVer = (node -v) -replace 'v',''
$major   = [int]($nodeVer -split '\.')[0]
if ($major -lt 18) { Write-Fail "Node.js 18 이상 필요. 현재: v$nodeVer" }
Write-Ok "Node.js v$nodeVer / npm $(npm -v)"

# ── 의존성 설치 ───────────────────────────────────────────
Write-Step "의존성 설치"
npm install
if ($LASTEXITCODE -ne 0) { Write-Fail "npm install 실패" }
Write-Ok "완료"

if ($DevOnly) { Write-Ok "의존성 설치 완료."; exit 0 }

if ($Run) {
    Write-Step "개발 서버 실행"
    npm run dev
    exit 0
}

# ── 빌드 ─────────────────────────────────────────────────
Write-Step "앱 빌드"
npm run build
if ($LASTEXITCODE -ne 0) { Write-Fail "빌드 실패" }
Write-Ok "빌드 완료"

# ── 설치 파일 생성 ────────────────────────────────────────
# CSC_IDENTITY_AUTO_DISCOVERY=false → 코드 서명 건너뜀 (winCodeSign 불필요)
Write-Step "설치 파일 생성 (NSIS .exe)"
$env:CSC_IDENTITY_AUTO_DISCOVERY = 'false'
npx electron-builder --win
Remove-Item Env:\CSC_IDENTITY_AUTO_DISCOVERY -ErrorAction SilentlyContinue

if ($LASTEXITCODE -ne 0) { Write-Fail "패키징 실패" }

$installer = Get-ChildItem "dist" -Filter "*-setup.exe" -ErrorAction SilentlyContinue | Select-Object -First 1
if ($installer) {
    Write-Ok "설치 파일 생성 완료"
    Write-Host "`n  ▶ dist\$($installer.Name)" -ForegroundColor Yellow
} else {
    Write-Ok "dist\ 폴더를 확인하세요."
}
