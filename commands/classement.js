const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getXP, getNiveau } = require('../utils');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('classement')
    .setDescription('🏆 Affiche le classement XP du serveur'),

  async execute(interaction) {
    await interaction.deferReply();
    const xpData = getXP(interaction.guildId);
    const sorted = Object.entries(xpData).sort(([, a], [, b]) => b.xp - a.xp).slice(0, 10);
    if (sorted.length === 0) return interaction.editReply('❌ Aucun membre dans le classement.');
    const medals = ['🥇', '🥈', '🥉'];
    let description = '';
    for (let i = 0; i < sorted.length; i++) {
      const [userId, data] = sorted[i];
      const niveau = getNiveau(data.xp);
      const medal = medals[i] || `**${i + 1}.**`;
      let username;
      try { const user = await interaction.client.users.fetch(userId); username = user.username; } catch { username = 'Inconnu'; }
      description += `${medal} **${username}** — Niveau ${niveau} · ${data.xp} XP\n`;
    }
    const embed = new EmbedBuilder().setTitle('🏆 Classement XP').setDescription(description).setColor(0xf0b232).setTimestamp();
    await interaction.editReply({ embeds: [embed] });
  },
};
