const fs = require('fs');
const path = require('path');

const CONFIG_PATH = path.join(__dirname, 'data/config.json');

function getConfig() {
  return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
}

function saveConfig(data) {
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(data, null, 2));
}

module.exports = { getConfig, saveConfig };
