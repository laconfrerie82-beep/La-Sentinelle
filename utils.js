const fs = require('fs');
const path = require('path');

const CONFIGS_DIR = path.join(__dirname, 'data/configs');
const XP_DIR = path.join(__dirname, 'data/xp');

// Créer les dossiers si inexistants
if (!fs.existsSync(CONFIGS_DIR)) fs.mkdirSync(CONFIGS_DIR, { recursive: true });
if (!fs.existsSync(XP_DIR)) fs.mkdirSync(XP_DIR, { recursive: true });

const DEFAULT_CONFIG = {
  bienvenue: {
    actif: false,
    salonId: '',
    message: 'Bienvenue sur le serveur {user} ! Tu es notre {count}ème membre.',
    mention: true,
    embed: true,
    mp: false
  },
  reglement: {
    salonId: '',
    messageId: '',
    roleAcceptationId: '',
    emoji: '✅',
    titre: 'Règlement du serveur',
    contenu: '**1. Respectez-vous mutuellement**\nAucune insulte, harcèlement ou discrimination.'
  },
  automod: {
    actif: false,
    supprimerAuto: true,
    avertirMembre: true,
    salonLogsId: '',
    motsInterdits: []
  },
  niveaux: {
    actif: false,
    xpParMessage: 15,
    xpParMinuteVocal: 8,
    cooldownMessages: 60,
    salonAnnonceId: '',
    recompenses: []
  }
};

function getConfig(guildId) {
  const filePath = path.join(CONFIGS_DIR, `${guildId}.json`);
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, JSON.stringify(DEFAULT_CONFIG, null, 2));
  }
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function saveConfig(guildId, data) {
  const filePath = path.join(CONFIGS_DIR, `${guildId}.json`);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

function getXP(guildId) {
  const filePath = path.join(XP_DIR, `${guildId}.json`);
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, '{}');
  }
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function saveXP(guildId, data) {
  const filePath = path.join(XP_DIR, `${guildId}.json`);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

function getNiveau(xp) {
  return Math.floor(0.1 * Math.sqrt(xp));
}

function getXPPourNiveau(niveau) {
  return Math.pow(niveau / 0.1, 2);
}

function getUserData(guildId, userId) {
  const xp = getXP(guildId);
  if (!xp[userId]) {
    xp[userId] = { xp: 0, niveau: 0, messages: 0, vocal: 0, lastMessage: 0 };
    saveXP(guildId, xp);
  }
  return xp[userId];
}

function saveUserData(guildId, userId, data) {
  const xp = getXP(guildId);
  xp[userId] = data;
  saveXP(guildId, xp);
}

module.exports = {
  getConfig, saveConfig,
  getXP, saveXP,
  getNiveau, getXPPourNiveau,
  getUserData, saveUserData
};
