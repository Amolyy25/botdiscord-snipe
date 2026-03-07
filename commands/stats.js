import { EmbedBuilder, SlashCommandBuilder } from "discord.js";
import { getUserStats } from "../statsHelper.js";

export const handleStatsCommand = async (message, args) => {
  let user = null;
  const targetArg = args[0];

  if (message.mentions.users.size > 0) {
    user = message.mentions.users.first();
  } else if (targetArg && /^\d{17,20}$/.test(targetArg)) {
    try {
      user = await message.client.users.fetch(targetArg);
    } catch {}
  } else {
    user = message.author;
  }

  if (!user) {
    const errorreply = new EmbedBuilder()
      .setColor(0xffffff)
      .setDescription(`***Mentionner un ID ou un @ pour voir ses stats.***`);
    message.reply({ embeds: [errorreply] });
    return;
  }

  try {
    const embed = await buildStatsEmbed(message.guild.id, user);
    message.reply({ embeds: [embed] });
  } catch (err) {
    console.error(`[Stats] Erreur : ${err}`);
    message.reply("Une erreur est survenue lors de la récupération des stats.");
  }
};

async function buildStatsEmbed(guildId, user) {
  const stats = await getUserStats(guildId, user.id);

  const formatTime = (totalMin) => {
    const hours = Math.floor(totalMin / 60);
    const mins = totalMin % 60;
    return hours > 0 ? `${hours}h ${mins}min` : `${mins}min`;
  };

  return new EmbedBuilder()
    .setColor(0xffffff)
    .setAuthor({
      name: `Statistiques de ${user.username}`,
      iconURL: user.displayAvatarURL({ dynamic: true }),
    })
    .addFields(
      {
        name: "TEXTUEL (14 JOURS)",
        value: `> \`${stats.text.last14}\` messages`,
        inline: true,
      },
      {
        name: "TEXTUEL (TOTAL)",
        value: `> \`${stats.text.all}\` messages`,
        inline: true,
      },
      {
        name: "\u200b",
        value: "\u200b",
        inline: false,
      },
      {
        name: "VOCAL (14 JOURS)",
        value: `> \`${formatTime(stats.voice.last14)}\``,
        inline: true,
      },
      {
        name: "VOCAL (TOTAL)",
        value: `> \`${formatTime(stats.voice.all)}\``,
        inline: true,
      },
    )
}

const stats = {
  data: new SlashCommandBuilder()
    .setName("stats")
    .setDescription("Voir les stats textuelle et vocal d'un utilisateur")
    .addUserOption((option) =>
      option
        .setName("user")
        .setDescription("L'utilisateur à voir (optionnel)")
        .setRequired(false),
    ),

  async execute(interaction) {
    try {
      const user = interaction.options.getUser("user") || interaction.user;
      const embed = await buildStatsEmbed(interaction.guildId, user);
      await interaction.reply({ embeds: [embed] });
    } catch (err) {
      console.error(`[Stats] Erreur : ${err}`);
      await interaction.reply({
        content: "Une erreur est survenue lors de la récupération des stats.",
        ephemeral: true,
      });
    }
  },
};

export default stats;
