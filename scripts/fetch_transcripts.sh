#!/usr/bin/env bash
set -euo pipefail

TARGET_DIR="${TRANSCRIPTS_HOST_DIR:-./data/lenny-transcripts}"
SOURCE_URL="${TRANSCRIPTS_SOURCE_URL:-https://github.com/ChatPRD/lennys-podcast-transcripts.git}"

if [ -d "$TARGET_DIR/.git" ]; then
  echo "Updating transcript archive in $TARGET_DIR"
  git -C "$TARGET_DIR" pull --ff-only
else
  if [ -e "$TARGET_DIR" ] && [ "$(find "$TARGET_DIR" -mindepth 1 -maxdepth 1 | head -n 1)" ]; then
    echo "Error: $TARGET_DIR exists and is not an empty Git checkout." >&2
    echo "Set TRANSCRIPTS_HOST_DIR to an empty path or an existing compatible transcript checkout." >&2
    exit 1
  fi

  mkdir -p "$(dirname "$TARGET_DIR")"
  echo "Downloading transcript archive to $TARGET_DIR"
  git clone "$SOURCE_URL" "$TARGET_DIR"
fi

episode_count="$(find "$TARGET_DIR/episodes" -mindepth 1 -maxdepth 1 -type d 2>/dev/null | wc -l | tr -d ' ')"
echo "Transcript archive ready: $episode_count episode directories found."
