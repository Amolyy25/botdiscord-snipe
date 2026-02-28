import {
  Guild,
  GuildMember,
  SlashCommandBuilder,
  EmbedBuilder,
} from "discord.js";

const boost = {
  data: new SlashCommandBuilder()
    .setName("boost")
    .setDescription("Avoir le nombre de boost"),
  async execute(interaction) {
    const boost = interaction.guild.premiumSubscriptionCount;

    const memberEmbed = new EmbedBuilder()
      .setColor(0xffffff)
      .setDescription(`**Il y a actuellement ${boost} boost actif**`);
    interaction.reply({ embeds: [memberEmbed] });
  },
};

export default boost;
