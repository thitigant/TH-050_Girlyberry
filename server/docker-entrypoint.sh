#!/bin/sh
set -e

# ------------------------------------------------------------------------------
# Container entrypoint for UniPulse (Cloud Run & Docker)
# Hands control to the CMD via exec so the process becomes PID 1 and receives
# SIGTERM properly from Cloud Run for graceful shutdown.
# ------------------------------------------------------------------------------
exec "$@"
