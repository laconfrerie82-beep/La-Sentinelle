const { Events } = require('discord.js');
const { getConfig, getEmbed, buildEmbed } = require('../utils');

module.exports = {
  name: Events.GuildMemberAdd,
  async execute(member) {
    const config = getConfig(member.guild.id);
    const bv = config.bienvenue;
    if (!bv.actif || !bv.salonId) return;
    const salon = member.guild.channels.cache.get(bv.salonId);
    if (!salon) return;

    const count = member.guild.memberCount;
    const msg = bv.message
      .replace('{user}', bv.mention ? `<@${member.id}>` : member.user.username)
      .replace('{count}', count)
      .replace('{serveur}', member.guild.name);

    if (bv.embed) {
      const embedConfig = getEmbed(member.guild.id, 'bienvenue');
      const embed = buildEmbed(embedConfig, {
        serveur: member.guild.name,
        message: msg,
        count: count,
        userId: member.id,
        avatarUrl: member.user.displayAvatarURL({ dynamic: true }),
        serveurIcon: member.guild.iconURL({ dynamic: true }),
      });
      await salon.send({ content: bv.mention ? `<@${member.id}>` : null, embeds: [embed] });
    } else {
      await salon.send(msg);
    }

    if (bv.mp) {
      try { await member.send(`👋 Bienvenue sur **${member.guild.name}** !`); } catch {}
    }
  },
};
