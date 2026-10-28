const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('panel')
    .setDescription('🌐 Obtenir le lien du panel de configuration'),

  async execute(interaction) {
    const embed = new EmbedBuilder()
      .setTitle('🌐 Panel de configuration')
      .setDescription('Clique sur le lien ci-dessous pour accéder au panel de configuration du bot !')
      .setColor(0x5865f2)
      .addFields(
        { name: '🔗 Lien', value: 'https://la-sentinelle-production.up.railway.app', inline: false },
        { name: '🔒 Accès', value: 'Réservé aux administrateurs et modérateurs', inline: false },
      )
      .setFooter({ text: 'Jirito Bot — Panel Web' })
      .setTimestamp();

    await interaction.reply({ embeds: [embed], ephemeral: true });
  },
};