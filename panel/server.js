require('dotenv').config();
const express = require('express');
const session = require('express-session');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PANEL_PORT || 3000;

const DISCORD_CLIENT_ID = process.env.CLIENT_ID;
const DISCORD_CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET;
const REDIRECT_URI = const REDIRECT_URI = 'https://la-sentinelle-production.up.railway.app/auth/callback';
const GUILD_ID = process.env.GUILD_ID;
const ROLES_AUTORISES = ['Modérateur', 'Fondateur'];

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
  secret: process.env.SESSION_SECRET || 'jirito-secret-panel',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 1000 * 60 * 60 * 24 }
}));

// Helpers config
function getConfig() {
  return JSON.parse(fs.readFileSync(path.join(__dirname, '../data/config.json'), 'utf8'));
}
function saveConfig(data) {
  fs.writeFileSync(path.join(__dirname, '../data/config.json'), JSON.stringify(data, null, 2));
}

// Middleware auth
function requireAuth(req, res, next) {
  if (!req.session.user) return res.redirect('/login');
  next();
}

// ── AUTH ROUTES ──────────────────────────────────────────────

app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/login.html'));
});

app.get('/auth/discord', (req, res) => {
  const url = `https://discord.com/api/oauth2/authorize?client_id=${DISCORD_CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&response_type=code&scope=identify+guilds.members.read`;
  res.redirect(url);
});

app.get('/auth/callback', async (req, res) => {
  const code = req.query.code;
  if (!code) return res.redirect('/login');

  try {
    // Échange du code contre un token
    const tokenRes = await axios.post('https://discord.com/api/oauth2/token',
      new URLSearchParams({
        client_id: DISCORD_CLIENT_ID,
        client_secret: DISCORD_CLIENT_SECRET,
        grant_type: 'authorization_code',
        code,
        redirect_uri: REDIRECT_URI,
      }),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );

    const { access_token } = tokenRes.data;

    // Infos utilisateur
    const userRes = await axios.get('https://discord.com/api/users/@me', {
      headers: { Authorization: `Bearer ${access_token}` }
    });

    // Rôles sur le serveur
    const memberRes = await axios.get(`https://discord.com/api/users/@me/guilds/${GUILD_ID}/member`, {
      headers: { Authorization: `Bearer ${access_token}` }
    });

    const member = memberRes.data;
    const rolesServeur = member.roles || [];

    // Vérifier si proprio du serveur ou modérateur
    const guildRes = await axios.get(`https://discord.com/api/guilds/${GUILD_ID}`, {
      headers: { Authorization: `Bot ${process.env.DISCORD_TOKEN}` }
    });

    const isOwner = guildRes.data.owner_id === userRes.data.id;

    // Récupérer les rôles du serveur pour trouver les IDs
    const rolesGuildRes = await axios.get(`https://discord.com/api/guilds/${GUILD_ID}/roles`, {
      headers: { Authorization: `Bot ${process.env.DISCORD_TOKEN}` }
    });

    const rolesAutorisesIds = rolesGuildRes.data
      .filter(r => ROLES_AUTORISES.includes(r.name))
      .map(r => r.id);

    const aAcces = isOwner || rolesServeur.some(r => rolesAutorisesIds.includes(r));

    if (!aAcces) {
      return res.send(`
        <html><body style="background:#1e1f22;color:#fff;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;flex-direction:column;gap:16px">
          <h2>❌ Accès refusé</h2>
          <p>Tu n'as pas les permissions nécessaires pour accéder au panel.</p>
          <a href="/login" style="color:#5865f2">Retour</a>
        </body></html>
      `);
    }

    req.session.user = {
      id: userRes.data.id,
      username: userRes.data.username,
      avatar: userRes.data.avatar,
      isOwner,
    };

    res.redirect('/dashboard');
  } catch (err) {
    console.error('Erreur OAuth:', err.response?.data || err.message);
    res.redirect('/login?error=1');
  }
});

app.get('/auth/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/login');
});

// ── DASHBOARD ────────────────────────────────────────────────

app.get('/dashboard', requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, 'public/dashboard.html'));
});

app.get('/', (req, res) => {
  if (req.session.user) return res.redirect('/dashboard');
  res.redirect('/login');
});

// ── API ROUTES ───────────────────────────────────────────────

app.get('/api/user', requireAuth, (req, res) => {
  res.json(req.session.user);
});

app.get('/api/config', requireAuth, (req, res) => {
  res.json(getConfig());
});

app.post('/api/config/bienvenue', requireAuth, (req, res) => {
  const config = getConfig();
  const { actif, salonId, message, mention, embed, mp } = req.body;
  if (actif !== undefined) config.bienvenue.actif = actif === 'true' || actif === true;
  if (salonId !== undefined) config.bienvenue.salonId = salonId;
  if (message !== undefined) config.bienvenue.message = message;
  if (mention !== undefined) config.bienvenue.mention = mention === 'true' || mention === true;
  if (embed !== undefined) config.bienvenue.embed = embed === 'true' || embed === true;
  if (mp !== undefined) config.bienvenue.mp = mp === 'true' || mp === true;
  saveConfig(config);
  res.json({ success: true });
});

app.post('/api/config/reglement', requireAuth, (req, res) => {
  const config = getConfig();
  const { titre, contenu, roleAcceptationId } = req.body;
  if (titre !== undefined) config.reglement.titre = titre;
  if (contenu !== undefined) config.reglement.contenu = contenu;
  if (roleAcceptationId !== undefined) config.reglement.roleAcceptationId = roleAcceptationId;
  saveConfig(config);
  res.json({ success: true });
});

app.post('/api/config/automod', requireAuth, (req, res) => {
  const config = getConfig();
  const { actif, supprimerAuto, avertirMembre, salonLogsId } = req.body;
  if (actif !== undefined) config.automod.actif = actif === 'true' || actif === true;
  if (supprimerAuto !== undefined) config.automod.supprimerAuto = supprimerAuto === 'true' || supprimerAuto === true;
  if (avertirMembre !== undefined) config.automod.avertirMembre = avertirMembre === 'true' || avertirMembre === true;
  if (salonLogsId !== undefined) config.automod.salonLogsId = salonLogsId;
  saveConfig(config);
  res.json({ success: true });
});

app.post('/api/config/automod/mot', requireAuth, (req, res) => {
  const config = getConfig();
  const { action, mot } = req.body;
  const m = mot?.toLowerCase().trim();
  if (!m) return res.json({ success: false, error: 'Mot vide' });
  if (action === 'ajouter') {
    if (!config.automod.motsInterdits.includes(m)) config.automod.motsInterdits.push(m);
  } else if (action === 'supprimer') {
    config.automod.motsInterdits = config.automod.motsInterdits.filter(x => x !== m);
  }
  saveConfig(config);
  res.json({ success: true, mots: config.automod.motsInterdits });
});

app.post('/api/config/niveaux', requireAuth, (req, res) => {
  const config = getConfig();
  const { actif, xpParMessage, xpParMinuteVocal, cooldownMessages, salonAnnonceId } = req.body;
  if (actif !== undefined) config.niveaux.actif = actif === 'true' || actif === true;
  if (xpParMessage !== undefined) config.niveaux.xpParMessage = parseInt(xpParMessage);
  if (xpParMinuteVocal !== undefined) config.niveaux.xpParMinuteVocal = parseInt(xpParMinuteVocal);
  if (cooldownMessages !== undefined) config.niveaux.cooldownMessages = parseInt(cooldownMessages);
  if (salonAnnonceId !== undefined) config.niveaux.salonAnnonceId = salonAnnonceId;
  saveConfig(config);
  res.json({ success: true });
});

app.listen(PORT, () => {
  console.log(`🌐 Panel web démarré sur le port ${PORT}`);
});
