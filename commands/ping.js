import { SlashCommandBuilder } from "discord.js";

const pingCommand = {
  data: new SlashCommandBuilder()
    .setName("ping")
    .setDescription("Replies with Pong and latency!"),
  async execute(interaction) {
    const sent = await interaction.reply({
      content: "Pong!",
      fetchReply: true,
    });
    const latency = sent.createdTimestamp - interaction.createdTimestamp;
    await interaction.editReply(`Pong! Latency: ${latency}ms`);
  },
};

export default pingCommand;
