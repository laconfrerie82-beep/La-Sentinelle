const { Events } = require('discord.js');
const { getConfig } = require('../utils');

module.exports = {
  name: Events.MessageReactionAdd,
  async execute(reaction, user) {
    if (user.bot) return;
    if (reaction.partial) { try { await reaction.fetch(); } catch { return; } }
    const config = getConfig(reaction.message.guild.id);
    const reg = config.reglement;
    if (!reg.messageId || !reg.roleAcceptationId) return;
    if (reaction.message.id !== reg.messageId) return;
    if (reaction.emoji.name !== reg.emoji) return;
    const guild = reaction.message.guild;
    const member = await guild.members.fetch(user.id).catch(() => null);
    if (!member) return;
    const role = guild.roles.cache.get(reg.roleAcceptationId);
    if (!role) return;
    try { await member.roles.add(role); } catch {}
  },
};
