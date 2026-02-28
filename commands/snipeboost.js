import {
  ChannelType,
  PermissionFlagsBits,
  SlashCommandBuilder,
  EmbedBuilder,
} from "discord.js";

const snipeboost = {
  data: new SlashCommandBuilder()
    .setName("snipeboost")
    .setDescription("Crée un channel vocal avec le nombre de boost")
    .addStringOption((option) =>
      option
        .setName("nom")
        .setDescription("Le nom du salon à crée")
        .setRequired(true),
    ),
  async execute(interaction) {
    const boost = interaction.guild.premiumSubscriptionCount;
    const voiceChannelName = `│🔮・Boosts : ${boost}`;
    const voice = interaction.options.getString("nom");

    try {
      const newsChannel = await interaction.guild.channels.create({
        name: `${voice} ${boost}`,
        type: ChannelType.GuildVoice,
      });
      interaction.client.setGuildCounter(
        interaction.guild,
        "boostCounterChannelId",
        newsChannel.id,
      );
      const boostembed = new EmbedBuilder()
        .setColor(0xffffff)
        .setDescription(
          `**Channel crée <#${newsChannel.id}>, il y a actuellement ${boost} boost sur le serveur.**`,
        );
      interaction.reply({ embeds: [boostembed] });
    } catch (err) {
      await interaction.reply(`${err}`);
    }
  },
};
export default snipeboost;
