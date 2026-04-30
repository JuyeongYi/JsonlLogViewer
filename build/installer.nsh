; JsonlLogViewer NSIS 커스텀 스크립트
; 설치/제거 시 PATH 자동 관리

; ── 설치 후: PATH에 설치 디렉토리 추가 ──────────────────
!macro customInstall
  ; 현재 사용자 PATH에 설치 디렉토리 추가
  ReadRegStr $0 HKCU "Environment" "Path"

  ; 이미 포함되어 있으면 건너뜀
  ${StrStr} $1 "$0" "$INSTDIR"
  ${If} $1 == ""
    ${If} $0 == ""
      WriteRegExpandStr HKCU "Environment" "Path" "$INSTDIR"
    ${Else}
      WriteRegExpandStr HKCU "Environment" "Path" "$INSTDIR;$0"
    ${EndIf}
    ; 환경 변수 변경을 시스템에 알림
    SendMessage ${HWND_BROADCAST} ${WM_WININICHANGE} 0 "STR:Environment" /TIMEOUT=5000
  ${EndIf}
!macroend

; ── 제거 후: PATH에서 설치 디렉토리 제거 ────────────────
!macro customUninstall
  ReadRegStr $0 HKCU "Environment" "Path"

  ; PATH에서 설치 디렉토리 제거 (앞, 중간, 끝 위치 모두 처리)
  ${StrRep} $0 "$0" "$INSTDIR;" ""
  ${StrRep} $0 "$0" ";$INSTDIR" ""
  ${StrRep} $0 "$0" "$INSTDIR"  ""

  WriteRegExpandStr HKCU "Environment" "Path" "$0"
  SendMessage ${HWND_BROADCAST} ${WM_WININICHANGE} 0 "STR:Environment" /TIMEOUT=5000
!macroend
