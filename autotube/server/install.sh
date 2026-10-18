#!/usr/bin/env bash
# Instalasi AutoTube di VPS Ubuntu (22.04/24.04) dalam satu perintah:
#   curl -fsSL https://raw.githubusercontent.com/MrUpink/MrUpink/ccr-202ca1bb-0e8qzt/autotube/server/install.sh | sudo bash
# Memasang Docker + Caddy (HTTPS otomatis), mengunduh AutoTube, menanyakan kunci API, lalu menjalankannya.
set -euo pipefail

REPO="https://github.com/MrUpink/MrUpink.git"
BRANCH="${AUTOTUBE_BRANCH:-ccr-202ca1bb-0e8qzt}"
DIR=/opt/autotube

if [ "$(id -u)" -ne 0 ]; then
  echo "Jalankan sebagai root: tambahkan 'sudo' di depan perintah." >&2
  exit 1
fi

ask() { # ask VAR "Pertanyaan" [default]
  local value
  read -r -p "$2${3:+ [$3]}: " value < /dev/tty
  printf -v "$1" '%s' "${value:-${3:-}}"
}

echo "== 1/4 Memasang Docker, Caddy, dan git =="
apt-get update -qq
apt-get install -y -qq ca-certificates curl git debian-keyring debian-archive-keyring apt-transport-https gnupg >/dev/null
if ! command -v docker >/dev/null; then
  curl -fsSL https://get.docker.com | sh >/dev/null
fi
if ! command -v caddy >/dev/null; then
  curl -1sLf https://dl.cloudsmith.io/public/caddy/stable/gpg.key | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
  curl -1sLf https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt > /etc/apt/sources.list.d/caddy-stable.list
  apt-get update -qq && apt-get install -y -qq caddy >/dev/null
fi

echo "== 2/4 Mengunduh AutoTube =="
if [ -d "$DIR/.git" ]; then
  git -C "$DIR" fetch -q origin "$BRANCH" && git -C "$DIR" checkout -q -B "$BRANCH" "origin/$BRANCH"
else
  git clone -q --depth 1 --branch "$BRANCH" "$REPO" "$DIR"
fi
cd "$DIR/autotube/server"

echo "== 3/4 Konfigurasi =="
if [ -f .env ]; then
  echo ".env sudah ada, dipakai ulang (hapus $DIR/autotube/server/.env untuk mengisi ulang)."
  DOMAIN=$(grep '^PUBLIC_URL=' .env | sed 's#PUBLIC_URL=https://##')
else
  ask DOMAIN "Domain untuk AutoTube (contoh: autotube.namaanda.my.id)"
  ask APP_TOKEN "Kata sandi aplikasi (kosongkan untuk dibuat otomatis)" ""
  [ -z "$APP_TOKEN" ] && APP_TOKEN=$(head -c 18 /dev/urandom | base64 | tr -d '/+=')
  ask ANTHROPIC_API_KEY "ANTHROPIC_API_KEY"
  ask YOUTUBE_API_KEY "YOUTUBE_API_KEY"
  ask PEXELS_API_KEY "PEXELS_API_KEY"
  ask YT_CLIENT_ID "YT_CLIENT_ID (OAuth client ID)"
  ask YT_CLIENT_SECRET "YT_CLIENT_SECRET"
  umask 077
  cat > .env <<EOF
APP_TOKEN=$APP_TOKEN
PUBLIC_URL=https://$DOMAIN
ANTHROPIC_API_KEY=$ANTHROPIC_API_KEY
CLAUDE_MODEL=claude-sonnet-5-5
YOUTUBE_API_KEY=$YOUTUBE_API_KEY
PEXELS_API_KEY=$PEXELS_API_KEY
YT_CLIENT_ID=$YT_CLIENT_ID
YT_CLIENT_SECRET=$YT_CLIENT_SECRET
EOF
fi

cat > /etc/caddy/Caddyfile <<EOF
$DOMAIN {
    reverse_proxy 127.0.0.1:8080
}
EOF
systemctl reload caddy || systemctl restart caddy

echo "== 4/4 Menjalankan AutoTube =="
docker compose up -d --build

echo
echo "Selesai! Buka aplikasi AutoTube di HP dan isi alamat server: https://$DOMAIN"
grep '^APP_TOKEN=' .env | sed 's/^APP_TOKEN=/Kata sandi aplikasi: /'
echo "Redirect URI untuk Google OAuth: https://$DOMAIN/oauth/callback"
echo "Update di kemudian hari: jalankan ulang perintah instalasi yang sama."
