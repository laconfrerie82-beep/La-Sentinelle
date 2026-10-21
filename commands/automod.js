const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { getConfig, saveConfig } = require('../utils');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('automod')
    .setDescription('🛡️ Gestion de l\'auto-modération')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand(sub => sub.setName('config').setDescription('Configurer')
      .addBooleanOption(opt => opt.setName('actif').setDescription('Activer/désactiver').setRequired(false))
      .addBooleanOption(opt => opt.setName('supprimer').setDescription('Supprimer auto ?').setRequired(false))
      .addBooleanOption(opt => opt.setName('avertir').setDescription('Avertir en MP ?').setRequired(false))
      .addChannelOption(opt => opt.setName('logs').setDescription('Salon de logs').setRequired(false)))
    .addSubcommand(sub => sub.setName('ajouter').setDescription('Ajouter un mot interdit')
      .addStringOption(opt => opt.setName('mot').setDescription('Mot').setRequired(true)))
    .addSubcommand(sub => sub.setName('supprimer').setDescription('Retirer un mot interdit')
      .addStringOption(opt => opt.setName('mot').setDescription('Mot').setRequired(true)))
    .addSubcommand(sub => sub.setName('liste').setDescription('Voir les mots interdits')),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const config = getConfig(interaction.guildId);
    const am = config.automod;
    if (sub === 'config') {
      const actif = interaction.options.getBoolean('actif');
      const supprimer = interaction.options.getBoolean('supprimer');
      const avertir = interaction.options.getBoolean('avertir');
      const logs = interaction.options.getChannel('logs');
      if (actif !== null) am.actif = actif;
      if (supprimer !== null) am.supprimerAuto = supprimer;
      if (avertir !== null) am.avertirMembre = avertir;
      if (logs) am.salonLogsId = logs.id;
      saveConfig(interaction.guildId, config);
      await interaction.reply({ content: '✅ Auto-mod configurée !', ephemeral: true });
    } else if (sub === 'ajouter') {
      const mot = interaction.options.getString('mot').toLowerCase().trim();
      if (!am.motsInterdits.includes(mot)) { am.motsInterdits.push(mot); saveConfig(interaction.guildId, config); }
      await interaction.reply({ content: `✅ Mot \`${mot}\` ajouté.`, ephemeral: true });
    } else if (sub === 'supprimer') {
      const mot = interaction.options.getString('mot').toLowerCase().trim();
      am.motsInterdits = am.motsInterdits.filter(m => m !== mot);
      saveConfig(interaction.guildId, config);
      await interaction.reply({ content: `✅ Mot \`${mot}\` retiré.`, ephemeral: true });
    } else {
      const liste = am.motsInterdits.length > 0 ? am.motsInterdits.map(m => `\`${m}\``).join(', ') : 'Aucun.';
      await interaction.reply({ content: `🚫 **Mots interdits :** ${liste}`, ephemeral: true });
    }
  },
};
