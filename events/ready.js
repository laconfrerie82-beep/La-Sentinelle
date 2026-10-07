const { Events, ActivityType } = require('discord.js');

module.exports = {
  name: Events.ClientReady,
  once: true,
  execute(client) {
    console.log(`✅ Jirito Bot connecté en tant que ${client.user.tag}`);
    client.user.setActivity('le serveur 👁️', { type: ActivityType.Watching });
  },
};
