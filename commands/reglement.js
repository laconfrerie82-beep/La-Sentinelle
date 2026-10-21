const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { getConfig, saveConfig } = require('../utils');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('reglement')
    .setDescription('📋 Gestion du règlement')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand(sub => sub.setName('publier').setDescription('Publier le règlement')
      .addChannelOption(opt => opt.setName('salon').setDescription('Salon').setRequired(true))
      .addStringOption(opt => opt.setName('titre').setDescription('Titre').setRequired(false))
      .addStringOption(opt => opt.setName('contenu').setDescription('Contenu').setRequired(false))
      .addRoleOption(opt => opt.setName('role').setDescription('Rôle après acceptation').setRequired(false)))
    .addSubcommand(sub => sub.setName('modifier').setDescription('Modifier le règlement')
      .addStringOption(opt => opt.setName('titre').setDescription('Nouveau titre').setRequired(false))
      .addStringOption(opt => opt.setName('contenu').setDescription('Nouveau contenu').setRequired(false))
      .addRoleOption(opt => opt.setName('role').setDescription('Nouveau rôle').setRequired(false))),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const config = getConfig(interaction.guildId);
    const reg = config.reglement;

    if (sub === 'publier') {
      const salon = interaction.options.getChannel('salon');
      const titre = interaction.options.getString('titre');
      const contenu = interaction.options.getString('contenu');
      const role = interaction.options.getRole('role');
      if (titre) reg.titre = titre;
      if (contenu) reg.contenu = contenu;
      if (role) reg.roleAcceptationId = role.id;
      reg.salonId = salon.id;
      const embed = new EmbedBuilder()
        .setTitle(`📋 ${reg.titre}`).setDescription(reg.contenu).setColor(0x5865f2)
        .setFooter({ text: `Réagis avec ${reg.emoji} pour accepter le règlement` }).setTimestamp();
      const msg = await salon.send({ embeds: [embed] });
      await msg.react(reg.emoji);
      reg.messageId = msg.id;
      saveConfig(interaction.guildId, config);
      await interaction.reply({ content: `✅ Règlement publié dans <#${salon.id}> !`, ephemeral: true });

    } else {
      const titre = interaction.options.getString('titre');
      const contenu = interaction.options.getString('contenu');
      const role = interaction.options.getRole('role');
      if (titre) reg.titre = titre;
      if (contenu) reg.contenu = contenu;
      if (role) reg.roleAcceptationId = role.id;
      saveConfig(interaction.guildId, config);
      if (reg.salonId && reg.messageId) {
        try {
          const salon = await interaction.guild.channels.fetch(reg.salonId);
          const msg = await salon.messages.fetch(reg.messageId);
          const embed = new EmbedBuilder()
            .setTitle(`📋 ${reg.titre}`).setDescription(reg.contenu).setColor(0x5865f2)
            .setFooter({ text: `Réagis avec ${reg.emoji} pour accepter le règlement` }).setTimestamp();
          await msg.edit({ embeds: [embed] });
        } catch {}
      }
      await interaction.reply({ content: '✅ Règlement mis à jour !', ephemeral: true });
    }
  },
};
