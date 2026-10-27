const { Events } = require('discord.js');
const { getConfig, getUserData, saveUserData, getNiveau, getEmbed, buildEmbed } = require('../utils');

module.exports = {
  name: Events.MessageCreate,
  async execute(message) {
    if (message.author.bot || !message.guild) return;
    const config = getConfig(message.guild.id);
    if (!config.niveaux.actif) return;
    const now = Date.now();
    const userData = getUserData(message.guild.id, message.author.id);
    if (now - userData.lastMessage < config.niveaux.cooldownMessages * 1000) return;
    const ancienNiveau = getNiveau(userData.xp);
    userData.xp += config.niveaux.xpParMessage;
    userData.messages += 1;
    userData.lastMessage = now;
    const nouveauNiveau = getNiveau(userData.xp);
    saveUserData(message.guild.id, message.author.id, userData);
    if (nouveauNiveau > ancienNiveau && config.niveaux.salonAnnonceId) {
      const salon = message.guild.channels.cache.get(config.niveaux.salonAnnonceId);
      if (salon) {
        const embedConfig = getEmbed(message.guild.id, 'niveau');
        const embed = buildEmbed(embedConfig, {
          userId: message.author.id,
          niveau: nouveauNiveau,
          avatarUrl: message.author.displayAvatarURL({ dynamic: true }),
          serveur: message.guild.name,
        });
        await salon.send({ embeds: [embed] });
      }
      const recompense = config.niveaux.recompenses.find(r => r.niveau === nouveauNiveau && r.roleId);
      if (recompense) {
        const role = message.guild.roles.cache.get(recompense.roleId);
        if (role) { try { await message.member.roles.add(role); } catch {} }
      }
    }
  },
};
