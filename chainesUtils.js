const fs = require('fs');
const path = require('path');

const CHAINES_DIR = path.join(__dirname, 'data/chaines');

if (!fs.existsSync(CHAINES_DIR)) fs.mkdirSync(CHAINES_DIR, { recursive: true });

function getChaines(guildId) {
  const filePath = path.join(CHAINES_DIR, `${guildId}.json`);
  if (!fs.existsSync(filePath)) return [];
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function saveChaines(guildId, data) {
  const filePath = path.join(CHAINES_DIR, `${guildId}.json`);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

function getNextId(chaines) {
  if (chaines.length === 0) return 1;
  return Math.max(...chaines.map(c => c.id)) + 1;
}

module.exports = { getChaines, saveChaines, getNextId };
