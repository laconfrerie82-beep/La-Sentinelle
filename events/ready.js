const { Events, ActivityType } = require('discord.js');

module.exports = {
  name: Events.ClientReady,
  once: true,
  execute(client) {
    console.log(`✅ Jirito Bot connecté en tant que ${client.user.tag}`);
    console.log(`📡 Présent sur ${client.guilds.cache.size} serveur(s)`);
    client.user.setActivity('plusieurs serveurs 👁️', { type: ActivityType.Watching });
  },
};
