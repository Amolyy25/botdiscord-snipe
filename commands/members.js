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
    const totalMembers = interaction.guild.members.cache.filter(m => !m.user.bot).size;

    const memberEmbed = new EmbedBuilder()
      .setColor(0xffffff)
      .setDescription(`**Il y a actuellement ${totalMembers} membres (hors bots)**`);
    interaction.reply({ embeds: [memberEmbed] });
  },
};

export default members;
