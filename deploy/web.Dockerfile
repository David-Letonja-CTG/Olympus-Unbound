# syntax=docker/dockerfile:1
# The web server in front of the game server: Caddy for HTTPS and the proxy (deploy/Caddyfile). The game's own files
# stay on GitHub Pages (D21). Build from the repository root:
#   docker buildx build -f deploy/web.Dockerfile --platform linux/arm64,linux/amd64 .

FROM caddy:2
COPY deploy/Caddyfile /etc/caddy/Caddyfile
