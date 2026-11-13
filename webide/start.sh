#!/bin/sh
set -eu
if [ -z "${JAVA_HOME:-}" ]; then
  if [ -x /opt/homebrew/opt/openjdk@21/bin/java ]; then JAVA_HOME=/opt/homebrew/opt/openjdk@21
  elif [ -x /usr/libexec/java_home ]; then JAVA_HOME=$(/usr/libexec/java_home -v 21)
  else JAVA_HOME=$(dirname "$(dirname "$(readlink -f "$(command -v javac)")")"); fi
fi
export JAVA_HOME
# macOS AWT uses the login session. On Linux give each worker a virtual display when available.
if [ -z "${BJ4WEB_SWING_DISPLAY:-}" ] && [ "$(uname -s)" = Darwin ]; then
  export BJ4WEB_SWING_DISPLAY=1
fi
exec python3 "$(dirname "$0")/server.py"
