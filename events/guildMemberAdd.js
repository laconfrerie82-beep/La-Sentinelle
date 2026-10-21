const { Events, EmbedBuilder } = require('discord.js');
const { getConfig } = require('../utils');

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
      .replace('{count}', count).replace('{serveur}', member.guild.name);
    if (bv.embed) {
      const embed = new EmbedBuilder().setTitle(`👋 Bienvenue sur ${member.guild.name} !`)
        .setDescription(msg).setColor(0x5865f2)
        .setThumbnail(member.user.displayAvatarURL({ dynamic: true })).setTimestamp();
      await salon.send({ embeds: [embed] });
    } else await salon.send(msg);
    if (bv.mp) { try { await member.send(`👋 Bienvenue sur **${member.guild.name}** !`); } catch {} }
  },
};
