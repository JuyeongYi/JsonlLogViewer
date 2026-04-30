; JsonlLogViewer NSIS 커스텀 스크립트
; PowerShell을 통해 PATH 관리 (StrRep/StrStr 미사용)

; ── 설치 후: PATH에 설치 디렉토리 추가 ──────────────────
!macro customInstall
  nsExec::ExecToLog 'powershell.exe -NonInteractive -NoProfile -Command \
    "$p=[Environment]::GetEnvironmentVariable($\"Path$\",$\"User$\"); \
     if($p -notlike $\"*$INSTDIR*$\") { \
       [Environment]::SetEnvironmentVariable($\"Path$\", $\"$p;$INSTDIR$\", $\"User$\") \
     }"'
!macroend

; ── 제거 후: PATH에서 설치 디렉토리 제거 ────────────────
!macro customUnInstall
  nsExec::ExecToLog 'powershell.exe -NonInteractive -NoProfile -Command \
    "$p=[Environment]::GetEnvironmentVariable($\"Path$\",$\"User$\"); \
     $p=($p -split $\";$\" | Where-Object { $_ -ne $\"$INSTDIR$\" }) -join $\";\"; \
     [Environment]::SetEnvironmentVariable($\"Path$\", $p, $\"User$\")"'
!macroend
