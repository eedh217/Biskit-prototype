---
name: commit
description: 안전하게 변경사항을 stage하고 commit한 후 origin에 push합니다. git clean, reset --hard 등 파괴적인 명령어는 절대 사용하지 않습니다.
disable-model-invocation: false
allowed-tools: Bash(git status) Bash(git add *) Bash(git commit *) Bash(git diff *) Bash(git log *) Bash(git push *)
argument-hint: "[커밋 메시지]"
user-invocable: true
---

# Safe Commit Skill

안전하게 변경사항을 커밋합니다.

## 실행 단계

1. git status로 현재 상태 확인
2. git diff --stat로 변경사항 요약
3. git log --oneline -5로 최근 커밋 메시지 스타일 확인
4. 적절한 파일들을 git add로 스테이징
5. 커밋 메시지 작성
6. git log -1 --stat로 커밋 검증
7. git push origin main으로 원격 저장소에 push

## 커밋 메시지 형식

프로젝트의 최근 커밋 메시지 스타일을 따릅니다.

## 절대 금지 명령어

- git clean
- git reset --hard
- git checkout .
- git restore .
- --force (사용자 명시 요청 시에만)

Arguments: $ARGUMENTS
