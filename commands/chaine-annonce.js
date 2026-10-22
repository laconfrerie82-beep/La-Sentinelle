const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits } = require('discord.js');
const { getChaines } = require('../chainesUtils');

const PLATFORM_COLORS = { youtube: 0xFF0000, twitch: 0x9146FF, tiktok: 0x010101 };
const PLATFORM_EMOJIS = { youtube: '📺', twitch: '🟣', tiktok: '🎵' };
const PLATFORM_LABELS = { youtube: '▶ Regarder', twitch: '🟣 Regarder le stream', tiktok: '🎵 Voir la vidéo' };

module.exports = {
  data: new SlashCommandBuilder()
    .setName('chaine-annonce')
    .setDescription('📢 Annoncer une nouvelle vidéo ou un stream')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
    .addIntegerOption(opt => opt.setName('id').setDescription('ID de la chaîne').setRequired(true))
    .addStringOption(opt => opt.setName('titre').setDescription('Titre de la vidéo/stream').setRequired(true))
    .addStringOption(opt => opt.setName('url').setDescription('Lien direct vers la vidéo/stream').setRequired(true))
    .addStringOption(opt => opt.setName('description').setDescription('Description courte').setRequired(false))
    .addStringOption(opt => opt.setName('miniature').setDescription('URL de la miniature (image)').setRequired(false)),

  async execute(interaction) {
    const id = interaction.options.getInteger('id');
    const titre = interaction.options.getString('titre');
    const url = interaction.options.getString('url');
    const description = interaction.options.getString('description') || '';
    const miniature = interaction.options.getString('miniature');

    const chaines = getChaines(interaction.guildId);
    const chaine = chaines.find(c => c.id === id);

    if (!chaine) {
      return interaction.reply({ content: `❌ Chaîne #${id} introuvable. Vérifie avec \`/chaines\`.`, ephemeral: true });
    }

    const emoji = PLATFORM_EMOJIS[chaine.plateforme];
    const color = PLATFORM_COLORS[chaine.plateforme];

    const embed = new EmbedBuilder()
      .setTitle(`${emoji} ${titre}`)
      .setColor(color)
      .setDescription(description || `Nouvelle publication de **${chaine.nom}** !`)
      .addFields(
        { name: `${emoji} Chaîne`, value: `[${chaine.nom}](${chaine.url})`, inline: true },
        { name: '🔗 Lien direct', value: url, inline: true },
      )
      .setFooter({ text: `Annonce via Jirito Bot` })
      .setTimestamp();

    if (miniature) embed.setImage(miniature);

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setLabel(PLATFORM_LABELS[chaine.plateforme]).setStyle(ButtonStyle.Link).setURL(url),
      new ButtonBuilder().setLabel(`🔔 S'abonner`).setStyle(ButtonStyle.Link).setURL(chaine.url),
    );

    // Salon d'annonce configuré ou salon actuel
    const salon = chaine.salonAnnonceId
      ? interaction.guild.channels.cache.get(chaine.salonAnnonceId) || interaction.channel
      : interaction.channel;

    const mention = chaine.roleMentionId ? `<@&${chaine.roleMentionId}> ` : '';
    const content = `${mention}🔴 **Nouveau contenu disponible !**`;

    await salon.send({ content, embeds: [embed], components: [row] });
    await interaction.reply({ content: `✅ Annonce publiée dans <#${salon.id}> !`, ephemeral: true });
  },
};
