#!/bin/bash
set -euo pipefail

if ! command -v aws >/dev/null 2>&1; then
  echo "AWS CLI is required but was not found on PATH."
  exit 1
fi

resolve_profile() {
  if [ -n "${AWS_PROFILE:-}" ]; then
    return
  fi

  if [ -n "${LENGLE_AWS_PROFILE:-}" ]; then
    export AWS_PROFILE="${LENGLE_AWS_PROFILE}"
    return
  fi

  if aws configure list-profiles 2>/dev/null | grep -qx "lengle"; then
    export AWS_PROFILE="lengle"
    return
  fi

  if aws configure list-profiles 2>/dev/null | grep -qx "default"; then
    export AWS_PROFILE="default"
  fi
}

ensure_aws_auth() {
  resolve_profile

  if aws sts get-caller-identity >/dev/null 2>&1; then
    return
  fi

  if [ -n "${AWS_PROFILE:-}" ]; then
    aws sso login --profile "${AWS_PROFILE}" >/dev/null 2>&1 || true
  fi

  if ! aws sts get-caller-identity >/dev/null 2>&1; then
    echo "Unable to authenticate with AWS CLI."
    if [ -n "${AWS_PROFILE:-}" ]; then
      echo "Checked profile: ${AWS_PROFILE}"
      echo "Set LENGLE_AWS_PROFILE to override, or refresh the profile session."
    else
      echo "No AWS profile was resolved. Set AWS_PROFILE or LENGLE_AWS_PROFILE."
    fi
    exit 1
  fi

  if [ -n "${AWS_PROFILE:-}" ]; then
    echo "Using AWS profile: ${AWS_PROFILE}"
  fi
}