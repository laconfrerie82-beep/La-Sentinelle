const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { getConfig, saveConfig } = require('../utils');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('config-bienvenue')
    .setDescription('⚙️ Configure le message de bienvenue')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addChannelOption(opt => opt.setName('salon').setDescription('Salon de bienvenue').setRequired(true))
    .addStringOption(opt => opt.setName('message').setDescription('Message ({user}, {count}, {serveur})').setRequired(false))
    .addBooleanOption(opt => opt.setName('mention').setDescription('Mentionner le membre ?').setRequired(false))
    .addBooleanOption(opt => opt.setName('embed').setDescription('Afficher en embed ?').setRequired(false))
    .addBooleanOption(opt => opt.setName('mp').setDescription('Envoyer un MP ?').setRequired(false))
    .addBooleanOption(opt => opt.setName('actif').setDescription('Activer/désactiver').setRequired(false)),

  async execute(interaction) {
    const config = getConfig(interaction.guildId);
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
    saveConfig(interaction.guildId, config);
    await interaction.reply({ content: '✅ Bienvenue configurée !', ephemeral: true });
  },
};
