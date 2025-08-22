#!/usr/bin/env bash
set -Eeuo pipefail

log() { printf "\n[%s] %s\n" "$(date +'%H:%M:%S')" "$*"; }
HARD_STOP() { echo "ERROR: $*" >&2; exit 1; }

export GIT_TERMINAL_PROMPT=0
export GIT_PAGER=cat

log "WHOAMI"
git --version || true
git config user.name || true
git config user.email || true

log "PATHS"
REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || true)"
PWD_NOW="$(pwd)"
echo "Repo root: ${REPO_ROOT:-<not a git repo>}"
echo "Current dir: $PWD_NOW"

if [ -z "${REPO_ROOT}" ]; then
  HARD_STOP "This folder isn't a git repo. Open the repo at: $PWD_NOW (or correct path) and rerun."
fi

if [ "$PWD_NOW" != "$REPO_ROOT" ]; then
  log "CD to repo root"
  cd "$REPO_ROOT"
fi

log "STATUS (short)"
git --no-pager status -sb || true

log "BRANCHES (local)"
git --no-pager branch -vv || true

# Detect detached HEAD
CURRENT_BRANCH="$(git rev-parse --abbrev-ref HEAD || true)"
if [ "$CURRENT_BRANCH" = "HEAD" ]; then
  log "Detached HEAD detected. Creating branch cursor/fix"
  git switch -c cursor/fix
  CURRENT_BRANCH="cursor/fix"
else
  log "On branch: $CURRENT_BRANCH"
fi

log "REMOTES"
git remote -v || true
ORIGIN_URL="$(git config --get remote.origin.url || true)"
echo "origin: ${ORIGIN_URL:-<none>}"
if [ -z "${ORIGIN_URL}" ]; then
  HARD_STOP "No 'origin' remote configured. Please add your remote and rerun."
fi

log "STAGED CHANGES"
STAGED_COUNT="$(git diff --cached --name-only | wc -l | tr -d ' ')"
echo "staged files: $STAGED_COUNT"
if [ "$STAGED_COUNT" -gt 0 ]; then
  log "Committing staged changes"
  git commit -m "chore(cursor): commit staged changes before push"
else
  echo "No staged files to commit."
fi

log "LAST COMMITS (local)"
git --no-pager log --oneline --decorate -n 5 || true
LOCAL_HEAD_SHA="$(git rev-parse HEAD)"

log "PUSH (non-interactive, will fail fast if auth/perm blocked)"
set +e
PUSH_OUT="$(git push -u origin "$CURRENT_BRANCH" 2>&1)"
PUSH_CODE=$?
set -e
echo "$PUSH_OUT"
if [ $PUSH_CODE -ne 0 ]; then
  echo "Push failed (expected if auth required). Continuing with reporting."
fi

log "VERIFY REMOTE HAS BRANCH/HEAD"
set +e
REMOTE_INFO="$(git ls-remote --heads origin "$CURRENT_BRANCH" 2>&1)"
REMOTE_CODE=$?
set -e
echo "$REMOTE_INFO"
REMOTE_HEAD_SHA="$(echo "$REMOTE_INFO" | awk '{print $1}' | head -n1 || true)"

MATCH="no"
if [ $REMOTE_CODE -eq 0 ] && [ -n "${REMOTE_HEAD_SHA}" ] && [ "${REMOTE_HEAD_SHA}" = "${LOCAL_HEAD_SHA}" ]; then
  MATCH="yes"
fi

log "FINAL REPORT"
echo "Repo root: $REPO_ROOT"
echo "Current dir: $(pwd)"
echo "Branch: $CURRENT_BRANCH"
echo "Origin: ${ORIGIN_URL}"
echo "Local HEAD: ${LOCAL_HEAD_SHA}"
echo "Remote HEAD (branch): ${REMOTE_HEAD_SHA:-<unavailable>}"
echo "Is remote up-to-date with local HEAD? $MATCH"
echo "Notes:"
if [ $PUSH_CODE -ne 0 ]; then
  echo " - Push failed (likely auth). Configure credentials in GitKraken or CLI and rerun script."
fi
if [ $REMOTE_CODE -ne 0 ]; then
  echo " - Could not read remote (auth/network). This is ok; local info above is still valid."
fi

log "DONE"
