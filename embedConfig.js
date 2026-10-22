// Configuration par défaut des embeds pour chaque module
const DEFAULT_EMBEDS = {
  bienvenue: {
    couleur: '#5865F2',
    titre: '👋 Bienvenue sur {serveur} !',
    description: '{message}',
    image: '',
    thumbnail: 'avatar', // 'avatar', 'serveur', 'custom', 'aucun'
    thumbnailUrl: '',
    footer: '{serveur}',
    footerIcon: 'serveur', // 'serveur', 'custom', 'aucun'
    footerIconUrl: '',
    timestamp: true,
    champs: [
      { actif: true, nom: '👥 Membre', valeur: 'Tu es le **{count}ème** membre !', inline: true },
      { actif: true, nom: '📋 Règlement', valeur: 'Lis le règlement pour débloquer l\'accès.', inline: true },
    ]
  },
  reglement: {
    couleur: '#5865F2',
    titre: '📋 {titre}',
    description: '{contenu}',
    image: '',
    thumbnail: 'aucun',
    thumbnailUrl: '',
    footer: 'Réagis avec {emoji} pour accepter',
    footerIcon: 'aucun',
    footerIconUrl: '',
    timestamp: true,
    champs: []
  },
  niveau: {
    couleur: '#5865F2',
    titre: '🎉 Niveau supérieur !',
    description: '<@{userId}> vient de passer au niveau **{niveau}** !',
    image: '',
    thumbnail: 'avatar',
    thumbnailUrl: '',
    footer: 'Jirito Bot — Niveaux',
    footerIcon: 'aucun',
    footerIconUrl: '',
    timestamp: true,
    champs: []
  },
  annonce_chaine: {
    couleur: '#FF0000',
    titre: '{emoji} {titre}',
    description: '{description}',
    image: '{miniature}',
    thumbnail: 'aucun',
    thumbnailUrl: '',
    footer: 'Annonce via Jirito Bot',
    footerIcon: 'aucun',
    footerIconUrl: '',
    timestamp: true,
    champs: [
      { actif: true, nom: 'Chaîne', valeur: '[{nomChaine}]({urlChaine})', inline: true },
      { actif: true, nom: 'Lien direct', valeur: '{url}', inline: true },
    ]
  },
  automod: {
    couleur: '#DA3633',
    titre: '🛡️ Message supprimé',
    description: 'Un message a été supprimé automatiquement.',
    image: '',
    thumbnail: 'aucun',
    thumbnailUrl: '',
    footer: 'Jirito Bot — AutoMod',
    footerIcon: 'aucun',
    footerIconUrl: '',
    timestamp: true,
    champs: [
      { actif: true, nom: '👤 Membre', valeur: '<@{userId}>', inline: true },
      { actif: true, nom: '📍 Salon', valeur: '<#{salonId}>', inline: true },
      { actif: true, nom: '🚫 Mot détecté', valeur: '`{mot}`', inline: true },
    ]
  },
  sondage: {
    couleur: '#5865F2',
    titre: '📊 {question}',
    description: '{options}',
    image: '',
    thumbnail: 'aucun',
    thumbnailUrl: '',
    footer: 'Réagis pour voter !',
    footerIcon: 'aucun',
    footerIconUrl: '',
    timestamp: true,
    champs: [
      { actif: true, nom: '👤 Créé par', valeur: '<@{userId}>', inline: true },
    ]
  }
};

module.exports = { DEFAULT_EMBEDS };
