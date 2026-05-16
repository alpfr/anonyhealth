#!/usr/bin/env bash
#
# ship.sh — one-command PR → production workflow for AnonyHealth.
#
# What it does:
#   1. Verifies preconditions (clean working tree, on a feature branch)
#   2. Commits staged changes (or uses existing commits if branch is ahead)
#   3. Pushes the branch to origin
#   4. Creates a PR (or finds existing one)
#   5. Waits for the Test workflow to complete
#   6. If tests pass:
#        • Without --auto: shows results, asks for merge confirmation
#        • With --auto: merges immediately
#   7. Watches the Deploy workflow run
#   8. Reports production status
#
# Usage:
#   ./scripts/ship.sh "feat: add the thing"           # confirm before merge
#   ./scripts/ship.sh --auto "fix: typo in copy"      # merge automatically
#   ./scripts/ship.sh --dry-run "test message"        # show what would happen
#   ./scripts/ship.sh                                 # use existing commit, prompts for everything
#
# Prerequisites:
#   - GitHub CLI (`gh`) installed and authenticated
#       brew install gh && gh auth login
#   - On a feature branch (not main)
#   - Working tree must be clean OR have staged changes ready to commit

set -euo pipefail

# ─── Output helpers ───────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
BOLD='\033[1m'
DIM='\033[2m'
NC='\033[0m'

section() { printf "\n${BOLD}${BLUE}━━━ %s ━━━${NC}\n" "$1"; }
ok()      { printf "${GREEN}✓${NC} %s\n" "$1"; }
warn()    { printf "${YELLOW}⚠${NC} %s\n" "$1"; }
err()     { printf "${RED}✗${NC} %s\n" "$1" >&2; }
info()    { printf "${DIM}  %s${NC}\n" "$1"; }

die() { err "$1"; exit "${2:-1}"; }

# ─── Arg parsing ──────────────────────────────────────────
AUTO_MERGE=false
DRY_RUN=false
COMMIT_MSG=""

while [[ $# -gt 0 ]]; do
    case "$1" in
        --auto|-a)     AUTO_MERGE=true; shift ;;
        --dry-run|-n)  DRY_RUN=true; shift ;;
        --help|-h)
            sed -n '3,25p' "$0" | sed 's/^# \{0,1\}//'
            exit 0
            ;;
        --*)           die "Unknown flag: $1" ;;
        *)
            if [[ -z "$COMMIT_MSG" ]]; then
                COMMIT_MSG="$1"
            else
                die "Multiple commit messages provided. Wrap in quotes."
            fi
            shift
            ;;
    esac
done

# Helper for dry-run: print the command, don't execute.
run() {
    if [[ "$DRY_RUN" == true ]]; then
        printf "${DIM}[dry-run]${NC} %s\n" "$*"
    else
        "$@"
    fi
}

# ─── Preconditions ────────────────────────────────────────
section "Preconditions"

# 1. Are we in a git repo?
if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
    die "Not inside a git repository."
fi

# 2. Is `gh` installed?
if ! command -v gh >/dev/null 2>&1; then
    die "GitHub CLI not found. Install with: brew install gh && gh auth login"
fi

# 3. Is `gh` authenticated?
if ! gh auth status >/dev/null 2>&1; then
    die "GitHub CLI not authenticated. Run: gh auth login"
fi
ok "gh CLI authenticated as: $(gh auth status 2>&1 | grep 'Logged in' | head -1 | awk '{print $NF}' || echo '<unknown>')"

# 4. Are we on a feature branch (NOT main)?
CURRENT_BRANCH=$(git branch --show-current)
if [[ "$CURRENT_BRANCH" == "main" ]] || [[ "$CURRENT_BRANCH" == "master" ]]; then
    die "Refusing to ship from $CURRENT_BRANCH. Create a feature branch first: git checkout -b feat/your-change"
fi
ok "On branch: $CURRENT_BRANCH"

# 5. Is the working tree clean? If not, do we have staged changes ready to commit?
HAS_UNSTAGED=$(git diff --quiet || echo "yes")
HAS_STAGED=$(git diff --cached --quiet || echo "yes")

if [[ "$HAS_UNSTAGED" == "yes" ]]; then
    err "Unstaged changes detected. Stage them with 'git add' first, or stash them:"
    git -c color.status=always status --short
    exit 1
fi

# 6. Sync with origin/main to make sure we're up to date.
section "Syncing with origin"
run git fetch origin main --quiet
BEHIND=$(git rev-list --count HEAD..origin/main)
if [[ "$BEHIND" -gt 0 ]]; then
    warn "Branch is $BEHIND commit(s) behind origin/main"
    info "Consider rebasing: git rebase origin/main"
    read -p "Continue anyway? [y/N] " -n 1 -r REPLY < /dev/tty
    echo
    [[ ! "$REPLY" =~ ^[Yy]$ ]] && die "Aborted."
fi
ok "Up to date with origin/main"

# ─── Commit (if needed) ───────────────────────────────────
section "Commit"

if [[ "$HAS_STAGED" == "yes" ]]; then
    if [[ -z "$COMMIT_MSG" ]]; then
        err "Staged changes detected but no commit message provided."
        info "Usage: ./scripts/ship.sh \"your commit message\""
        exit 1
    fi
    run git commit -m "$COMMIT_MSG"
    ok "Committed: $COMMIT_MSG"
else
    # No staged changes. Verify we have unpushed commits to ship.
    AHEAD=$(git rev-list --count "origin/${CURRENT_BRANCH}..HEAD" 2>/dev/null || echo "1")
    if [[ "$AHEAD" == "0" ]]; then
        die "No staged changes and no unpushed commits. Nothing to ship."
    fi
    info "Using existing commits on this branch ($AHEAD ahead of origin)."
fi

# ─── Push ─────────────────────────────────────────────────
section "Push"
run git push -u origin "$CURRENT_BRANCH"
ok "Pushed to origin/$CURRENT_BRANCH"

# ─── PR ───────────────────────────────────────────────────
section "Pull Request"

# Does a PR already exist for this branch?
EXISTING_PR=$(gh pr list --head "$CURRENT_BRANCH" --json number --jq '.[0].number' 2>/dev/null || echo "")

if [[ -n "$EXISTING_PR" ]]; then
    PR_NUMBER="$EXISTING_PR"
    PR_URL=$(gh pr view "$PR_NUMBER" --json url --jq '.url')
    ok "Found existing PR #$PR_NUMBER: $PR_URL"
else
    # Create a new PR. Use the most recent commit message as the title,
    # and include the commit messages on this branch as the body.
    if [[ "$DRY_RUN" == true ]]; then
        info "[dry-run] Would create PR titled: $(git log -1 --pretty=%s)"
        PR_NUMBER="DRY-RUN"
        PR_URL="https://github.com/<owner>/<repo>/pull/DRY-RUN"
    else
        PR_TITLE=$(git log -1 --pretty=%s)
        PR_BODY=$(git log "origin/main..HEAD" --pretty=format:"- %s" --reverse)

        PR_URL=$(gh pr create \
            --base main \
            --head "$CURRENT_BRANCH" \
            --title "$PR_TITLE" \
            --body "$PR_BODY" \
            2>&1 | tail -1)
        PR_NUMBER=$(echo "$PR_URL" | grep -oE '[0-9]+$')
        ok "Created PR #$PR_NUMBER: $PR_URL"
    fi
fi

# ─── Wait for tests ───────────────────────────────────────
section "Tests"

if [[ "$DRY_RUN" == true ]]; then
    info "[dry-run] Would watch PR test workflow."
else
    info "Waiting for the Test workflow to start..."

    # GitHub takes 20-60s to register a workflow run after push. Poll until
    # at least one check appears, with a generous timeout. Without this,
    # `gh pr checks --watch` returns immediately with "no checks reported"
    # which the script misreads as failure.
    WAIT_DEADLINE=$((SECONDS + 120))
    while [[ $SECONDS -lt $WAIT_DEADLINE ]]; do
        # `gh pr checks` returns a non-zero exit code for "no checks reported"
        # and for "checks failing", so we can't rely on exit code alone.
        # Instead, count rollup entries in the JSON output.
        CHECK_COUNT=$(gh pr view "$PR_NUMBER" --json statusCheckRollup --jq '.statusCheckRollup | length' 2>/dev/null || echo 0)
        if [[ "$CHECK_COUNT" -gt 0 ]]; then
            break
        fi
        sleep 6
    done

    if [[ "${CHECK_COUNT:-0}" -eq 0 ]]; then
        warn "No checks appeared within 2 minutes. Workflow may not be configured."
        info "Open the PR to investigate: $PR_URL"
        exit 1
    fi

    info "Checks registered. Watching for results..."
    if gh pr checks "$PR_NUMBER" --watch --interval 10; then
        ok "All checks passed"
    else
        err "One or more checks failed."
        info "Open the PR to see what broke: $PR_URL"
        info "View failed run logs with: gh run view --log-failed"
        exit 1
    fi
fi

# ─── Merge ────────────────────────────────────────────────
section "Merge"

if [[ "$DRY_RUN" == true ]]; then
    info "[dry-run] Would merge PR #$PR_NUMBER (squash merge, delete branch)."
elif [[ "$AUTO_MERGE" == true ]]; then
    info "Auto-merging..."
    gh pr merge "$PR_NUMBER" --squash --delete-branch --auto
    ok "Merged"
else
    # Show the PR summary, then ask.
    echo
    gh pr view "$PR_NUMBER"
    echo
    read -p "Merge PR #$PR_NUMBER? [y/N] " -n 1 -r REPLY < /dev/tty
    echo
    if [[ ! "$REPLY" =~ ^[Yy]$ ]]; then
        info "Merge skipped. PR left open for review: $PR_URL"
        exit 0
    fi
    gh pr merge "$PR_NUMBER" --squash --delete-branch
    ok "Merged"
fi

# ─── Watch deploy ─────────────────────────────────────────
section "Deploy"

if [[ "$DRY_RUN" == true ]]; then
    info "[dry-run] Would watch the Deploy workflow."
    exit 0
fi

info "Waiting for the Deploy workflow to start..."
# Give GitHub a moment to register the merge and queue the workflow.
sleep 5

# Find the most recent run of the Deploy workflow.
DEPLOY_RUN_ID=$(gh run list \
    --workflow="Deploy to Production" \
    --branch main \
    --limit 1 \
    --json databaseId \
    --jq '.[0].databaseId' 2>/dev/null || echo "")

if [[ -z "$DEPLOY_RUN_ID" ]]; then
    warn "Deploy run not yet visible. Check the Actions tab:"
    info "https://github.com/$(gh repo view --json nameWithOwner --jq .nameWithOwner)/actions"
    exit 0
fi

info "Watching deploy run #$DEPLOY_RUN_ID..."
if gh run watch "$DEPLOY_RUN_ID" --exit-status --interval 15; then
    ok "Deploy succeeded"
else
    err "Deploy failed. Inspect the logs:"
    info "gh run view $DEPLOY_RUN_ID --log-failed"
    exit 1
fi

# ─── Final verification ───────────────────────────────────
section "Verifying production"

if [[ -x "./scripts/verify-deployment.sh" ]]; then
    ./scripts/verify-deployment.sh || warn "Verification script reported issues."
else
    info "verify-deployment.sh not found; skipping local verification."
fi

# ─── Done ─────────────────────────────────────────────────
echo
printf "${GREEN}${BOLD}✓ Shipped${NC} → https://anonyhealth.opssightai.com\n\n"

# Sync local main with the merged change.
info "Syncing local main..."
run git checkout main
run git pull origin main --quiet
ok "Local main updated. You're ready to start the next change."
