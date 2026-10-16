# 🌐 Jirito Bot — Panel Web

## Configuration requise dans Railway (Variables d'environnement)

| Variable | Valeur |
|---|---|
| `DISCORD_TOKEN` | Token de ton bot |
| `CLIENT_ID` | Application ID Discord |
| `DISCORD_CLIENT_SECRET` | Client Secret Discord |
| `GUILD_ID` | ID de ton serveur Discord |
| `PANEL_URL` | URL du panel (ex: https://jirito-panel.up.railway.app) |
| `SESSION_SECRET` | N'importe quelle chaîne aléatoire |
| `PANEL_PORT` | 3000 |

## Déploiement sur Railway

1. Crée un **nouveau projet Railway** (séparé du bot)
2. Connecte le même repo GitHub
3. Dans Settings → **Root Directory** → mets `panel`
4. Ajoute toutes les variables ci-dessus
5. L'URL du panel sera dans Settings → Domains
