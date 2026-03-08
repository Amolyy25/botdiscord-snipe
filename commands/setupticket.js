import {
  EmbedBuilder,
  PermissionFlagsBits,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  SlashCommandBuilder,
} from "discord.js";

export const handleSetupTicket = async (input) => {
  const isMessage = !!input.guildId && !input.commandName;

  const member = input.member;

  if (!member.permissions.has(PermissionFlagsBits.Administrator)) {
    const errorMsg = "Tu dois être administrateur pour utiliser cette commande.";
    return isMessage ? input.reply(errorMsg) : input.reply({ content: errorMsg, ephemeral: true });
  }

  const setupEmbed = new EmbedBuilder()
    .setColor(0x2b2d31)
    .setTitle("CENTRE D'AIDE & SUPPORT")
    .setDescription(
      "Bienvenue dans le centre d'assistance du serveur. Cliquez sur le bouton correspondant à votre demande pour ouvrir un ticket.\n\n" +
        "📩 **Questions Générales**\nPour toute question relative au serveur ou à son fonctionnement.\n\n" +
        "⚖️ **Abus Staff**\nPour signaler un comportement inapproprié d'un membre de l'équipe.\n\n" +
        "👑 **Contact Owner / Partenariats**\nPour les demandes de partenariats ou contacter les fondateurs."
    )
    .setFooter({ text: "Secteur - Système de Support" });

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("ticket_general")
      .setLabel("Général")
      .setEmoji("📩")
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId("ticket_abus")
      .setLabel("Abus Staff")
      .setEmoji("⚖️")
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId("ticket_owner")
      .setLabel("Contact Owner")
      .setEmoji("👑")
      .setStyle(ButtonStyle.Secondary)
  );

  await input.channel.send({
    embeds: [setupEmbed],
    components: [row],
  });

  const successMsg = "Le menu de tickets a été envoyé.";
  return isMessage ? input.reply(successMsg) : input.reply({ content: successMsg, ephemeral: true });
};

const setupticket = {
  data: new SlashCommandBuilder()
    .setName("setupticket")
    .setDescription("Configure le système de tickets")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  async execute(interaction) {
    await handleSetupTicket(interaction);
  },
};

export default setupticket;
