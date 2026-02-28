import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  EmbedBuilder,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from "discord.js";

const SUPPORT_CHANNEL_NAME = "│📩・support";
const UNBL_SUPPORT_ROLE_ID = "1476935225631178894";

const APPEAL_GUILD_ID = process.env.APPEAL_GUILD_ID;

export default {
  data: new SlashCommandBuilder()
    .setName("setup-unbl")
    .setDescription(
      "Configurer le salon de support UNBL (à exécuter sur le serveur UNBL uniquement).",
    ),

  async execute(interaction) {
    if (!APPEAL_GUILD_ID || interaction.guild.id !== APPEAL_GUILD_ID) {
      return interaction.reply({
        content: "Cette commande doit être exécutée sur le serveur UNBL.",
        ephemeral: true,
      });
    }

    if (
      !interaction.member.permissions.has(PermissionFlagsBits.Administrator)
    ) {
      return interaction.reply({
        content: "Tu dois être administrateur pour utiliser cette commande.",
        ephemeral: true,
      });
    }

    let supportChannel = interaction.guild.channels.cache.find(
      (c) =>
        c.name === SUPPORT_CHANNEL_NAME &&
        c.type === ChannelType.GuildText,
    );

    if (!supportChannel) {
      supportChannel = await interaction.guild.channels.create({
        name: SUPPORT_CHANNEL_NAME,
        type: ChannelType.GuildText,
        permissionOverwrites: [
          {
            id: interaction.guild.id,
            deny: [
              PermissionFlagsBits.SendMessages,
              PermissionFlagsBits.AddReactions,
            ],
            allow: [PermissionFlagsBits.ViewChannel],
          },
          {
            id: interaction.client.user.id,
            allow: [
              PermissionFlagsBits.ViewChannel,
              PermissionFlagsBits.SendMessages,
            ],
          },
        ],
      });
    }

    const embed = new EmbedBuilder()
      .setColor(0xffffff)
      .setTitle("Support UNBL")
      .setDescription(
        "Pour demander un unblacklist, clique sur le bouton ci-dessous pour ouvrir un ticket.\n\n" +
          "Un membre du staff examinera ta demande.",
      );

    const button = new ButtonBuilder()
      .setCustomId("unbl_open_ticket")
      .setLabel("Ouvrir un ticket")
      .setStyle(ButtonStyle.Primary);

    const row = new ActionRowBuilder().addComponents(button);

    await supportChannel.send({ embeds: [embed], components: [row] });

    return interaction.reply({
      content: `Le salon ${supportChannel} est configuré pour le support UNBL.`,
      ephemeral: true,
    });
  },
};

