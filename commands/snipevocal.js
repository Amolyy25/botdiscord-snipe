import {
  ChannelType,
  EmbedBuilder,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from "discord.js";
import { channel } from "node:diagnostics_channel";

const snipevocal = {
  data: new SlashCommandBuilder()
    .setName("snipevocal")
    .setDescription("Crée un channel vocal avec le nombre de membre en vocal")
    .addStringOption((option) =>
      option
        .setName("nom")
        .setDescription("Nom du salon à crée")
        .setRequired(true),
    ),
  async execute(interaction) {
    const voiceChannels = interaction.guild.channels.cache.filter((channel) =>
      channel.isVoiceBased(),
    );
    let total = 0;
    for (const channel of voiceChannels.values()) {
      total += channel.members.size;
    }
    const voice = interaction.options.getString("nom");

    try {
      const newsChannel = await interaction.guild.channels.create({
        name: `${voice} ${total}`,
        type: ChannelType.GuildVoice,
      });
      interaction.client.setGuildCounter(
        interaction.guild,
        "vocalCounterChannelId",
        newsChannel.id,
      );
      const vocalembed = new EmbedBuilder()
        .setColor(0xffffff)
        .setDescription(
          `**Channel crée <#${newsChannel.id}>, il y a actuellement ${total} membres en vocal**`,
        );
      interaction.reply({ embeds: [vocalembed] });
    } catch (err) {
      await interaction.reply(`${err}`);
    }
  },
};
export default snipevocal;
