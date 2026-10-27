const fs = require('fs');
const path = require('path');

const CONFIGS_DIR = path.join(__dirname, 'data/configs');
const XP_DIR = path.join(__dirname, 'data/xp');
const EMBEDS_DIR = path.join(__dirname, 'data/embeds');

if (!fs.existsSync(CONFIGS_DIR)) fs.mkdirSync(CONFIGS_DIR, { recursive: true });
if (!fs.existsSync(XP_DIR)) fs.mkdirSync(XP_DIR, { recursive: true });
if (!fs.existsSync(EMBEDS_DIR)) fs.mkdirSync(EMBEDS_DIR, { recursive: true });

const DEFAULT_CONFIG = {
  bienvenue: { actif: false, salonId: '', message: 'Bienvenue sur le serveur {user} ! Tu es notre {count}ème membre.', mention: true, embed: true, mp: false },
  reglement: { salonId: '', messageId: '', roleAcceptationId: '', emoji: '✅', titre: 'Règlement du serveur', contenu: '**1. Respectez-vous mutuellement**\nAucune insulte, harcèlement ou discrimination.' },
  automod: { actif: false, supprimerAuto: true, avertirMembre: true, salonLogsId: '', motsInterdits: [] },
  niveaux: { actif: false, xpParMessage: 15, xpParMinuteVocal: 8, cooldownMessages: 60, salonAnnonceId: '', recompenses: [] }
};

function getConfig(guildId) {
  const filePath = path.join(CONFIGS_DIR, `${guildId}.json`);
  if (!fs.existsSync(filePath)) fs.writeFileSync(filePath, JSON.stringify(DEFAULT_CONFIG, null, 2));
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}
function saveConfig(guildId, data) {
  fs.writeFileSync(path.join(CONFIGS_DIR, `${guildId}.json`), JSON.stringify(data, null, 2));
}
function getXP(guildId) {
  const filePath = path.join(XP_DIR, `${guildId}.json`);
  if (!fs.existsSync(filePath)) fs.writeFileSync(filePath, '{}');
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}
function saveXP(guildId, data) {
  fs.writeFileSync(path.join(XP_DIR, `${guildId}.json`), JSON.stringify(data, null, 2));
}
function getNiveau(xp) { return Math.floor(0.1 * Math.sqrt(xp)); }
function getXPPourNiveau(niveau) { return Math.pow(niveau / 0.1, 2); }
function getUserData(guildId, userId) {
  const xp = getXP(guildId);
  if (!xp[userId]) { xp[userId] = { xp: 0, niveau: 0, messages: 0, vocal: 0, lastMessage: 0 }; saveXP(guildId, xp); }
  return xp[userId];
}
function saveUserData(guildId, userId, data) {
  const xp = getXP(guildId);
  xp[userId] = data;
  saveXP(guildId, xp);
}

const { DEFAULT_EMBEDS } = require('./embedConfig');

function getEmbeds(guildId) {
  const filePath = path.join(EMBEDS_DIR, `${guildId}.json`);
  if (!fs.existsSync(filePath)) fs.writeFileSync(filePath, JSON.stringify(DEFAULT_EMBEDS, null, 2));
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}
function saveEmbeds(guildId, data) {
  fs.writeFileSync(path.join(EMBEDS_DIR, `${guildId}.json`), JSON.stringify(data, null, 2));
}
function getEmbed(guildId, module) {
  const embeds = getEmbeds(guildId);
  return embeds[module] || DEFAULT_EMBEDS[module];
}
function buildEmbed(config, variables = {}) {
  const { EmbedBuilder } = require('discord.js');
  const embed = new EmbedBuilder();
  function replace(str) {
    if (!str) return str;
    return Object.entries(variables).reduce((s, [k, v]) => s.replaceAll(`{${k}}`, v || ''), str);
  }
  try { embed.setColor(config.couleur || '#5865F2'); } catch { embed.setColor('#5865F2'); }
  if (config.titre) embed.setTitle(replace(config.titre));
  if (config.description) embed.setDescription(replace(config.description));
  if (config.image) { const img = replace(config.image); if (img && img.startsWith('http')) embed.setImage(img); }
  if (config.thumbnail === 'avatar' && variables.avatarUrl) embed.setThumbnail(variables.avatarUrl);
  else if (config.thumbnail === 'serveur' && variables.serveurIcon) embed.setThumbnail(variables.serveurIcon);
  else if (config.thumbnail === 'custom' && config.thumbnailUrl) embed.setThumbnail(config.thumbnailUrl);
  if (config.champs) {
    for (const champ of config.champs) {
      if (champ.actif) embed.addFields({ name: replace(champ.nom), value: replace(champ.valeur) || '\u200b', inline: champ.inline });
    }
  }
  if (config.footer) {
    let footerIcon;
    if (config.footerIcon === 'serveur' && variables.serveurIcon) footerIcon = variables.serveurIcon;
    else if (config.footerIcon === 'custom' && config.footerIconUrl) footerIcon = config.footerIconUrl;
    embed.setFooter({ text: replace(config.footer), iconURL: footerIcon });
  }
  if (config.timestamp) embed.setTimestamp();
  return embed;
}

module.exports = { getConfig, saveConfig, getXP, saveXP, getNiveau, getXPPourNiveau, getUserData, saveUserData, getEmbeds, saveEmbeds, getEmbed, buildEmbed };
