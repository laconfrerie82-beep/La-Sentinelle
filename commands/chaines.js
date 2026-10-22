const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { getChaines } = require('../chainesUtils');

const PLATFORM_EMOJIS = { youtube: '📺', twitch: '🟣', tiktok: '🎵' };
const PLATFORM_COLORS = { youtube: 0xFF0000, twitch: 0x9146FF, tiktok: 0x000000 };

module.exports = {
  data: new SlashCommandBuilder()
    .setName('chaines')
    .setDescription('📺 Affiche toutes les chaînes et réseaux du serveur')
    .addStringOption(opt =>
      opt.setName('plateforme')
        .setDescription('Filtrer par plateforme')
        .setRequired(false)
        .addChoices(
          { name: '📺 YouTube', value: 'youtube' },
          { name: '🟣 Twitch', value: 'twitch' },
          { name: '🎵 TikTok', value: 'tiktok' },
        )),

  async execute(interaction) {
    let chaines = getChaines(interaction.guildId);
    const filtre = interaction.options.getString('plateforme');

    if (filtre) chaines = chaines.filter(c => c.plateforme === filtre);

    if (chaines.length === 0) {
      return interaction.reply({
        content: filtre
          ? `❌ Aucune chaîne ${PLATFORM_EMOJIS[filtre]} enregistrée.`
          : '❌ Aucune chaîne enregistrée. Utilise `/chaine-ajouter` pour en ajouter une !',
        ephemeral: true,
      });
    }

    // Grouper par plateforme
    const groupes = {};
    for (const c of chaines) {
      if (!groupes[c.plateforme]) groupes[c.plateforme] = [];
      groupes[c.plateforme].push(c);
    }

    const embed = new EmbedBuilder()
      .setTitle(`📡 Chaînes & Réseaux de ${interaction.guild.name}`)
      .setColor(filtre ? PLATFORM_COLORS[filtre] : 0x5865f2)
      .setDescription(`**${chaines.length} chaîne(s)** enregistrée(s)`)
      .setTimestamp();

    for (const [plateforme, liste] of Object.entries(groupes)) {
      const emoji = PLATFORM_EMOJIS[plateforme];
      const nomPlateforme = plateforme.charAt(0).toUpperCase() + plateforme.slice(1);
      const valeur = liste.map(c => `${emoji} **[${c.nom}](${c.url})**${c.description ? `\n╰ ${c.description}` : ''}`).join('\n');
      embed.addFields({ name: `${emoji} ${nomPlateforme}`, value: valeur, inline: false });
    }

    // Boutons liens directs (max 5 par rangée)
    const rows = [];
    let row = new ActionRowBuilder();
    let count = 0;

    for (const c of chaines) {
      if (count > 0 && count % 5 === 0) {
        rows.push(row);
        row = new ActionRowBuilder();
      }
      row.addComponents(
        new ButtonBuilder()
          .setLabel(`${PLATFORM_EMOJIS[c.plateforme]} ${c.nom}`)
          .setStyle(ButtonStyle.Link)
          .setURL(c.url)
      );
      count++;
      if (rows.length >= 4) break; // Max 4 rangées Discord
    }
    if (row.components.length > 0) rows.push(row);

    await interaction.reply({ embeds: [embed], components: rows });
  },
};
