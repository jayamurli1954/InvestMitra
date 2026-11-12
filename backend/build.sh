#!/usr/bin/env bash
# Render build command for the InvestMitra backend.
# Set Render's Build Command to:  bash build.sh
#
# Two separate pip steps on purpose: fyers-apiv3 pins AWS-Lambda deps that
# conflict with the app's boto3/jmespath if resolved in one pass, so the base
# requirements install first, then the broker SDKs install (and downgrade boto3,
# which is safe — the app never imports boto3). Omit the second line to deploy
# without broker support.
set -e
pip install -r requirements.txt
pip install -r requirements-brokers.txt
