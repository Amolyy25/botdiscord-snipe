import { EmbedBuilder, PermissionFlagsBits } from "discord.js";
import { getStatsSetup, saveStatsSetup } from "../statsHelper.js";

export async function handleSetupStats(message) {
  if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
    const errEmbed = new EmbedBuilder()
      .setColor(0xffffff)
      .setDescription(`***Cette commande est réservée aux administrateurs.***`);
    return message.reply({ embeds: [errEmbed] });
  }

  // Récupérer l'éventuelle ancienne configuration
  const existing = await getStatsSetup(message.guild.id);

  if (existing) {
    // Tenter de supprimer l'ancien message (peut échouer si déjà supprimé ou salon différent)
    try {
      const oldChannel = message.guild.channels.cache.get(existing.channel_id);
      if (oldChannel) {
        const oldMsg = await oldChannel.messages.fetch(existing.message_id).catch(() => null);
        if (oldMsg) await oldMsg.delete();
      }
    } catch {
      // Silencieux — l'ancien message n'existe peut-être plus
    }
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
    .setDescription(
      existing
        ? `***Classement réinitialisé. L'ancien message a été supprimé. Mise à jour dans quelques instants.***`
        : `***Classement d'activité configuré. Mise à jour dans quelques instants.***`
    );

  return message.reply({ embeds: [confirmEmbed] });
}
