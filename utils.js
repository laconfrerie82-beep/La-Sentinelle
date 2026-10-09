const fs = require('fs');
const path = require('path');

const CONFIG_PATH = path.join(__dirname, 'data/config.json');
const XP_PATH = path.join(__dirname, 'data/xp.json');

function getConfig() {
  return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
}

function saveConfig(data) {
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(data, null, 2));
}

function getXP() {
  return JSON.parse(fs.readFileSync(XP_PATH, 'utf8'));
}

function saveXP(data) {
  fs.writeFileSync(XP_PATH, JSON.stringify(data, null, 2));
}

function getNiveau(xp) {
  return Math.floor(0.1 * Math.sqrt(xp));
}

function getXPPourNiveau(niveau) {
  return Math.pow(niveau / 0.1, 2);
}

function getUserData(userId) {
  const xp = getXP();
  if (!xp[userId]) {
    xp[userId] = { xp: 0, niveau: 0, messages: 0, vocal: 0, lastMessage: 0 };
    saveXP(xp);
  }
  return xp[userId];
}

function saveUserData(userId, data) {
  const xp = getXP();
  xp[userId] = data;
  saveXP(xp);
}

module.exports = { getConfig, saveConfig, getXP, saveXP, getNiveau, getXPPourNiveau, getUserData, saveUserData };
