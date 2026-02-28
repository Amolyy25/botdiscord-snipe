import {
  Guild,
  GuildMember,
  SlashCommandBuilder,
  EmbedBuilder,
} from "discord.js";

const members = {
  data: new SlashCommandBuilder()
    .setName("members")
    .setDescription("Avoir la liste de membres"),
  async execute(interaction) {
    await interaction.guild.members.fetch();
    const member = interaction.guild.memberCount;

    const memberEmbed = new EmbedBuilder()
      .setColor(0xffffff)
      .setDescription(`**Il y a actuellement ${member} membres**`);
    interaction.reply({ embeds: [memberEmbed] });
  },
};

export default members;
