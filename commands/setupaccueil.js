import {
  EmbedBuilder,
  ChannelType,
  PermissionFlagsBits,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  SlashCommandBuilder,
} from "discord.js";

export const handleSetupAccueil = async (input) => {
  const isMessage = !!input.guildId && !input.commandName; // Simple check for message vs interaction

  const guild = input.guild;
  const member = input.member;

  if (!member.permissions.has(PermissionFlagsBits.Administrator)) {
    const errorMsg = "Tu dois être administrateur pour utiliser cette commande.";
    return isMessage ? input.reply(errorMsg) : input.reply({ content: errorMsg, ephemeral: true });
  }

  const CHANNEL_NAME = "│🛎️・accueil";

  let channel = guild.channels.cache.find(
    (c) => c.name === CHANNEL_NAME && c.type === ChannelType.GuildText
  );

  if (!channel) {
    try {
      channel = await guild.channels.create({
        name: CHANNEL_NAME,
        type: ChannelType.GuildText,
        permissionOverwrites: [
          {
            id: guild.id,
            deny: [PermissionFlagsBits.SendMessages],
            allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.ReadMessageHistory],
          },
        ],
      });
    } catch (err) {
      console.error(err);
      const errorMsg = "Impossible de créer le salon d'accueil.";
      return isMessage ? input.reply(errorMsg) : input.reply({ content: errorMsg, ephemeral: true });
    }
  }

  const embed = new EmbedBuilder()
    .setColor(0xFFFFFF) // Un noir "sobre" pour le minimalisme
    .setTitle("BIENVENUE SUR LE SECTEUR")
    .setDescription(
      `Bienvenue dans notre communauté en constante évolution ! Découvre ci-dessous tout ce que le serveur a à t'offrir.`
    )
    .addFields(
      {
        name: "<a:1476213141183660104:1477056275501154304>  LE CASINO",
        value:
          `Pour y accéder, rendez-vous ici : <#1469071692348264634>\n\n` +
          `**Fonctionnement & Gains :**\n` +
          `• Obtiens des coins via les succès, les giveaways ou en montant de prestige.\n` +
          `• Le système de **Prestige** te permet de grimper dans la hiérarchie.\n\n` +
          `**Commandes de base :**\n` +
          `> \`;bal\` : Voir ton solde\n` +
          `> \`;daily\` : Récompense quotidienne\n` +
          `> \`;collect\` : Récompense toutes les 30s\n` +
          `> \`;prestige\` : Voir tous les prestiges dispo\n` +
          `> \`;help\` : Liste complète des jeux (dans le chat casino)\n\n` +
          `**Événements & Gains supplémentaires :**\n` +
          `• **Récompenses Vocal :** Gagne des coins simplement en restant en vocal.\n` +
          `• **Braquage du Jeudi :** Trouve le code secret via une énigme chaque jeudi.\n` +
          `• **Heure de Gloire (Aléatoire 20h-23h) :** Tous les gains sont doublés !\n` +
          `• **Quiz Math :** 5 quiz par jour pour gagner des coins facilement. \n\n`,
      },
      {
        name: "<a:1476213141183660104:1477056275501154304> COMMU+",
        value:
          `Accède à cet espace ici : <#1472918469409509418>\n\n` +
          `• **Présentations :** Pour mieux se connaître.\n` +
          `• **Art & Anecdotes :** Partage tes créations et tes histoires.\n` +
          `• **Vote2profil :** Poste ton profil pour recevoir des avis.\n` +
          `• **Les Dossiers :** Poste un dossier croustillant sur quelqu'un !\n` +
          `• **Confession :** Envoie tes secrets de façon totalement anonyme.\n\n`,
      },
      {
        name: "<a:1476213141183660104:1477056275501154304> RÔLE BUSINESS CLASS",
        value: `Pour obtenir ton premier rôle, envoie ton premier message dans : <#1469071691941412962>\n\n`,
      },
      {
        name: "<a:1476213141183660104:1477056275501154304> STAFF & SOUTIEN",
        value:
          `• **Recrutement :** On recrute activement ! Postule ici : <#1476973824917504082>\n` +
          `• **Évolution :** Pour soutenir le serveur, tout est expliqué ici : <#1469072587287036059>\n\n`,
      }
    )
    .setFooter({ text: "SECTEUR" });

  await channel.send({ embeds: [embed] });

  const successMsg = `Le salon ${channel} a été configuré avec succès.`;
  return isMessage ? input.reply(successMsg) : input.reply({ content: successMsg, ephemeral: true });
};

const setupaccueil = {
  data: new SlashCommandBuilder()
    .setName("setupaccueil")
    .setDescription("Configure le salon d'accueil")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  async execute(interaction) {
    if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return interaction.reply({
        content: "Tu dois être administrateur pour utiliser cette commande.",
        ephemeral: true,
      });
    }
    // Appel direct pour la version Slash si besoin (même logique que handleSetupAccueil mais pour interaction)
    // Pour simplifier, on peut réutiliser la logique ou juste répondre via l'interaction
    await handleSetupAccueil(interaction);
  },
};

export default setupaccueil;
