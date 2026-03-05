import {
  ChannelType,
  PermissionFlagsBits,
  SlashCommandBuilder,
  EmbedBuilder,
} from "discord.js";

const snipemember = {
  data: new SlashCommandBuilder()
    .setName("snipemembers")
    .setDescription(
      "Crée un channel vocal avec le nombre de membre et ce met à jours toute les 15m",
    )
    .addStringOption((option) =>
      option
        .setName("nom")
        .setDescription("Nom du salon à crée")
        .setRequired(true),
    ),
  async execute(interaction) {
    await interaction.guild.members.fetch();
    const members = interaction.guild.members.cache.filter((m) => !m.user.bot).size;
    const voiceChannelName = `│🚀・Membres : ${members}`;
    const voice = interaction.options.getString("nom");

    try {
      const newsChannel = await interaction.guild.channels.create({
        name: `${voice} ${members}`,
        type: ChannelType.GuildVoice,
      });
      interaction.client.setGuildCounter(
        interaction.guild,
        "memberCounterChannelId",
        newsChannel.id,
      );
      const memberEmbed = new EmbedBuilder()
        .setColor(0xffffff)
        .setDescription(
          `**Channel crée <#${newsChannel.id}>, il y a actuellement ${members} membres**`,
        );
      interaction.reply({ embeds: [memberEmbed] });
    } catch (err) {
      await interaction.reply(`${err}`);
    }
  },
};
export default snipemember;
