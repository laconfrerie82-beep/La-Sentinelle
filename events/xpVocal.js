const { Events, EmbedBuilder } = require('discord.js');
const { getConfig, getUserData, saveUserData, getNiveau } = require('../utils');
const vocauxActifs = new Map();

module.exports = {
  name: Events.VoiceStateUpdate,
  async execute(oldState, newState) {
    const userId = newState.id || oldState.id;
    const member = newState.member || oldState.member;
    if (!member || member.user.bot) return;
    const guildId = (newState.guild || oldState.guild).id;
    const config = getConfig(guildId);
    if (!config.niveaux.actif) return;
    if (!oldState.channelId && newState.channelId) { vocauxActifs.set(`${guildId}-${userId}`, Date.now()); }
    if (oldState.channelId && !newState.channelId) {
      const key = `${guildId}-${userId}`;
      const debut = vocauxActifs.get(key);
      if (!debut) return;
      vocauxActifs.delete(key);
      const minutes = Math.floor((Date.now() - debut) / 60000);
      if (minutes < 1) return;
      const userData = getUserData(guildId, userId);
      const ancienNiveau = getNiveau(userData.xp);
      userData.xp += minutes * config.niveaux.xpParMinuteVocal;
      userData.vocal += minutes;
      saveUserData(guildId, userId, userData);
      const nouveauNiveau = getNiveau(userData.xp);
      if (nouveauNiveau > ancienNiveau && config.niveaux.salonAnnonceId) {
        const guild = newState.guild || oldState.guild;
        const salon = guild.channels.cache.get(config.niveaux.salonAnnonceId);
        if (salon) {
          const embed = new EmbedBuilder().setTitle('🎉 Niveau supérieur !')
            .setDescription(`<@${userId}> passe au niveau **${nouveauNiveau}** grâce au vocal !`)
            .setColor(0x5865f2).setTimestamp();
          await salon.send({ embeds: [embed] });
        }
      }
    }
  },
};
