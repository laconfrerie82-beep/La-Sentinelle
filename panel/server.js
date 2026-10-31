require('dotenv').config();
const express = require('express');
const session = require('express-session');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { DEFAULT_EMBEDS } = require('../embedConfig');
const { getChaines, saveChaines, getNextId } = require('../chainesUtils');

const app = express();
app.set('trust proxy', 1);

const PORT = process.env.PORT || 3000;
const DISCORD_CLIENT_ID = process.env.CLIENT_ID;
const DISCORD_CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET;
const REDIRECT_URI = 'https://la-sentinelle-production.up.railway.app/auth/callback';
const API = 'https://discord.com/api/v10';
const bot = () => ({ headers: { Authorization: `Bot ${process.env.DISCORD_TOKEN}` } });

// ── Middlewares ──────────────────────────────────────────────
app.use(express.json({ limit: '1mb' }));
app.use(session({
  secret: process.env.SESSION_SECRET || 'jirito-secret',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 1000 * 60 * 60 * 24, httpOnly: true, sameSite: 'lax' },
}));

// L'ancienne page séparée d'édition d'embeds est remplacée par le dashboard
app.get(['/embeds', '/embeds.html'], (req, res) => res.redirect('/dashboard'));

app.use(express.static(path.join(__dirname, 'public'), {
  etag: false,
  maxAge: 0,
  setHeaders: (res) => res.setHeader('Cache-Control', 'no-store'),
}));

// ── Données ──────────────────────────────────────────────────
const DEFAULT_CONFIG = {
  bienvenue: { actif: false, salonId: '', message: 'Bienvenue sur le serveur {user} ! Tu es notre {count}ème membre.', mention: true, embed: true, mp: false },
  reglement: { salonId: '', messageId: '', roleAcceptationId: '', emoji: '✅', titre: 'Règlement du serveur', contenu: '' },
  automod: { actif: false, supprimerAuto: true, avertirMembre: true, salonLogsId: '', motsInterdits: [] },
  niveaux: { actif: false, xpParMessage: 15, xpParMinuteVocal: 8, cooldownMessages: 60, salonAnnonceId: '', recompenses: [] },
};

const isId = (v) => typeof v === 'string' && /^\d{5,25}$/.test(v);
const bool = (v) => v === true || v === 'true';

function readJson(file, fallback) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return fallback; }
}

function getConfig(guildId) {
  const file = path.join(__dirname, '../data/configs', `${guildId}.json`);
  const saved = readJson(file, {});
  const out = {};
  for (const k of Object.keys(DEFAULT_CONFIG)) out[k] = { ...DEFAULT_CONFIG[k], ...(saved[k] || {}) };
  return out;
}
function saveConfig(guildId, data) {
  const dir = path.join(__dirname, '../data/configs');
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, `${guildId}.json`), JSON.stringify(data, null, 2));
}
function getEmbeds(guildId) {
  const file = path.join(__dirname, '../data/embeds', `${guildId}.json`);
  const saved = readJson(file, {});
  const out = {};
  for (const k of Object.keys(DEFAULT_EMBEDS)) out[k] = { ...DEFAULT_EMBEDS[k], ...(saved[k] || {}) };
  return out;
}
function saveEmbeds(guildId, data) {
  const dir = path.join(__dirname, '../data/embeds');
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, `${guildId}.json`), JSON.stringify(data, null, 2));
}

// ── Sécurité ─────────────────────────────────────────────────
function canManage(g) {
  if (g.owner) return true;
  try {
    const p = BigInt(g.permissions);
    return (p & 0x8n) === 0x8n || (p & 0x20n) === 0x20n; // Administrateur ou Gérer le serveur
  } catch { return false; }
}

function requireAuth(req, res, next) {
  if (!req.session.user) {
    if (req.path.startsWith('/api/')) return res.status(401).json({ success: false, error: 'Session expirée' });
    return res.redirect('/login');
  }
  next();
}
function requireGuild(req, res, next) {
  if (!req.session.guildId) {
    if (req.path.startsWith('/api/')) return res.status(409).json({ success: false, error: 'Aucun serveur sélectionné' });
    return res.redirect('/select-server');
  }
  next();
}
const page = (file) => (req, res) => {
  res.set('Cache-Control', 'no-store');
  res.sendFile(path.join(__dirname, 'public', file));
};

// ── Authentification ─────────────────────────────────────────
app.get('/login', page('login.html'));

app.get('/auth/discord', (req, res) => {
  const url = `https://discord.com/oauth2/authorize?client_id=${DISCORD_CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&response_type=code&scope=identify+guilds`;
  res.redirect(url);
});

app.get('/auth/callback', async (req, res) => {
  const code = req.query.code;
  if (!code) return res.redirect('/login');
  try {
    const tokenRes = await axios.post(`${API}/oauth2/token`,
      new URLSearchParams({ client_id: DISCORD_CLIENT_ID, client_secret: DISCORD_CLIENT_SECRET, grant_type: 'authorization_code', code, redirect_uri: REDIRECT_URI }),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } });
    const auth = { headers: { Authorization: `Bearer ${tokenRes.data.access_token}` } };
    const userRes = await axios.get(`${API}/users/@me`, auth);
    const guildsRes = await axios.get(`${API}/users/@me/guilds`, auth);
    req.session.user = { id: userRes.data.id, username: userRes.data.username, avatar: userRes.data.avatar };
    req.session.guilds = guildsRes.data;
    req.session.guildId = null;
    res.redirect('/select-server');
  } catch (err) {
    console.error('Erreur OAuth:', err.response?.data || err.message);
    res.redirect('/login?error=1');
  }
});

app.get('/auth/logout', (req, res) => { req.session.destroy(() => res.redirect('/login')); });

// ── Choix du serveur ─────────────────────────────────────────
app.get('/select-server', requireAuth, page('select-server.html'));

app.get('/api/guilds', requireAuth, async (req, res) => {
  try {
    const botGuilds = await axios.get(`${API}/users/@me/guilds`, bot());
    const botIds = botGuilds.data.map(g => g.id);
    const list = (req.session.guilds || [])
      .filter(g => botIds.includes(g.id) && canManage(g))
      .map(g => ({ id: g.id, name: g.name, icon: g.icon }));
    res.json(list);
  } catch { res.json([]); }
});

app.post('/api/select-guild', requireAuth, async (req, res) => {
  const guildId = req.body.guildId;
  const g = (req.session.guilds || []).find(x => x.id === guildId);
  if (!isId(guildId) || !g || !canManage(g)) {
    return res.status(403).json({ success: false, error: 'Tu ne peux pas configurer ce serveur.' });
  }
  try {
    await axios.get(`${API}/guilds/${guildId}`, bot()); // le bot doit être présent
  } catch {
    return res.status(404).json({ success: false, error: "Le bot n'est pas sur ce serveur." });
  }
  req.session.guildId = guildId;
  res.json({ success: true });
});

// ── Pages ────────────────────────────────────────────────────
app.get('/dashboard', requireAuth, requireGuild, page('dashboard.html'));
app.get('/', (req, res) => res.redirect(req.session.user ? '/dashboard' : '/login'));

// ── API : infos ──────────────────────────────────────────────
app.get('/api/user', requireAuth, (req, res) => res.json(req.session.user));

app.get('/api/guild', requireAuth, requireGuild, (req, res) => {
  const g = (req.session.guilds || []).find(x => x.id === req.session.guildId);
  res.json({ id: req.session.guildId, name: g?.name || 'Serveur inconnu', icon: g?.icon || null });
});

app.get('/api/guild/channels', requireAuth, requireGuild, async (req, res) => {
  try {
    const r = await axios.get(`${API}/guilds/${req.session.guildId}/channels`, bot());
    const cats = Object.fromEntries(r.data.filter(c => c.type === 4).map(c => [c.id, c.name]));
    res.json(r.data.filter(c => c.type === 0 || c.type === 5)
      .sort((a, b) => a.position - b.position)
      .map(c => ({ id: c.id, name: c.name, category: cats[c.parent_id] || '' })));
  } catch { res.json([]); }
});

app.get('/api/guild/roles', requireAuth, requireGuild, async (req, res) => {
  try {
    const r = await axios.get(`${API}/guilds/${req.session.guildId}/roles`, bot());
    res.json(r.data.filter(x => x.id !== req.session.guildId && !x.managed)
      .sort((a, b) => b.position - a.position)
      .map(x => ({ id: x.id, name: x.name, color: x.color })));
  } catch { res.json([]); }
});

// ── API : configuration ──────────────────────────────────────
app.get('/api/config', requireAuth, requireGuild, (req, res) => res.json(getConfig(req.session.guildId)));

app.post('/api/config/bienvenue', requireAuth, requireGuild, (req, res) => {
  const config = getConfig(req.session.guildId);
  const b = req.body, t = config.bienvenue;
  if (b.actif !== undefined) t.actif = bool(b.actif);
  if (b.salonId !== undefined) t.salonId = String(b.salonId);
  if (b.message !== undefined) t.message = String(b.message).slice(0, 1500);
  if (b.mention !== undefined) t.mention = bool(b.mention);
  if (b.embed !== undefined) t.embed = bool(b.embed);
  if (b.mp !== undefined) t.mp = bool(b.mp);
  saveConfig(req.session.guildId, config);
  res.json({ success: true });
});

app.post('/api/config/reglement', requireAuth, requireGuild, (req, res) => {
  const config = getConfig(req.session.guildId);
  const b = req.body, t = config.reglement;
  if (b.titre !== undefined) t.titre = String(b.titre).slice(0, 200);
  if (b.contenu !== undefined) t.contenu = String(b.contenu).slice(0, 4000);
  if (b.roleAcceptationId !== undefined) t.roleAcceptationId = String(b.roleAcceptationId);
  if (b.emoji !== undefined && String(b.emoji).trim()) t.emoji = String(b.emoji).trim().slice(0, 16);
  saveConfig(req.session.guildId, config);
  res.json({ success: true });
});

app.post('/api/config/automod', requireAuth, requireGuild, (req, res) => {
  const config = getConfig(req.session.guildId);
  const b = req.body, t = config.automod;
  if (b.actif !== undefined) t.actif = bool(b.actif);
  if (b.supprimerAuto !== undefined) t.supprimerAuto = bool(b.supprimerAuto);
  if (b.avertirMembre !== undefined) t.avertirMembre = bool(b.avertirMembre);
  if (b.salonLogsId !== undefined) t.salonLogsId = String(b.salonLogsId);
  saveConfig(req.session.guildId, config);
  res.json({ success: true });
});

app.post('/api/config/automod/mot', requireAuth, requireGuild, (req, res) => {
  const config = getConfig(req.session.guildId);
  const mot = String(req.body.mot || '').toLowerCase().trim().slice(0, 100);
  if (!mot) return res.json({ success: false, error: 'Mot vide' });
  const list = config.automod.motsInterdits;
  if (req.body.action === 'ajouter' && !list.includes(mot)) list.push(mot);
  if (req.body.action === 'supprimer') config.automod.motsInterdits = list.filter(x => x !== mot);
  saveConfig(req.session.guildId, config);
  res.json({ success: true, mots: config.automod.motsInterdits });
});

app.post('/api/config/niveaux', requireAuth, requireGuild, (req, res) => {
  const config = getConfig(req.session.guildId);
  const b = req.body, t = config.niveaux;
  const int = (v, min, max) => Math.min(max, Math.max(min, parseInt(v, 10) || min));
  if (b.actif !== undefined) t.actif = bool(b.actif);
  if (b.xpParMessage !== undefined) t.xpParMessage = int(b.xpParMessage, 1, 1000);
  if (b.xpParMinuteVocal !== undefined) t.xpParMinuteVocal = int(b.xpParMinuteVocal, 1, 1000);
  if (b.cooldownMessages !== undefined) t.cooldownMessages = int(b.cooldownMessages, 0, 3600);
  if (b.salonAnnonceId !== undefined) t.salonAnnonceId = String(b.salonAnnonceId);
  if (Array.isArray(b.recompenses)) {
    t.recompenses = b.recompenses
      .filter(r => r && isId(String(r.roleId)) && parseInt(r.niveau, 10) > 0)
      .map(r => ({ niveau: parseInt(r.niveau, 10), roleId: String(r.roleId) }))
      .sort((a, c) => a.niveau - c.niveau)
      .slice(0, 50);
  }
  saveConfig(req.session.guildId, config);
  res.json({ success: true });
});

// ── API : embeds ─────────────────────────────────────────────
app.get('/api/embeds', requireAuth, requireGuild, (req, res) => res.json(getEmbeds(req.session.guildId)));
app.get('/api/embeds/defaults', requireAuth, (req, res) => res.json(DEFAULT_EMBEDS));

app.post('/api/embeds', requireAuth, requireGuild, (req, res) => {
  const incoming = req.body || {};
  const clean = getEmbeds(req.session.guildId);
  for (const mod of Object.keys(DEFAULT_EMBEDS)) {
    const e = incoming[mod];
    if (!e || typeof e !== 'object') continue;
    const str = (v, n) => String(v ?? '').slice(0, n);
    clean[mod] = {
      couleur: /^#[0-9a-fA-F]{6}$/.test(e.couleur) ? e.couleur : '#5865F2',
      titre: str(e.titre, 256),
      description: str(e.description, 4096),
      image: str(e.image, 500),
      thumbnail: ['aucun', 'avatar', 'serveur', 'custom'].includes(e.thumbnail) ? e.thumbnail : 'aucun',
      thumbnailUrl: str(e.thumbnailUrl, 500),
      footer: str(e.footer, 2048),
      footerIcon: ['aucun', 'serveur', 'custom'].includes(e.footerIcon) ? e.footerIcon : 'aucun',
      footerIconUrl: str(e.footerIconUrl, 500),
      timestamp: !!e.timestamp,
      champs: (Array.isArray(e.champs) ? e.champs : []).slice(0, 25).map(c => ({
        actif: !!c.actif, nom: str(c.nom, 256), valeur: str(c.valeur, 1024), inline: !!c.inline,
      })),
    };
  }
  saveEmbeds(req.session.guildId, clean);
  res.json({ success: true });
});

function fill(str, vars) {
  if (typeof str !== 'string') return '';
  let s = str;
  for (const [k, v] of Object.entries(vars)) s = s.split(`{${k}}`).join(String(v ?? ''));
  return s;
}
function cleanVars(v) {
  const out = {};
  if (v && typeof v === 'object') {
    for (const [k, val] of Object.entries(v)) {
      if (/^\w{1,30}$/.test(k) && (typeof val === 'string' || typeof val === 'number')) out[k] = String(val).slice(0, 4000);
    }
  }
  return out;
}
function toDiscordEmbed(cfg, vars) {
  const e = {};
  const color = parseInt(String(cfg.couleur || '#5865F2').replace('#', ''), 16);
  e.color = Number.isNaN(color) ? 0x5865f2 : color;
  const title = fill(cfg.titre, vars); if (title) e.title = title.slice(0, 256);
  const desc = fill(cfg.description, vars); if (desc) e.description = desc.slice(0, 4096);
  const img = fill(cfg.image, vars); if (/^https?:\/\//.test(img)) e.image = { url: img };
  let thumb = '';
  if (cfg.thumbnail === 'avatar') thumb = vars.avatarUrl || '';
  else if (cfg.thumbnail === 'serveur') thumb = vars.serveurIcon || '';
  else if (cfg.thumbnail === 'custom') thumb = cfg.thumbnailUrl || '';
  if (/^https?:\/\//.test(thumb)) e.thumbnail = { url: thumb };
  const fields = (cfg.champs || []).filter(c => c.actif).slice(0, 25).map(c => ({
    name: (fill(c.nom, vars) || '\u200b').slice(0, 256),
    value: (fill(c.valeur, vars) || '\u200b').slice(0, 1024),
    inline: !!c.inline,
  }));
  if (fields.length) e.fields = fields;
  const footer = fill(cfg.footer, vars);
  if (footer) {
    e.footer = { text: footer.slice(0, 2048) };
    if (cfg.footerIcon === 'serveur' && /^https?:\/\//.test(vars.serveurIcon || '')) e.footer.icon_url = vars.serveurIcon;
    else if (cfg.footerIcon === 'custom' && /^https?:\/\//.test(cfg.footerIconUrl || '')) e.footer.icon_url = cfg.footerIconUrl;
  }
  if (cfg.timestamp) e.timestamp = new Date().toISOString();
  return e;
}

const KEYCAPS = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

function friendlyError(err) {
  const d = err.response?.data;
  if (d?.code === 50001 || d?.code === 50013) {
    return "Le bot n'a pas accès à ce salon. Vérifie ses permissions : Voir le salon, Envoyer des messages, Intégrer des liens, Ajouter des réactions.";
  }
  if (d?.code === 10003) return 'Salon introuvable.';
  if (d?.errors) return `Discord a refusé l'embed : ${JSON.stringify(d.errors).slice(0, 300)}`;
  return d?.message || err.message;
}

app.post('/api/embeds/publier', requireAuth, requireGuild, async (req, res) => {
  const guildId = req.session.guildId;
  const { module: mod, salonId, variables, update, mentionRoleId, boutons, reactions } = req.body || {};
  const fail = (error, status = 400) => res.status(status).json({ success: false, error });

  if (!DEFAULT_EMBEDS[mod]) return fail('Module inconnu.');
  if (!isId(String(salonId))) return fail('Choisis un salon.');

  try {
    // Le salon doit appartenir au serveur configuré
    const ch = await axios.get(`${API}/channels/${salonId}`, bot());
    if (ch.data.guild_id !== guildId) return fail("Ce salon n'appartient pas à ce serveur.", 403);

    const config = getConfig(guildId);
    let vars = cleanVars(variables);
    if (mod === 'reglement') {
      vars = { ...vars, titre: config.reglement.titre, contenu: config.reglement.contenu, emoji: config.reglement.emoji };
    }
    const embed = toDiscordEmbed(getEmbeds(guildId)[mod], vars);
    if (!embed.title && !embed.description && !embed.fields) return fail("L'embed est vide : ajoute un titre, une description ou un champ.");

    const body = { embeds: [embed] };
    if (isId(String(mentionRoleId))) {
      body.content = `<@&${mentionRoleId}>`;
      body.allowed_mentions = { roles: [String(mentionRoleId)] };
    } else {
      body.allowed_mentions = { parse: [] };
    }
    if (Array.isArray(boutons) && boutons.length) {
      const links = boutons.slice(0, 5)
        .filter(b => b && /^https?:\/\//.test(b.url || ''))
        .map(b => ({ type: 2, style: 5, label: String(b.label || 'Lien').slice(0, 80), url: b.url }));
      if (links.length) body.components = [{ type: 1, components: links }];
    }

    // Mise à jour du règlement déjà publié
    if (mod === 'reglement' && update) {
      const r = config.reglement;
      if (!r.salonId || !r.messageId) return fail('Aucun règlement publié à mettre à jour.');
      await axios.patch(`${API}/channels/${r.salonId}/messages/${r.messageId}`, { embeds: [embed] }, bot());
      return res.json({ success: true, messageId: r.messageId });
    }

    const sent = await axios.post(`${API}/channels/${salonId}/messages`, body, bot());
    const messageId = sent.data.id;
    let warning;

    const emojis = mod === 'reglement'
      ? [config.reglement.emoji]
      : (Array.isArray(reactions) ? reactions.filter(x => KEYCAPS.includes(x)).slice(0, 10) : []);
    try {
      for (const emoji of emojis) {
        await axios.put(`${API}/channels/${salonId}/messages/${messageId}/reactions/${encodeURIComponent(emoji)}/@me`, null, bot());
        if (emojis.length > 1) await sleep(400);
      }
    } catch (err) {
      warning = `Message publié, mais la réaction n'a pas pu être ajoutée : ${friendlyError(err)}`;
    }

    if (mod === 'reglement') {
      config.reglement.salonId = String(salonId);
      config.reglement.messageId = messageId;
      saveConfig(guildId, config);
    }
    res.json({ success: true, messageId, warning });
  } catch (err) {
    console.error('Erreur publication embed:', err.response?.data || err.message);
    res.status(400).json({ success: false, error: friendlyError(err) });
  }
});

// ── API : chaînes ────────────────────────────────────────────
const URL_PLATEFORMES = { youtube: ['youtube.com', 'youtu.be'], twitch: ['twitch.tv'], tiktok: ['tiktok.com'] };

app.get('/api/chaines', requireAuth, requireGuild, (req, res) => res.json(getChaines(req.session.guildId)));

app.post('/api/chaines', requireAuth, requireGuild, (req, res) => {
  const b = req.body || {};
  const plateforme = String(b.plateforme || '');
  const nom = String(b.nom || '').trim().slice(0, 80);
  const url = String(b.url || '').trim().slice(0, 300);
  if (!URL_PLATEFORMES[plateforme]) return res.json({ success: false, error: 'Plateforme invalide.' });
  if (!nom) return res.json({ success: false, error: 'Donne un nom à la chaîne.' });
  let host = '';
  try { host = new URL(url).hostname.replace(/^www\./, ''); } catch { return res.json({ success: false, error: "L'URL n'est pas valide." }); }
  if (!URL_PLATEFORMES[plateforme].some(d => host === d || host.endsWith(`.${d}`))) {
    return res.json({ success: false, error: `Cette URL ne correspond pas à ${plateforme}.` });
  }
  const chaines = getChaines(req.session.guildId);
  if (chaines.find(c => c.url === url)) return res.json({ success: false, error: 'Cette chaîne est déjà enregistrée.' });
  chaines.push({
    id: getNextId(chaines), plateforme, nom, url,
    description: String(b.description || '').slice(0, 200),
    salonAnnonceId: isId(String(b.salonAnnonceId)) ? String(b.salonAnnonceId) : '',
    roleMentionId: isId(String(b.roleMentionId)) ? String(b.roleMentionId) : '',
    actif: true,
    ajouteLe: new Date().toISOString(),
  });
  saveChaines(req.session.guildId, chaines);
  res.json({ success: true, chaines });
});

app.delete('/api/chaines/:id', requireAuth, requireGuild, (req, res) => {
  const id = parseInt(req.params.id, 10);
  const chaines = getChaines(req.session.guildId).filter(c => c.id !== id);
  saveChaines(req.session.guildId, chaines);
  res.json({ success: true, chaines });
});

app.listen(PORT, () => console.log(`🌐 Panel web démarré sur le port ${PORT}`));
