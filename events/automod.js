const { Events, EmbedBuilder } = require('discord.js');
const { getConfig } = require('../utils');

module.exports = {
  name: Events.MessageCreate,
  async execute(message) {
    if (message.author.bot) return;
    if (!message.guild) return;

    const config = getConfig();
    const automod = config.automod;

    if (!automod.actif) return;

    const contenu = message.content.toLowerCase();
    const motTrouve = automod.motsInterdits.find(mot =>
      contenu.includes(mot.toLowerCase())
    );

    if (!motTrouve) return;

    // Supprimer le message
    if (automod.supprimerAuto) {
      try { await message.delete(); } catch {}
    }

    // Avertir le membre en MP
    if (automod.avertirMembre) {
      try {
        await message.author.send(
          `⚠️ **Avertissement automatique**\nTon message sur **${message.guild.name}** a été supprimé car il contenait un mot interdit.\nMerci de respecter le règlement du serveur.`
        );
      } catch {}
    }

    // Log dans le salon de logs
    if (automod.salonLogsId) {
      const salonLogs = message.guild.channels.cache.get(automod.salonLogsId);
      if (salonLogs) {
        const embed = new EmbedBuilder()
          .setTitle('🛡️ Auto-Modération — Message supprimé')
          .setColor(0xda3633)
          .addFields(
            { name: '👤 Membre', value: `<@${message.author.id}> (${message.author.tag})`, inline: true },
            { name: '📍 Salon', value: `<#${message.channel.id}>`, inline: true },
            { name: '🚫 Mot détecté', value: `\`${motTrouve}\``, inline: true },
            { name: '💬 Message', value: message.content.slice(0, 200) || '(vide)', inline: false },
          )
          .setFooter({ text: 'Jirito Bot — AutoMod' })
          .setTimestamp();
        await salonLogs.send({ embeds: [embed] });
      }
    }
  },
};
