const { Events } = require('discord.js');
const { getConfig, getEmbed, buildEmbed } = require('../utils');

module.exports = {
  name: Events.MessageCreate,
  async execute(message) {
    if (message.author.bot || !message.guild) return;
    const config = getConfig(message.guild.id);
    const am = config.automod;
    if (!am.actif) return;
    const contenu = message.content.toLowerCase();
    const motTrouve = am.motsInterdits.find(mot => contenu.includes(mot.toLowerCase()));
    if (!motTrouve) return;
    if (am.supprimerAuto) { try { await message.delete(); } catch {} }
    if (am.avertirMembre) {
      try { await message.author.send(`⚠️ Ton message sur **${message.guild.name}** a été supprimé car il contenait un mot interdit.`); } catch {}
    }
    if (am.salonLogsId) {
      const salonLogs = message.guild.channels.cache.get(am.salonLogsId);
      if (salonLogs) {
        const embedConfig = getEmbed(message.guild.id, 'automod');
        const embed = buildEmbed(embedConfig, {
          userId: message.author.id,
          salonId: message.channel.id,
          mot: motTrouve,
          serveur: message.guild.name,
        });
        await salonLogs.send({ embeds: [embed] });
      }
    }
  },
};
