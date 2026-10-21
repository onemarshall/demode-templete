#!/bin/bash
set -euo pipefail

# Set SMTP environment variables
export SMTP_HOST="smtp.email.iamstudios.cc"  # Replace with your SMTP server
export SMTP_PORT="465"               # Common SMTP ports: 25, 465, 587
export SMTP_SECURE="false"           # true for port 465, false for others
export SMTP_USER="usesend"     # Your SMTP username
export SMTP_PASSWORD=${EMAIL_USESEND_API_KEY} # Your SMTP password

# Run the test script
bun run scripts/email/test-email-smtp.ts
