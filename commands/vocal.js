import {
  Guild,
  GuildMember,
  SlashCommandBuilder,
  EmbedBuilder,
  ChannelType,
} from "discord.js";

const vocal = {
  data: new SlashCommandBuilder()
    .setName("vocal")
    .setDescription("Avoir le nombre de user en vocal")
    .addChannelOption((option) =>
      option
        .setName("channel")
        .setDescription("le channel à vérifié.")
        .addChannelTypes(ChannelType.GuildVoice)
        .setRequired(true),
    ),

  async execute(interaction) {
    const channels = interaction.options.getChannel("channel");

    const memberEmbed = new EmbedBuilder()
      .setColor(0xffffff)
      .setDescription(
        `**Il y a actuellement ${channels.members.size} membres en vocal**`,
      );
    interaction.reply({ embeds: [memberEmbed] });
  },
};

export default vocal;
