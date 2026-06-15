#!/bin/bash
# Luna Bank — Set up Telegram Bot Webhook
#
# Run after deploying to Vercel:
#   bash scripts/setup-webhook.sh
#
# This sets the webhook URL so Telegram sends updates to /api/bot

BOT_TOKEN="8859860619:AAFwtBwOfpDUv565vUxZG32SI2Zo8BTolNU"
WEBHOOK_URL="https://luna-bank-app.vercel.app/api/bot"

echo "Setting webhook to: $WEBHOOK_URL"

curl -s "https://api.telegram.org/bot${BOT_TOKEN}/setWebhook?url=${WEBHOOK_URL}" | python3 -m json.tool 2>/dev/null || \
curl -s "https://api.telegram.org/bot${BOT_TOKEN}/setWebhook?url=${WEBHOOK_URL}"

echo ""
echo "Checking webhook info..."
curl -s "https://api.telegram.org/bot${BOT_TOKEN}/getWebhookInfo" | python3 -m json.tool 2>/dev/null || \
curl -s "https://api.telegram.org/bot${BOT_TOKEN}/getWebhookInfo"
