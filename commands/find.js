import {
  ChannelType,
  EmbedBuilder,
  PermissionFlagsBits,
  MessageFlags,
  SlashCommandBuilder,
} from "discord.js";

export const handleFindCommand = async (message, args) => {
  const query = args[0];
  if (!query) {
    const errorreply = new EmbedBuilder()
      .setColor(0xffffff)
      .setDescription(`***Tu dois préciser un id ou un @ à chercher***`);
    message.reply({ embeds: [errorreply] });
    return;
  }

  let user;

  if (message.mentions.users.size > 0) {
    user = message.mentions.users.first();
  } else if (/^\d{17,20}$/.test(query)) {
    try {
      user = await message.client.users.fetch(query);
    } catch {}
  }

  if (!user) {
    const noUser = new EmbedBuilder()
      .setColor(0xffffff)
      .setDescription(`***user ou id introuvée.***`);
    message.reply({ embeds: [noUser] });
    return;
  }

  const member = await message.guild.members.fetch(user.id).catch(() => null);

  const messages = await message.channel.messages.fetch({ limit: 100 });
  const lastMessage = messages
    .filter((m) => m.author.id === user.id)
    .sort((a, b) => b.createdTimestamp - a.createdTimestamp)
    .first();

  let voiceInfo = "Cette personne n'est pas en vocal.";
  if (member && member.voice && member.voice.channel) {
    voiceInfo = `<@${member.id}> est dans ${member.voice.channel.name}`;
  }

  const lastMessageText =
    lastMessage?.content && lastMessage.content.length > 0
      ? lastMessage.content
      : "*[embed/fichier]*";

  const finalEmbed = new EmbedBuilder().setColor(0xffffff).addFields(
    { name: "Vocal", value: voiceInfo },
    {
      name: "Dernier message (dans ce salon)",
      value: lastMessage
        ? `${lastMessageText}\n[Jump](${lastMessage.url})`
        : "Aucun message récent trouvé dans ce salon.",
    },
  );
  return message.reply({ embeds: [finalEmbed] });
};
