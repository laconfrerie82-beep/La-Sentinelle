const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { getConfig, saveConfig } = require('../utils');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('config-bienvenue')
    .setDescription('⚙️ Configure le message de bienvenue')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addChannelOption(opt =>
      opt.setName('salon').setDescription('Salon où envoyer les messages de bienvenue').setRequired(true))
    .addStringOption(opt =>
      opt.setName('message').setDescription('Message ({user} = membre, {count} = nbre membres, {serveur} = nom serveur)').setRequired(false))
    .addBooleanOption(opt =>
      opt.setName('mention').setDescription('Mentionner le nouveau membre ?').setRequired(false))
    .addBooleanOption(opt =>
      opt.setName('embed').setDescription('Afficher en embed coloré ?').setRequired(false))
    .addBooleanOption(opt =>
      opt.setName('mp').setDescription('Envoyer un MP de bienvenue ?').setRequired(false))
    .addBooleanOption(opt =>
      opt.setName('actif').setDescription('Activer/désactiver la bienvenue').setRequired(false)),

  async execute(interaction) {
    const config = getConfig();
    const bv = config.bienvenue;

    const salon = interaction.options.getChannel('salon');
    const message = interaction.options.getString('message');
    const mention = interaction.options.getBoolean('mention');
    const embed = interaction.options.getBoolean('embed');
    const mp = interaction.options.getBoolean('mp');
    const actif = interaction.options.getBoolean('actif');

    if (salon) bv.salonId = salon.id;
    if (message) bv.message = message;
    if (mention !== null) bv.mention = mention;
    if (embed !== null) bv.embed = embed;
    if (mp !== null) bv.mp = mp;
    if (actif !== null) bv.actif = actif;

    saveConfig(config);

    const result = new EmbedBuilder()
      .setTitle('✅ Bienvenue configurée !')
      .setColor(0x23a55a)
      .addFields(
        { name: '📍 Salon', value: `<#${bv.salonId}>`, inline: true },
        { name: '🔔 Mention', value: bv.mention ? 'Oui' : 'Non', inline: true },
        { name: '🎨 Embed', value: bv.embed ? 'Oui' : 'Non', inline: true },
        { name: '📩 MP', value: bv.mp ? 'Oui' : 'Non', inline: true },
        { name: '✅ Actif', value: bv.actif ? 'Oui' : 'Non', inline: true },
        { name: '💬 Message', value: bv.message, inline: false },
      )
      .setFooter({ text: 'Jirito Bot' })
      .setTimestamp();

    await interaction.reply({ embeds: [result], ephemeral: true });
  },
};
