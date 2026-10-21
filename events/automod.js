const { Events, EmbedBuilder } = require('discord.js');
const { getConfig } = require('../utils');

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
    if (am.avertirMembre) { try { await message.author.send(`⚠️ Ton message sur **${message.guild.name}** a été supprimé car il contenait un mot interdit.`); } catch {} }
    if (am.salonLogsId) {
      const salonLogs = message.guild.channels.cache.get(am.salonLogsId);
      if (salonLogs) {
        const embed = new EmbedBuilder().setTitle('🛡️ Message supprimé').setColor(0xda3633)
          .addFields(
            { name: '👤 Membre', value: `<@${message.author.id}>`, inline: true },
            { name: '📍 Salon', value: `<#${message.channel.id}>`, inline: true },
            { name: '🚫 Mot', value: `\`${motTrouve}\``, inline: true },
          ).setTimestamp();
        await salonLogs.send({ embeds: [embed] });
      }
    }
  },
};
