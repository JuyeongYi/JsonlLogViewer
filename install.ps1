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
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path

function Write-Step($msg) { Write-Host "`n==> $msg" -ForegroundColor Cyan }
function Write-Ok($msg)   { Write-Host "  ✓ $msg" -ForegroundColor Green }
function Write-Fail($msg) { Write-Host "  ✗ $msg" -ForegroundColor Red; exit 1 }

# ── Node.js 확인 ──────────────────────────────────────────
Write-Step "환경 확인"

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Fail "Node.js가 설치되어 있지 않습니다. https://nodejs.org 에서 설치 후 재실행하세요."
}
$nodeVer = (node -v) -replace 'v',''
if ([int]($nodeVer -split '\.')[0] -lt 18) { Write-Fail "Node.js 18 이상 필요. 현재: v$nodeVer" }
Write-Ok "Node.js v$nodeVer / npm $(npm -v)"

# ── 의존성 설치 ───────────────────────────────────────────
Write-Step "의존성 설치"
npm install
if ($LASTEXITCODE -ne 0) { Write-Fail "npm install 실패" }
Write-Ok "완료"

if ($DevOnly) { exit 0 }
if ($Run) { Write-Step "개발 서버 실행"; npm run dev; exit 0 }

# ── winCodeSign 사전 캐시 ─────────────────────────────────
# electron-builder가 NSIS 빌드 시 winCodeSign을 요구하지만
# 7z 안에 macOS 심볼릭 링크가 있어 권한 오류 발생.
# → -snl (skip symbolic links) 옵션으로 직접 추출해 캐시에 배치.
function Ensure-WinCodeSign {
    $ver      = "2.6.0"
    $cacheDir = "$env:LOCALAPPDATA\electron-builder\Cache\winCodeSign\winCodeSign-$ver"
    $7za      = Join-Path $ScriptDir "node_modules\7zip-bin\win\x64\7za.exe"

    if (Test-Path (Join-Path $cacheDir "win")) {
        Write-Ok "winCodeSign 캐시 존재 (건너뜀)"
        return
    }

    Write-Host "  winCodeSign 다운로드 및 추출 중..." -ForegroundColor Gray
    New-Item -ItemType Directory -Force $cacheDir | Out-Null

    $url = "https://github.com/electron-userland/electron-builder-binaries/releases/download/winCodeSign-$ver/winCodeSign-$ver.7z"
    $tmp = "$env:TEMP\winCodeSign-$ver.7z"

    Invoke-WebRequest -Uri $url -OutFile $tmp -UseBasicParsing

    # -snl: 심볼릭 링크 건너뜀 (macOS 전용, Windows 빌드에 불필요)
    & $7za x -snl -bd $tmp "-o$cacheDir" | Out-Null
    if ($LASTEXITCODE -ne 0) { Write-Fail "winCodeSign 추출 실패" }

    Remove-Item $tmp -ErrorAction SilentlyContinue
    Write-Ok "winCodeSign 캐시 완료"
}

Write-Step "빌드 도구 캐시 확인"
Ensure-WinCodeSign

# ── 앱 빌드 ─────────────────────────────────────────────
Write-Step "앱 빌드"
npm run build
if ($LASTEXITCODE -ne 0) { Write-Fail "빌드 실패" }
Write-Ok "빌드 완료"

# ── NSIS 설치 파일 생성 ───────────────────────────────────
Write-Step "설치 파일 생성 (NSIS .exe)"
$env:CSC_IDENTITY_AUTO_DISCOVERY = 'false'
npx electron-builder --win
Remove-Item Env:\CSC_IDENTITY_AUTO_DISCOVERY -ErrorAction SilentlyContinue

if ($LASTEXITCODE -ne 0) { Write-Fail "패키징 실패" }

$installer = Get-ChildItem "dist" -Filter "*-setup.exe" -ErrorAction SilentlyContinue | Select-Object -First 1
if ($installer) {
    Write-Ok "설치 파일 생성 완료"
    Write-Host "`n  ▶ dist\$($installer.Name)" -ForegroundColor Yellow
}
