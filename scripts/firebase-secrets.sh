#!/bin/bash
# Loads the app's secrets into Firebase App Hosting (Cloud Secret Manager) from .env.local, then
# asks for a demo password. Values are piped straight to the Firebase CLI and never printed.
#   bash scripts/firebase-secrets.sh
set -euo pipefail
cd "$(dirname "$0")/.."
PROJECT=cashflow-agent-demo
BACKEND=cashflow-agent

value_of() { grep -E "^$1=" .env.local | head -1 | cut -d= -f2- | sed -e 's/^"//' -e 's/"$//'; }

put() { # put <secret-name> <value>
  if [ -z "$2" ]; then echo "!! $1 is empty, skipping"; return 1; fi
  printf '%s' "$2" | firebase apphosting:secrets:set "$1" --project "$PROJECT" --force --data-file - >/dev/null
  echo "ok  $1"
}

cp apphosting.yaml /tmp/apphosting.yaml.bak   # --force may rewrite it; restored below
# AG Studio runs without a licence key (trial mode), so there is no secret for it.
put paypal-client-id   "$(value_of PAYPAL_CLIENT_ID)"
put paypal-secret      "$(value_of PAYPAL_SECRET)"
put openai-api-key     "$(value_of AG_STUDIO_OPENAI_API_KEY)"

read -r -s -p "Choose a demo password for judges (typing is hidden): " DEMO; echo
put demo-password "$DEMO"
cp /tmp/apphosting.yaml.bak apphosting.yaml

firebase apphosting:secrets:grantaccess paypal-client-id,paypal-secret,openai-api-key,demo-password \
  --backend "$BACKEND" --project "$PROJECT" >/dev/null
echo "All four secrets are set and the backend can read them."
