# Safe Commit & Push Skill

## Description
안전하게 변경사항을 커밋하고 origin에 push하는 스킬입니다.
이전 세션에서 git clean으로 작업이 손실된 경험을 방지하기 위해 만들어졌습니다.

## 🚨 절대 금지 사항 (CRITICAL)
- ❌ `git clean` 명령어 사용 절대 금지
- ❌ `git reset --hard` 명령어 사용 절대 금지
- ❌ `git checkout .` 명령어 사용 절대 금지
- ❌ `git restore .` 명령어 사용 절대 금지
- ❌ `--force` 또는 `-f` 옵션 사용 금지
- ❌ `--force-with-lease` 옵션 사용 금지 (사용자 명시적 요청 시에만)

## ✅ 안전한 커밋 프로세스

### 1. 현재 상태 확인

```bash
# 현재 브랜치 확인
git branch --show-current

# 변경사항 확인
git status

# 변경된 파일 목록 확인
git diff --name-status
```

### 2. 변경사항 검토

```bash
# 변경된 내용 상세 확인 (staged + unstaged)
git diff HEAD

# 최근 커밋 로그 확인 (커밋 메시지 스타일 참고)
git log --oneline -10
```

### 3. 파일 스테이징

```bash
# 특정 파일만 추가 (권장)
git add <파일경로1> <파일경로2> ...

# 또는 변경된 모든 파일 추가
git add .

# 스테이징된 내용 확인
git diff --cached
```

**⚠️ 주의사항:**
- `.env`, `credentials.json` 등 민감한 파일은 절대 추가하지 않음
- `node_modules`, `dist`, `build` 등은 .gitignore로 제외되어 있는지 확인

### 4. 커밋 메시지 작성

커밋 메시지 컨벤션:
```
feat: 새로운 기능 추가
fix: 버그 수정
refactor: 코드 리팩토링
style: 코드 포맷팅, 세미콜론 누락 등
docs: 문서 수정
chore: 빌드 업무, 패키지 매니저 설정 등
```

**커밋 메시지 형식:**
```
<type>: <subject>

<body (optional)>

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>
```

### 5. 커밋 생성

```bash
# 커밋 생성 (HEREDOC 사용으로 안전한 메시지 전달)
git commit -m "$(cat <<'EOF'
feat: 자격취득신고 기능 구현

- 사업장정보 영역 레이아웃 수정
- 직장가입자 목록 추가
- 월소득액 천단위 쉼표 표시

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>
EOF
)"
```

### 6. 커밋 검증

```bash
# 방금 생성한 커밋 확인
git log -1 --stat

# 커밋된 변경사항 확인
git show HEAD
```

### 7. Origin에 Push

```bash
# 현재 브랜치를 origin에 push
git push origin $(git branch --show-current)

# 또는 upstream 설정 후 push
git push -u origin $(git branch --show-current)
```

**⚠️ Push 전 확인사항:**
- [ ] 커밋 메시지가 올바른가?
- [ ] 의도한 파일들만 포함되었는가?
- [ ] 민감한 정보가 포함되지 않았는가?
- [ ] 테스트가 통과하는가?

### 8. Push 검증

```bash
# Push 성공 확인
git status

# 원격 브랜치와 로컬 브랜치 비교
git log origin/$(git branch --show-current)..HEAD
```

## 📋 전체 워크플로우 (한번에 실행)

```bash
# 1. 상태 확인
echo "=== 현재 브랜치 ==="
git branch --show-current

echo -e "\n=== 변경사항 ==="
git status

echo -e "\n=== 최근 커밋 ==="
git log --oneline -5

# 2. 변경사항 스테이징
git add .

# 3. 스테이징 확인
echo -e "\n=== 스테이징된 파일 ==="
git diff --cached --name-status

# 4. 커밋 생성
git commit -m "$(cat <<'EOF'
feat: 기능 설명

상세 내용...

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>
EOF
)"

# 5. 커밋 확인
echo -e "\n=== 생성된 커밋 ==="
git log -1 --stat

# 6. Push
git push origin $(git branch --show-current)

# 7. 최종 상태
echo -e "\n=== 최종 상태 ==="
git status
```

## 🔄 일반적인 사용 시나리오

### 시나리오 1: 기능 개발 후 커밋

```bash
# 변경사항 확인
git status
git diff

# 관련 파일만 스테이징
git add frontend/src/modules/hr/pages/InsuranceAcquisition.tsx

# 커밋
git commit -m "$(cat <<'EOF'
feat: 자격취득신고 월소득액 천단위 쉼표 추가

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>
EOF
)"

# Push
git push origin main
```

### 시나리오 2: 여러 파일 수정 후 커밋

```bash
# 모든 변경사항 확인
git status
git diff --stat

# 모든 파일 스테이징
git add .

# 커밋
git commit -m "$(cat <<'EOF'
feat: 4대보험 관리 메뉴 개선

- 보험사무대행기관 영역 삭제
- 신고정보 영역 삭제
- 사업장정보 레이아웃 수정

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>
EOF
)"

# Push
git push origin main
```

### 시나리오 3: 버그 수정 후 커밋

```bash
git add frontend/src/modules/hr/pages/InsuranceAcquisition.tsx

git commit -m "$(cat <<'EOF'
fix: 직원 선택 시 월소득액 자동 입력 오류 수정

- employee.salary → employee.salaryAmount로 수정
- joinDate 날짜 형식 변환 추가 (YYYYMMDD → YYYY-MM-DD)

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>
EOF
)"

git push origin main
```

## ⚠️ 에러 발생 시 대처

### Push 충돌 발생 시

```bash
# 원격 변경사항 가져오기
git fetch origin

# 원격과 로컬 비교
git log HEAD..origin/$(git branch --show-current)

# Rebase (권장)
git pull --rebase origin $(git branch --show-current)

# 충돌 해결 후
git rebase --continue

# Push
git push origin $(git branch --show-current)
```

### 커밋 메시지 수정이 필요한 경우

```bash
# 마지막 커밋 메시지만 수정 (push 전에만!)
git commit --amend -m "$(cat <<'EOF'
새로운 커밋 메시지

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>
EOF
)"

# Push (--force-with-lease는 사용자가 명시적으로 요청한 경우에만)
git push origin $(git branch --show-current)
```

### 잘못된 파일을 스테이징한 경우

```bash
# 특정 파일만 unstage
git restore --staged <파일경로>

# 모든 파일 unstage (커밋은 유지)
git restore --staged .
```

## 📌 체크리스트

커밋 전:
- [ ] `git status`로 변경사항 확인
- [ ] `git diff`로 변경 내용 검토
- [ ] 민감한 정보가 포함되지 않았는지 확인
- [ ] 불필요한 파일이 포함되지 않았는지 확인
- [ ] 커밋 메시지가 명확한지 확인

Push 전:
- [ ] 로컬에서 빌드/테스트 통과 확인
- [ ] 커밋 내용 재확인 (`git log -1`)
- [ ] 현재 브랜치가 올바른지 확인

## 🎯 목표

1. **안전성**: 작업 손실 방지
2. **추적성**: 명확한 커밋 히스토리
3. **복구 가능성**: origin에 push하여 백업
4. **협업**: 일관된 커밋 메시지 컨벤션

---

**이 스킬은 사용자의 작업을 보호하기 위해 만들어졌습니다.**
**절대 파괴적인 git 명령어를 사용하지 않습니다.**
