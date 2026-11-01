// Surveillance automatique des chaînes : YouTube (flux RSS public, sans clé) et Twitch (API gratuite).
// TikTok n'a pas d'API officielle : les annonces TikTok restent manuelles.
const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { getChaines, saveChaines } = require('./chainesUtils');
const { getEmbed, buildEmbed } = require('./utils');
const { DEFAULT_EMBEDS } = require('./embedConfig');

const YT_INTERVAL = 5 * 60 * 1000;
const TW_INTERVAL = 2 * 60 * 1000;
const MAX_AGE_MS = 48 * 3600 * 1000; // on n'annonce pas les vidéos plus vieilles que 48 h
const MAX_PER_CHECK = 3;             // au plus 3 annonces d'un coup par chaîne
const OFFLINE_POLLS = 3;             // un live n'est « terminé » qu'après 3 vérifications hors ligne
const UA = 'Mozilla/5.0 (compatible; JiritoBot/2.0)';
const UC = /^UC[\w-]{22}$/;

const log = (...a) => console.log('[surveillance]', ...a);
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const warned = new Set();
const warnOnce = (key, msg) => { if (!warned.has(key)) { warned.add(key); log(msg); } };

async function http(url, opts, deps) {
  const f = (deps && deps.fetch) || fetch;
  return f(url, { ...opts, signal: AbortSignal.timeout(10000) });
}

// ── Données ──────────────────────────────────────────────────
function updateEtat(guildId, id, patch) {
  const list = getChaines(guildId);
  const c = list.find(x => x.id === id);
  if (!c) return null;
  c.etat = { ...(c.etat || {}), ...patch };
  saveChaines(guildId, list);
  return c;
}
const getChaine = (guildId, id) => getChaines(guildId).find(x => x.id === id);

// ── Envoi dans Discord ───────────────────────────────────────
async function annoncer(client, guildId, chaine, d) {
  const channel = await client.channels.fetch(chaine.salonAnnonceId).catch(() => null);
  if (!channel || typeof channel.send !== 'function') throw new Error('salon introuvable ou inaccessible');
  if (channel.guildId && channel.guildId !== guildId) throw new Error("le salon n'appartient pas à ce serveur");

  const cfg = getEmbed(guildId, 'annonce_chaine');
  const embed = buildEmbed(cfg, { serveur: '', ...d.vars });
  if (d.couleur && cfg.couleur === DEFAULT_EMBEDS.annonce_chaine.couleur) embed.setColor(d.couleur);

  const row = new ActionRowBuilder().addComponents(
    d.boutons.map(b => new ButtonBuilder().setLabel(b.label).setStyle(ButtonStyle.Link).setURL(b.url)));
  const role = chaine.roleMentionId;
  await channel.send({
    content: role ? `<@&${role}>` : undefined,
    embeds: [embed],
    components: [row],
    allowedMentions: role ? { roles: [role] } : { parse: [] },
  });
}

// ── YouTube ──────────────────────────────────────────────────
const decode = (s) => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"')
  .replace(/&apos;/g, "'").replace(/&#39;/g, "'").replace(/&amp;/g, '&');

function parseFeed(xml) {
  const entries = [];
  for (const m of String(xml).matchAll(/<entry>([\s\S]*?)<\/entry>/g)) {
    const b = m[1];
    const get = (re) => { const x = b.match(re); return x ? decode(x[1].trim()) : ''; };
    const id = get(/<yt:videoId>([^<]+)<\/yt:videoId>/);
    if (!id) continue;
    entries.push({
      id,
      titre: get(/<title>([^<]*)<\/title>/),
      publie: Date.parse(get(/<published>([^<]+)<\/published>/)) || 0,
    });
  }
  return entries.sort((a, b) => b.publie - a.publie);
}

async function resolveYtId(chaine, deps) {
  if (chaine.etat && UC.test(chaine.etat.ytId || '')) return chaine.etat.ytId;
  let u;
  try { u = new URL(chaine.url); } catch { return null; }
  const direct = u.pathname.match(/^\/channel\/(UC[\w-]{22})/);
  if (direct) return direct[1];
  if (!/^(www\.|m\.)?youtube\.com$/.test(u.hostname)) return null;
  const res = await http(chaine.url, {
    headers: { 'User-Agent': UA, 'Accept-Language': 'fr,en;q=0.8', Cookie: 'SOCS=CAI; CONSENT=YES+1' },
    redirect: 'follow',
  }, deps);
  if (!res.ok) return null;
  const html = await res.text();
  const x = html.match(/<link rel="canonical" href="https:\/\/www\.youtube\.com\/channel\/(UC[\w-]{22})"/)
    || html.match(/<meta itemprop="(?:identifier|channelId)" content="(UC[\w-]{22})"/)
    || html.match(/"externalId":"(UC[\w-]{22})"/);
  return x ? x[1] : null;
}

async function fetchFeed(ytId, deps) {
  const res = await http(`https://www.youtube.com/feeds/videos.xml?channel_id=${ytId}`, { headers: { 'User-Agent': UA } }, deps);
  if (!res.ok) { log(`YouTube : flux indisponible pour ${ytId} (HTTP ${res.status})`); return null; }
  return parseFeed(await res.text());
}

async function traiterYoutube(client, guildId, id, entries, now) {
  const chaine = getChaine(guildId, id);
  if (!chaine || !entries.length) return;
  const vus = chaine.etat && chaine.etat.vus;
  if (!Array.isArray(vus)) { // première vérification : on mémorise l'existant sans rien annoncer
    updateEtat(guildId, id, { vus: entries.slice(0, 30).map(e => e.id) });
    return;
  }
  const inconnus = entries.filter(e => !vus.includes(e.id));
  if (!inconnus.length) return;
  const aAnnoncer = inconnus.filter(e => now - e.publie < MAX_AGE_MS).slice(0, MAX_PER_CHECK).reverse();
  const traites = inconnus.filter(e => !aAnnoncer.includes(e)).map(e => e.id); // trop vieux ou en trop : ignorés

  for (const e of aAnnoncer) {
    const url = `https://www.youtube.com/watch?v=${e.id}`;
    try {
      await annoncer(client, guildId, chaine, {
        vars: {
          emoji: '📺', titre: e.titre, description: `Nouvelle vidéo de **${chaine.nom}** !`,
          miniature: `https://i.ytimg.com/vi/${e.id}/hqdefault.jpg`, nomChaine: chaine.nom, urlChaine: chaine.url, url,
        },
        boutons: [{ label: '▶ Regarder', url }, { label: "🔔 S'abonner", url: chaine.url }],
      });
      traites.push(e.id);
      log(`YouTube : « ${e.titre} » annoncée pour ${chaine.nom}`);
    } catch (err) {
      warnOnce(`yt:${guildId}:${e.id}`, `YouTube : envoi impossible pour ${chaine.nom} (${err.message}), nouvel essai au prochain passage`);
    }
  }
  if (traites.length) updateEtat(guildId, id, { vus: [...traites, ...vus].slice(0, 40) });
}

async function checkYouTube(client, deps = {}) {
  const now = (deps.now || Date.now)();
  const jobs = [];
  for (const guildId of client.guilds.cache.keys()) {
    for (const c of getChaines(guildId)) {
      if (c.plateforme !== 'youtube' || c.actif === false) continue;
      if (!c.salonAnnonceId) { warnOnce(`nosalon:${guildId}:${c.id}`, `« ${c.nom} » n'a pas de salon d'annonces : aucune annonce automatique.`); continue; }
      jobs.push({ guildId, id: c.id });
    }
  }
  const feeds = new Map();
  for (const job of jobs) {
    try {
      const chaine = getChaine(job.guildId, job.id);
      if (!chaine) continue;
      const ytId = await resolveYtId(chaine, deps);
      if (!ytId) { warnOnce(`ytid:${job.guildId}:${job.id}`, `YouTube : identifiant introuvable pour « ${chaine.nom} » (${chaine.url}). Utilise un lien de chaîne, pas un lien de vidéo.`); continue; }
      if (!chaine.etat || chaine.etat.ytId !== ytId) updateEtat(job.guildId, job.id, { ytId });
      if (!feeds.has(ytId)) { feeds.set(ytId, await fetchFeed(ytId, deps)); await sleep(deps.pause ?? 300); }
      const entries = feeds.get(ytId);
      if (entries) await traiterYoutube(client, job.guildId, job.id, entries, now);
    } catch (e) { log('YouTube :', e.message); }
  }
}

// ── Twitch ───────────────────────────────────────────────────
let twToken = null;
const twCreds = (deps) => {
  const c = (deps && deps.creds) || { id: process.env.TWITCH_CLIENT_ID, secret: process.env.TWITCH_CLIENT_SECRET };
  return c.id && c.secret ? c : null;
};

async function getTwitchToken(deps, creds, force) {
  const now = ((deps && deps.now) || Date.now)();
  if (!force && twToken && twToken.exp > now + 60000) return twToken.token;
  const res = await http('https://id.twitch.tv/oauth2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: creds.id, client_secret: creds.secret, grant_type: 'client_credentials' }),
  }, deps);
  if (!res.ok) throw new Error(`jeton Twitch refusé (HTTP ${res.status}) : vérifie TWITCH_CLIENT_ID et TWITCH_CLIENT_SECRET`);
  const j = await res.json();
  twToken = { token: j.access_token, exp: now + (j.expires_in || 3600) * 1000 };
  return twToken.token;
}

async function fetchStreams(logins, deps, creds) {
  const map = new Map();
  for (let i = 0; i < logins.length; i += 100) {
    const qs = logins.slice(i, i + 100).map(l => `user_login=${encodeURIComponent(l)}`).join('&');
    let res;
    for (let essai = 0; essai < 2; essai++) {
      const token = await getTwitchToken(deps, creds, essai === 1);
      res = await http(`https://api.twitch.tv/helix/streams?first=100&${qs}`, { headers: { 'Client-Id': creds.id, Authorization: `Bearer ${token}` } }, deps);
      if (res.status !== 401) break;
    }
    if (!res.ok) throw new Error(`API Twitch indisponible (HTTP ${res.status})`);
    for (const s of (await res.json()).data || []) map.set(String(s.user_login).toLowerCase(), s);
  }
  return map;
}

const twLogin = (url) => {
  try { const l = new URL(url).pathname.split('/').filter(Boolean)[0] || ''; return /^\w{3,25}$/.test(l) ? l.toLowerCase() : null; } catch { return null; }
};

async function checkTwitch(client, deps = {}) {
  const creds = twCreds(deps);
  const jobs = [];
  for (const guildId of client.guilds.cache.keys()) {
    for (const c of getChaines(guildId)) {
      if (c.plateforme !== 'twitch' || c.actif === false) continue;
      if (!c.salonAnnonceId) { warnOnce(`nosalon:${guildId}:${c.id}`, `« ${c.nom} » n'a pas de salon d'annonces : aucune annonce automatique.`); continue; }
      const login = twLogin(c.url);
      if (!login) { warnOnce(`twlogin:${guildId}:${c.id}`, `Twitch : lien invalide pour « ${c.nom} » (${c.url}).`); continue; }
      jobs.push({ guildId, id: c.id, login });
    }
  }
  if (!jobs.length) return;
  if (!creds) { warnOnce('twcreds', 'Twitch : TWITCH_CLIENT_ID / TWITCH_CLIENT_SECRET absents sur Railway, les lives ne sont pas surveillés.'); return; }

  const streams = await fetchStreams([...new Set(jobs.map(j => j.login))], deps, creds);
  for (const job of jobs) {
    try {
      const chaine = getChaine(job.guildId, job.id);
      if (!chaine) continue;
      const etat = chaine.etat || {};
      const s = streams.get(job.login);
      if (s) {
        const nouveau = etat.live === false || (etat.live === true && etat.streamId && etat.streamId !== s.id);
        if (etat.live === undefined) { updateEtat(job.guildId, job.id, { live: true, streamId: s.id, off: 0 }); continue; } // déjà en live à la 1re vérification : pas d'annonce
        if (nouveau) {
          const url = `https://www.twitch.tv/${job.login}`;
          try {
            await annoncer(client, job.guildId, chaine, {
              couleur: 0x9146ff,
              vars: {
                emoji: '🟣', titre: s.title || `${chaine.nom} est en direct`,
                description: `🔴 **${chaine.nom}** est en direct${s.game_name ? ` sur **${s.game_name}**` : ''} !`,
                miniature: String(s.thumbnail_url || '').replace('{width}', '1280').replace('{height}', '720') + `?t=${((deps.now || Date.now)())}`,
                nomChaine: chaine.nom, urlChaine: chaine.url, url,
              },
              boutons: [{ label: '🟣 Regarder le live', url }, { label: '🔔 Suivre', url: chaine.url }],
            });
            log(`Twitch : live de ${chaine.nom} annoncé`);
          } catch (err) {
            warnOnce(`tw:${job.guildId}:${s.id}`, `Twitch : envoi impossible pour ${chaine.nom} (${err.message})`);
            continue; // on réessaiera au prochain passage
          }
        }
        if (etat.live !== true || etat.streamId !== s.id || etat.off) updateEtat(job.guildId, job.id, { live: true, streamId: s.id, off: 0 });
      } else if (etat.live === undefined) {
        updateEtat(job.guildId, job.id, { live: false, off: 0 });
      } else if (etat.live) {
        const off = (etat.off || 0) + 1;
        updateEtat(job.guildId, job.id, off >= OFFLINE_POLLS ? { live: false, off: 0 } : { off });
      }
    } catch (e) { log('Twitch :', e.message); }
  }
}

// ── Démarrage ────────────────────────────────────────────────
let started = false;
function start(client) {
  if (started) return;
  started = true;
  log(`Surveillance active : YouTube toutes les ${YT_INTERVAL / 60000} min, Twitch toutes les ${TW_INTERVAL / 60000} min.`);
  const run = (fn, ms) => {
    let busy = false;
    const tick = async () => {
      if (busy) return;
      busy = true;
      try { await fn(client); } catch (e) { log(`${fn.name} :`, e.message); } finally { busy = false; }
    };
    setTimeout(tick, 30000);
    setInterval(tick, ms);
  };
  run(checkYouTube, YT_INTERVAL);
  run(checkTwitch, TW_INTERVAL);
}

module.exports = { start, checkYouTube, checkTwitch, parseFeed, resolveYtId, _reset: () => { twToken = null; warned.clear(); } };
