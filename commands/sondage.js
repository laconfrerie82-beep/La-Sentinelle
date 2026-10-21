const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const EMOJIS = ['1️⃣','2️⃣','3️⃣','4️⃣','5️⃣','6️⃣','7️⃣','8️⃣','9️⃣','🔟'];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('sondage')
    .setDescription('📊 Créer un sondage')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
    .addStringOption(opt => opt.setName('question').setDescription('La question').setRequired(true))
    .addStringOption(opt => opt.setName('options').setDescription('Options séparées par | ex: A|B|C').setRequired(true))
    .addChannelOption(opt => opt.setName('salon').setDescription('Salon').setRequired(false))
    .addRoleOption(opt => opt.setName('mention').setDescription('Rôle à mentionner').setRequired(false)),

  async execute(interaction) {
    const question = interaction.options.getString('question');
    const optionsRaw = interaction.options.getString('options');
    const salon = interaction.options.getChannel('salon') || interaction.channel;
    const mention = interaction.options.getRole('mention');
    const options = optionsRaw.split('|').map(o => o.trim()).filter(o => o.length > 0);
    if (options.length < 2) return interaction.reply({ content: '❌ Minimum 2 options séparées par `|`', ephemeral: true });
    if (options.length > 10) return interaction.reply({ content: '❌ Maximum 10 options.', ephemeral: true });
    const description = options.map((opt, i) => `${EMOJIS[i]} ${opt}`).join('\n');
    const embed = new EmbedBuilder().setTitle(`📊 ${question}`).setDescription(description).setColor(0x5865f2)
      .addFields({ name: '👤 Créé par', value: `<@${interaction.user.id}>`, inline: true })
      .setFooter({ text: 'Réagis pour voter !' }).setTimestamp();
    const content = mention ? `<@&${mention.id}> 📊 Nouveau sondage !` : '📊 Nouveau sondage !';
    const msg = await salon.send({ content, embeds: [embed] });
    for (let i = 0; i < options.length; i++) await msg.react(EMOJIS[i]);
    await interaction.reply({ content: `✅ Sondage publié dans <#${salon.id}> !`, ephemeral: true });
  },
};
