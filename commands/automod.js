const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { getConfig, saveConfig } = require('../utils');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('automod')
    .setDescription('🛡️ Gestion de l\'auto-modération')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand(sub =>
      sub.setName('config')
        .setDescription('Configurer l\'auto-mod')
        .addBooleanOption(opt =>
          opt.setName('actif').setDescription('Activer/désactiver l\'auto-mod').setRequired(false))
        .addBooleanOption(opt =>
          opt.setName('supprimer').setDescription('Supprimer automatiquement les messages ?').setRequired(false))
        .addBooleanOption(opt =>
          opt.setName('avertir').setDescription('Avertir le membre en MP ?').setRequired(false))
        .addChannelOption(opt =>
          opt.setName('logs').setDescription('Salon de logs').setRequired(false))
    )
    .addSubcommand(sub =>
      sub.setName('ajouter')
        .setDescription('Ajouter un mot interdit')
        .addStringOption(opt =>
          opt.setName('mot').setDescription('Mot à interdire').setRequired(true))
    )
    .addSubcommand(sub =>
      sub.setName('supprimer')
        .setDescription('Retirer un mot interdit')
        .addStringOption(opt =>
          opt.setName('mot').setDescription('Mot à retirer').setRequired(true))
    )
    .addSubcommand(sub =>
      sub.setName('liste')
        .setDescription('Voir tous les mots interdits')
    ),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const config = getConfig();
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

      saveConfig(config);

      const embed = new EmbedBuilder()
        .setTitle('✅ Auto-mod configurée !')
        .setColor(0x23a55a)
        .addFields(
          { name: '✅ Actif', value: am.actif ? 'Oui' : 'Non', inline: true },
          { name: '🗑️ Suppression auto', value: am.supprimerAuto ? 'Oui' : 'Non', inline: true },
          { name: '📩 Avertissement MP', value: am.avertirMembre ? 'Oui' : 'Non', inline: true },
          { name: '📋 Salon logs', value: am.salonLogsId ? `<#${am.salonLogsId}>` : 'Non défini', inline: true },
          { name: '🚫 Mots interdits', value: `${am.motsInterdits.length} mot(s)`, inline: true },
        )
        .setTimestamp();

      await interaction.reply({ embeds: [embed], ephemeral: true });

    } else if (sub === 'ajouter') {
      const mot = interaction.options.getString('mot').toLowerCase().trim();

      if (am.motsInterdits.includes(mot)) {
        return interaction.reply({ content: `⚠️ Le mot \`${mot}\` est déjà dans la liste.`, ephemeral: true });
      }

      am.motsInterdits.push(mot);
      saveConfig(config);
      await interaction.reply({ content: `✅ Le mot \`${mot}\` a été ajouté aux mots interdits.`, ephemeral: true });

    } else if (sub === 'supprimer') {
      const mot = interaction.options.getString('mot').toLowerCase().trim();
      const index = am.motsInterdits.indexOf(mot);

      if (index === -1) {
        return interaction.reply({ content: `❌ Le mot \`${mot}\` n'est pas dans la liste.`, ephemeral: true });
      }

      am.motsInterdits.splice(index, 1);
      saveConfig(config);
      await interaction.reply({ content: `✅ Le mot \`${mot}\` a été retiré.`, ephemeral: true });

    } else if (sub === 'liste') {
      const liste = am.motsInterdits.length > 0
        ? am.motsInterdits.map(m => `\`${m}\``).join(', ')
        : 'Aucun mot interdit pour le moment.';

      const embed = new EmbedBuilder()
        .setTitle('🚫 Mots interdits')
        .setColor(0xda3633)
        .setDescription(liste)
        .setFooter({ text: `${am.motsInterdits.length} mot(s) au total` })
        .setTimestamp();

      await interaction.reply({ embeds: [embed], ephemeral: true });
    }
  },
};
