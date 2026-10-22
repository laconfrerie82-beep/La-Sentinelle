const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { getChaines, saveChaines } = require('../chainesUtils');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('chaine-supprimer')
    .setDescription('🗑️ Supprimer une chaîne de la liste')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addIntegerOption(opt => opt.setName('id').setDescription('ID de la chaîne (visible avec /chaines)').setRequired(true)),

  async execute(interaction) {
    const id = interaction.options.getInteger('id');
    const chaines = getChaines(interaction.guildId);
    const index = chaines.findIndex(c => c.id === id);

    if (index === -1) {
      return interaction.reply({ content: `❌ Aucune chaîne avec l'ID **#${id}**.`, ephemeral: true });
    }

    const removed = chaines.splice(index, 1)[0];
    saveChaines(interaction.guildId, chaines);

    await interaction.reply({
      content: `✅ La chaîne **${removed.nom}** a été supprimée.`,
      ephemeral: true,
    });
  },
};
