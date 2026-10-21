const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getUserData, getNiveau, getXPPourNiveau } = require('../utils');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('niveau')
    .setDescription('📊 Affiche ton niveau et ton XP')
    .addUserOption(opt => opt.setName('membre').setDescription('Voir le niveau d\'un autre membre').setRequired(false)),

  async execute(interaction) {
    const cible = interaction.options.getUser('membre') || interaction.user;
    const userData = getUserData(interaction.guildId, cible.id);
    const niveau = getNiveau(userData.xp);
    const xpNiveauActuel = getXPPourNiveau(niveau);
    const xpProchain = getXPPourNiveau(niveau + 1);
    const progression = Math.floor(((userData.xp - xpNiveauActuel) / (xpProchain - xpNiveauActuel)) * 100);
    const barre = '█'.repeat(Math.floor(progression / 5)) + '░'.repeat(20 - Math.floor(progression / 5));

    const embed = new EmbedBuilder()
      .setTitle(`📊 Niveau de ${cible.username}`)
      .setColor(0x5865f2)
      .setThumbnail(cible.displayAvatarURL({ dynamic: true }))
      .addFields(
        { name: '🏆 Niveau', value: `**${niveau}**`, inline: true },
        { name: '✨ XP Total', value: `**${userData.xp}**`, inline: true },
        { name: '💬 Messages', value: `**${userData.messages}**`, inline: true },
        { name: '🎙️ Vocal', value: `**${userData.vocal} min**`, inline: true },
        { name: '📈 Progression', value: `\`${barre}\` ${progression}%`, inline: false },
      ).setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },
};
