const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { getConfig, saveConfig } = require('../utils');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('config-niveaux')
    .setDescription('⚙️ Configure le système de niveaux')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand(sub => sub.setName('general').setDescription('Paramètres généraux')
      .addBooleanOption(opt => opt.setName('actif').setDescription('Activer/désactiver').setRequired(false))
      .addIntegerOption(opt => opt.setName('xp_message').setDescription('XP par message').setRequired(false))
      .addIntegerOption(opt => opt.setName('xp_vocal').setDescription('XP par minute vocal').setRequired(false))
      .addIntegerOption(opt => opt.setName('cooldown').setDescription('Cooldown secondes').setRequired(false))
      .addChannelOption(opt => opt.setName('salon').setDescription('Salon annonces').setRequired(false)))
    .addSubcommand(sub => sub.setName('recompense').setDescription('Ajouter une récompense')
      .addIntegerOption(opt => opt.setName('niveau').setDescription('Niveau requis').setRequired(true))
      .addRoleOption(opt => opt.setName('role').setDescription('Rôle à attribuer').setRequired(true)))
    .addSubcommand(sub => sub.setName('liste').setDescription('Voir les récompenses')),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const config = getConfig(interaction.guildId);
    const niv = config.niveaux;

    if (sub === 'general') {
      const actif = interaction.options.getBoolean('actif');
      const xpMsg = interaction.options.getInteger('xp_message');
      const xpVocal = interaction.options.getInteger('xp_vocal');
      const cooldown = interaction.options.getInteger('cooldown');
      const salon = interaction.options.getChannel('salon');
      if (actif !== null) niv.actif = actif;
      if (xpMsg) niv.xpParMessage = xpMsg;
      if (xpVocal) niv.xpParMinuteVocal = xpVocal;
      if (cooldown) niv.cooldownMessages = cooldown;
      if (salon) niv.salonAnnonceId = salon.id;
      saveConfig(interaction.guildId, config);
      await interaction.reply({ content: '✅ Niveaux configurés !', ephemeral: true });

    } else if (sub === 'recompense') {
      const niveau = interaction.options.getInteger('niveau');
      const role = interaction.options.getRole('role');
      const existing = niv.recompenses.findIndex(r => r.niveau === niveau);
      if (existing >= 0) niv.recompenses[existing].roleId = role.id;
      else { niv.recompenses.push({ niveau, roleId: role.id }); niv.recompenses.sort((a, b) => a.niveau - b.niveau); }
      saveConfig(interaction.guildId, config);
      await interaction.reply({ content: `✅ Niveau **${niveau}** → <@&${role.id}>`, ephemeral: true });

    } else {
      const liste = niv.recompenses.length > 0
        ? niv.recompenses.map(r => `Niveau **${r.niveau}** → <@&${r.roleId}>`).join('\n')
        : 'Aucune récompense.';
      await interaction.reply({ content: `🏆 **Récompenses :**\n${liste}`, ephemeral: true });
    }
  },
};
