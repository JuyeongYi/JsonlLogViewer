# JsonlLogViewer 빌드 및 설치 스크립트
#
# 사용법:
#   .\install.ps1              → 빌드 + 실행 파일 생성 (dist\win-unpacked\)
#   .\install.ps1 -Installer   → 빌드 + NSIS 설치 파일(.exe) 생성 *개발자 모드 또는 관리자 권한 필요
#   .\install.ps1 -DevOnly     → 의존성 설치만
#   .\install.ps1 -Run         → 개발 서버 실행

param(
    [switch]$Installer,   # NSIS 설치 파일(.exe) 생성 (심볼릭 링크 권한 필요)
    [switch]$DevOnly,
    [switch]$Run
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Write-Step($msg) { Write-Host "`n==> $msg" -ForegroundColor Cyan }
function Write-Ok($msg)   { Write-Host "  ✓ $msg" -ForegroundColor Green }
function Write-Warn($msg) { Write-Host "  ! $msg" -ForegroundColor Yellow }
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

# ── 모드 분기 ─────────────────────────────────────────────
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

# ── 패키징 ───────────────────────────────────────────────
if ($Installer) {
    # NSIS .exe 생성 — 심볼릭 링크 권한 필요
    # (설정 → 개인 정보 및 보안 → 개발자용 → 개발자 모드 ON, 또는 관리자로 실행)
    Write-Step "NSIS 설치 파일 생성 (-Installer)"
    Write-Warn "심볼릭 링크 권한 필요: Windows 개발자 모드 또는 관리자 권한으로 실행하세요."

    npx electron-builder --win
    if ($LASTEXITCODE -ne 0) {
        Write-Warn "NSIS 패키징 실패. 권한 문제라면:"
        Write-Host "    1. 설정 → 개인 정보 및 보안 → 개발자용 → 개발자 모드 ON" -ForegroundColor Gray
        Write-Host "    2. 또는 PowerShell을 관리자로 실행 후 재시도" -ForegroundColor Gray
        Write-Host "    3. 또는 .\install.ps1 (설치 파일 없이 실행 파일만 생성)" -ForegroundColor Gray
        exit 1
    }

    $installer = Get-ChildItem "dist" -Filter "*-setup.exe" -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($installer) {
        Write-Ok "설치 파일: dist\$($installer.Name)"
        Write-Host "`n  실행: dist\$($installer.Name)" -ForegroundColor Yellow
    }

} else {
    # --dir: NSIS 없이 실행 파일만 생성 (권한 불필요)
    Write-Step "실행 파일 생성 (서명/설치 파일 없음)"
    npx electron-builder --dir
    if ($LASTEXITCODE -ne 0) { Write-Fail "패키징 실패" }

    $exe = Get-ChildItem "dist\win-unpacked" -Filter "*.exe" -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($exe) {
        Write-Ok "실행 파일: dist\win-unpacked\$($exe.Name)"
        Write-Host "`n  실행: dist\win-unpacked\$($exe.Name)" -ForegroundColor Yellow
        Write-Host "  설치 파일(.exe) 생성: .\install.ps1 -Installer" -ForegroundColor Gray
    }
}
