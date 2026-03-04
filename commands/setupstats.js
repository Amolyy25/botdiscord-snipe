import { EmbedBuilder, PermissionFlagsBits } from "discord.js";
import { saveStatsSetup } from "../statsHelper.js";

// Commande préfixée =setupstats — gérée directement dans index.js
// Ce fichier exporte le handler pour garder le code modulaire.

export async function handleSetupStats(message) {
  if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
    const errEmbed = new EmbedBuilder()
      .setColor(0xffffff)
      .setDescription(`***Cette commande est réservée aux administrateurs.***`);
    return message.reply({ embeds: [errEmbed] });
  }

  const placeholderEmbed = new EmbedBuilder()
    .setColor(0xffffff)
    .setTitle("CLASSEMENT ACTIVITE | 14 JOURS")
    .setDescription("*Chargement en cours... Le classement sera disponible dans quelques instants.*")
    .setFooter({ text: "Actualise toutes les heures. La performance est la seule règle." });

  const sent = await message.channel.send({ embeds: [placeholderEmbed] });

  await saveStatsSetup(message.guild.id, message.channel.id, sent.id);

  const confirmEmbed = new EmbedBuilder()
    .setColor(0xffffff)
    .setDescription(`***Classement d'activité configuré. Mise à jour dans moins d'une heure.***`);

  return message.reply({ embeds: [confirmEmbed] });
}
