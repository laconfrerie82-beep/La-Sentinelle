const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { getChaines, saveChaines, getNextId } = require('../chainesUtils');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('chaine-ajouter')
    .setDescription('➕ Ajouter une chaîne ou un compte réseau social')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addStringOption(opt =>
      opt.setName('plateforme').setDescription('Plateforme').setRequired(true)
        .addChoices(
          { name: '📺 YouTube', value: 'youtube' },
          { name: '🟣 Twitch', value: 'twitch' },
          { name: '🎵 TikTok', value: 'tiktok' },
        ))
    .addStringOption(opt => opt.setName('nom').setDescription('Nom affiché').setRequired(true))
    .addStringOption(opt => opt.setName('url').setDescription('Lien de la chaîne').setRequired(true))
    .addStringOption(opt => opt.setName('description').setDescription('Courte description').setRequired(false))
    .addChannelOption(opt => opt.setName('salon_annonce').setDescription('Salon pour les annonces de nouvelles vidéos/streams').setRequired(false))
    .addRoleOption(opt => opt.setName('role_mention').setDescription('Rôle à mentionner lors des annonces').setRequired(false)),

  async execute(interaction) {
    const plateforme = interaction.options.getString('plateforme');
    const nom = interaction.options.getString('nom');
    const url = interaction.options.getString('url');
    const description = interaction.options.getString('description') || '';
    const salonAnnonce = interaction.options.getChannel('salon_annonce');
    const roleMention = interaction.options.getRole('role_mention');

    // Validation URL
    const urlsValides = {
      youtube: ['youtube.com', 'youtu.be'],
      twitch: ['twitch.tv'],
      tiktok: ['tiktok.com'],
    };

    const urlValide = urlsValides[plateforme].some(u => url.includes(u));
    if (!urlValide) {
      return interaction.reply({
        content: `❌ L'URL ne correspond pas à la plateforme **${plateforme}**. Vérifie le lien !`,
        ephemeral: true,
      });
    }

    const chaines = getChaines(interaction.guildId);

    if (chaines.find(c => c.url === url)) {
      return interaction.reply({ content: '⚠️ Cette chaîne est déjà enregistrée !', ephemeral: true });
    }

    const nouvelleChaine = {
      id: getNextId(chaines),
      plateforme,
      nom,
      url,
      description,
      salonAnnonceId: salonAnnonce?.id || '',
      roleMentionId: roleMention?.id || '',
      actif: true,
      ajouteLe: new Date().toISOString(),
    };

    chaines.push(nouvelleChaine);
    saveChaines(interaction.guildId, chaines);

    const EMOJIS = { youtube: '📺', twitch: '🟣', tiktok: '🎵' };
    const embed = new EmbedBuilder()
      .setTitle(`✅ Chaîne ajoutée !`)
      .setColor(0x23a55a)
      .addFields(
        { name: 'Plateforme', value: `${EMOJIS[plateforme]} ${plateforme}`, inline: true },
        { name: 'Nom', value: nom, inline: true },
        { name: 'ID', value: `#${nouvelleChaine.id}`, inline: true },
        { name: 'Lien', value: url, inline: false },
      );

    if (description) embed.addFields({ name: 'Description', value: description, inline: false });
    if (salonAnnonce) embed.addFields({ name: '📢 Salon annonces', value: `<#${salonAnnonce.id}>`, inline: true });
    if (roleMention) embed.addFields({ name: '🔔 Rôle mention', value: `<@&${roleMention.id}>`, inline: true });

    embed.setTimestamp();
    await interaction.reply({ embeds: [embed] });
  },
};
