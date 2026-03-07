#!/bin/bash
# Reference: GitLab GraphQL API for fetching sprint timelogs
# Source: colleague's script for getting time spent per sprint
#
# This uses the currentUser.timelogs query which fetches both
# issue and merge request timelogs with date range filtering.
# This is the preferred approach over REST /projects/:id/timelogs
# because it doesn't require iterating projects and handles
# MR timelogs too.
#
# Usage: ./gitlab-sprint-timelogs.sh 2025-07-28 2025-08-11
# Requires: GITLAB_TOKEN env var or edit TOKEN below
# Requires: curl, jq

TOKEN="${GITLAB_TOKEN:-"SET_YOUR_TOKEN_HERE"}"
GITLAB_HOST="${GITLAB_HOST:-"gitlab.com"}"

START="$1"
END="$2"

if [ -z "$START" ] || [ -z "$END" ]; then
  echo "Usage: $0 START_DATE END_DATE"
  echo "Example: $0 2025-07-28 2025-08-11"
  exit 1
fi

response=$(curl -s -X POST "https://${GITLAB_HOST}/api/graphql" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"query\":\"query { currentUser { timelogs(first:50, sort: SPENT_AT_DESC, startDate: \\\"$START\\\", endDate: \\\"$END\\\") { nodes { timeSpent spentAt issue { title webUrl } mergeRequest { title webUrl } } } } }\"}")

echo "$response" | jq -r '
  .data.currentUser.timelogs.nodes
  | map({
      spentAt,
      title: (.issue.title // .mergeRequest.title),
      webUrl: (.issue.webUrl // .mergeRequest.webUrl),
      hours: (.timeSpent / 3600)
    })
  | sort_by(.spentAt)
  | .[]
  | "\(.spentAt) | \(.title) | \(.webUrl) | \(((.hours * 100) | round / 100))h"
'

echo "$response" | jq -r '
  .data.currentUser.timelogs.nodes
  | map(.timeSpent / 3600)
  | add
  | (.*100 | round / 100)
  | "TOTAL HOURS: \(.)h"
'
