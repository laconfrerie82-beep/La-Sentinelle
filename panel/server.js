require('dotenv').config();
const express = require('express');
const session = require('express-session');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const DISCORD_CLIENT_ID = process.env.CLIENT_ID;
const DISCORD_CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET;
const REDIRECT_URI = 'https://la-sentinelle-production.up.railway.app/auth/callback';

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
  secret: process.env.SESSION_SECRET || 'jirito-secret',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 1000 * 60 * 60 * 24 }
}));

const { DEFAULT_EMBEDS } = require('../embedConfig');

const DEFAULT_CONFIG = {
  bienvenue: { actif: false, salonId: '', message: 'Bienvenue {user} !', mention: true, embed: true, mp: false },
  reglement: { salonId: '', messageId: '', roleAcceptationId: '', emoji: '✅', titre: 'Règlement', contenu: '' },
  automod: { actif: false, supprimerAuto: true, avertirMembre: true, salonLogsId: '', motsInterdits: [] },
  niveaux: { actif: false, xpParMessage: 15, xpParMinuteVocal: 8, cooldownMessages: 60, salonAnnonceId: '', recompenses: [] }
};

function getConfig(guildId) {
  const dir = path.join(__dirname, '../data/configs');
  const filePath = path.join(dir, `${guildId}.json`);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(filePath)) return JSON.parse(JSON.stringify(DEFAULT_CONFIG));
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}
function saveConfig(guildId, data) {
  const dir = path.join(__dirname, '../data/configs');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, `${guildId}.json`), JSON.stringify(data, null, 2));
}
function getEmbeds(guildId) {
  const dir = path.join(__dirname, '../data/embeds');
  const filePath = path.join(dir, `${guildId}.json`);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(filePath)) return JSON.parse(JSON.stringify(DEFAULT_EMBEDS));
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}
function saveEmbeds(guildId, data) {
  const dir = path.join(__dirname, '../data/embeds');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, `${guildId}.json`), JSON.stringify(data, null, 2));
}
function requireAuth(req, res, next) {
  if (!req.session.user) return res.redirect('/login');
  next();
}
function requireGuild(req, res, next) {
  if (!req.session.guildId) return res.redirect('/select-server');
  next();
}

app.get('/login', (req, res) => res.sendFile(path.join(__dirname, 'public/login.html')));
app.get('/auth/discord', (req, res) => {
  const url = `https://discord.com/api/oauth2/authorize?client_id=${DISCORD_CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&response_type=code&scope=identify+guilds`;
  res.redirect(url);
});
app.get('/auth/callback', async (req, res) => {
  const code = req.query.code;
  if (!code) return res.redirect('/login');
  try {
    const tokenRes = await axios.post('https://discord.com/api/oauth2/token',
      new URLSearchParams({ client_id: DISCORD_CLIENT_ID, client_secret: DISCORD_CLIENT_SECRET, grant_type: 'authorization_code', code, redirect_uri: REDIRECT_URI }),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );
    const { access_token } = tokenRes.data;
    const userRes = await axios.get('https://discord.com/api/users/@me', { headers: { Authorization: `Bearer ${access_token}` } });
    const guildsRes = await axios.get('https://discord.com/api/users/@me/guilds', { headers: { Authorization: `Bearer ${access_token}` } });
    req.session.user = { id: userRes.data.id, username: userRes.data.username, avatar: userRes.data.avatar };
    req.session.guilds = guildsRes.data;
    res.redirect('/select-server');
  } catch (err) {
    console.error('Erreur OAuth:', err.response?.data || err.message);
    res.redirect('/login?error=1');
  }
});
app.get('/auth/logout', (req, res) => { req.session.destroy(); res.redirect('/login'); });

app.get('/select-server', requireAuth, (req, res) => res.sendFile(path.join(__dirname, 'public/select-server.html')));
app.get('/api/guilds', requireAuth, async (req, res) => {
  try {
    const botGuildsRes = await axios.get('https://discord.com/api/users/@me/guilds', { headers: { Authorization: `Bot ${process.env.DISCORD_TOKEN}` } });
    const botGuildIds = botGuildsRes.data.map(g => g.id);
    const userGuilds = req.session.guilds || [];
    const commonGuilds = userGuilds.filter(g => {
      const hasPerms = (BigInt(g.permissions) & BigInt(0x20)) === BigInt(0x20);
      return botGuildIds.includes(g.id) && hasPerms;
    }).map(g => ({ id: g.id, name: g.name, icon: g.icon }));
    res.json(commonGuilds);
  } catch (err) { res.json([]); }
});
app.post('/api/select-guild', requireAuth, (req, res) => {
  req.session.guildId = req.body.guildId;
  res.json({ success: true });
});
app.get('/api/guild', requireAuth, requireGuild, async (req, res) => {
  try {
    const guilds = req.session.guilds || [];
    const guild = guilds.find(g => g.id === req.session.guildId);
    res.json({ id: req.session.guildId, name: guild?.name || 'Serveur inconnu', icon: guild?.icon || null });
  } catch (err) {
    res.json({ id: req.session.guildId, name: 'Serveur inconnu', icon: null });
  }
});

app.get('/dashboard', requireAuth, requireGuild, (req, res) => res.sendFile(path.join(__dirname, 'public/dashboard.html')));
app.get('/embeds', requireAuth, requireGuild, (req, res) => res.sendFile(path.join(__dirname, 'public/embeds.html')));
app.get('/', (req, res) => { if (req.session.user) return res.redirect('/dashboard'); res.redirect('/login'); });

app.get('/api/user', requireAuth, (req, res) => res.json(req.session.user));
app.get('/api/config', requireAuth, requireGuild, (req, res) => res.json(getConfig(req.session.guildId)));
app.post('/api/config/bienvenue', requireAuth, requireGuild, (req, res) => {
  const config = getConfig(req.session.guildId);
  const { actif, salonId, message, mention, embed, mp } = req.body;
  if (actif !== undefined) config.bienvenue.actif = actif === 'true' || actif === true;
  if (salonId !== undefined) config.bienvenue.salonId = salonId;
  if (message !== undefined) config.bienvenue.message = message;
  if (mention !== undefined) config.bienvenue.mention = mention === 'true' || mention === true;
  if (embed !== undefined) config.bienvenue.embed = embed === 'true' || embed === true;
  if (mp !== undefined) config.bienvenue.mp = mp === 'true' || mp === true;
  saveConfig(req.session.guildId, config);
  res.json({ success: true });
});
app.post('/api/config/reglement', requireAuth, requireGuild, (req, res) => {
  const config = getConfig(req.session.guildId);
  const { titre, contenu, roleAcceptationId } = req.body;
  if (titre !== undefined) config.reglement.titre = titre;
  if (contenu !== undefined) config.reglement.contenu = contenu;
  if (roleAcceptationId !== undefined) config.reglement.roleAcceptationId = roleAcceptationId;
  saveConfig(req.session.guildId, config);
  res.json({ success: true });
});
app.post('/api/config/automod', requireAuth, requireGuild, (req, res) => {
  const config = getConfig(req.session.guildId);
  const { actif, supprimerAuto, avertirMembre, salonLogsId } = req.body;
  if (actif !== undefined) config.automod.actif = actif === 'true' || actif === true;
  if (supprimerAuto !== undefined) config.automod.supprimerAuto = supprimerAuto === 'true' || supprimerAuto === true;
  if (avertirMembre !== undefined) config.automod.avertirMembre = avertirMembre === 'true' || avertirMembre === true;
  if (salonLogsId !== undefined) config.automod.salonLogsId = salonLogsId;
  saveConfig(req.session.guildId, config);
  res.json({ success: true });
});
app.post('/api/config/automod/mot', requireAuth, requireGuild, (req, res) => {
  const config = getConfig(req.session.guildId);
  const { action, mot } = req.body;
  const m = mot?.toLowerCase().trim();
  if (!m) return res.json({ success: false });
  if (action === 'ajouter') { if (!config.automod.motsInterdits.includes(m)) config.automod.motsInterdits.push(m); }
  else if (action === 'supprimer') { config.automod.motsInterdits = config.automod.motsInterdits.filter(x => x !== m); }
  saveConfig(req.session.guildId, config);
  res.json({ success: true, mots: config.automod.motsInterdits });
});
app.post('/api/config/niveaux', requireAuth, requireGuild, (req, res) => {
  const config = getConfig(req.session.guildId);
  const { actif, xpParMessage, xpParMinuteVocal, cooldownMessages, salonAnnonceId } = req.body;
  if (actif !== undefined) config.niveaux.actif = actif === 'true' || actif === true;
  if (xpParMessage !== undefined) config.niveaux.xpParMessage = parseInt(xpParMessage);
  if (xpParMinuteVocal !== undefined) config.niveaux.xpParMinuteVocal = parseInt(xpParMinuteVocal);
  if (cooldownMessages !== undefined) config.niveaux.cooldownMessages = parseInt(cooldownMessages);
  if (salonAnnonceId !== undefined) config.niveaux.salonAnnonceId = salonAnnonceId;
  saveConfig(req.session.guildId, config);
  res.json({ success: true });
});
app.get('/api/embeds', requireAuth, requireGuild, (req, res) => res.json(getEmbeds(req.session.guildId)));
app.post('/api/embeds', requireAuth, requireGuild, (req, res) => {
  saveEmbeds(req.session.guildId, req.body);
  res.json({ success: true });
});
app.get('/api/embeds/defaults', (req, res) => res.json(DEFAULT_EMBEDS));
app.post('/api/embeds/publier', requireAuth, requireGuild, async (req, res) => {
  const { salonId, module } = req.body;
  if (!salonId) return res.json({ success: false, error: 'Salon manquant' });

  try {
    const embedData = getEmbeds(req.session.guildId);
    const config = embedData[module];
    if (!config) return res.json({ success: false, error: 'Module introuvable' });

    const axios = require('axios');
    const color = parseInt(config.couleur.replace('#', ''), 16);

    const embed = {
      title: config.titre || null,
      description: config.description || null,
      color: color || 5793266,
      fields: (config.champs || []).filter(c => c.actif).map(c => ({
        name: c.nom, value: c.valeur || '\u200b', inline: c.inline
      })),
      footer: config.footer ? { text: config.footer } : null,
      timestamp: config.timestamp ? new Date().toISOString() : null,
      image: config.image ? { url: config.image } : null,
    };

    await axios.post(
      `https://discord.com/api/channels/${salonId}/messages`,
      { embeds: [embed] },
      { headers: { Authorization: `Bot ${process.env.DISCORD_TOKEN}`, 'Content-Type': 'application/json' } }
    );

    res.json({ success: true });
  } catch (err) {
    console.error('Erreur publication embed:', err.response?.data || err.message);
    res.json({ success: false, error: err.response?.data?.message || err.message });
  }
});
app.listen(PORT, () => console.log(`🌐 Panel web démarré sur le port ${PORT}`));
