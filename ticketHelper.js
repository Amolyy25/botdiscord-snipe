import {
  ActionRowBuilder,
  AttachmentBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  EmbedBuilder,
  PermissionFlagsBits,
} from "discord.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CONFIG = {
  LOG_CHANNEL_ID: "1480295683687846008",
  TICKET_TYPES: {
    ticket_general: {
      name: "Général",
      prefix: "general",
      category: "1469071691161534685",
      roles: ["1474736793063657482"], // Staff
    },
    ticket_abus: {
      name: "Abus Staff",
      prefix: "abus",
      category: "1474750604260937839",
      roles: ["1469071689831940308"], // Haute Direction
    },
    ticket_owner: {
      name: "Owner",
      prefix: "owner",
      category: "1474750695029604393",
      roles: ["1469071689831940308"], // Admins handled as "Haute Direction"
    },
  },
  ADMIN_ROLES: ["1469071689831940308"], // Haute Direction / Admin role that should always see
};

export async function handleOpenTicket(interaction) {
  const { customId, guild, user } = interaction;
  const config = CONFIG.TICKET_TYPES[customId];

  if (!config) return;

  // Check if user already has an open ticket in the new system or UNBL system
  const anyExistingTicket = guild.channels.cache.find((c) => {
    const topic = c.topic || "";
    return (
      (topic.includes(`Ticket ID: ${user.id}`) ||
        topic.includes(`UNBL ticket for ${user.id}`)) &&
      c.type === ChannelType.GuildText
    );
  });

  if (anyExistingTicket) {
    return interaction.reply({
      content: `Vous avez déjà un ticket ouvert : ${anyExistingTicket}.`,
      ephemeral: true,
    });
  }

  const cleanUsername = user.username.toLowerCase().replace(/[^a-z0-9]/g, "");
  const channelName = `${config.prefix}-${cleanUsername}`;

  const permissionOverwrites = [
    {
      id: guild.id,
      deny: [PermissionFlagsBits.ViewChannel],
    },
    {
      id: user.id,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.AttachFiles,
        PermissionFlagsBits.EmbedLinks,
        PermissionFlagsBits.ReadMessageHistory,
      ],
    },
    {
      id: guild.client.user.id,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ManageChannels,
        PermissionFlagsBits.ManageMessages,
      ],
    },
  ];

  // Add category roles
  config.roles.forEach((roleId) => {
    permissionOverwrites.push({
      id: roleId,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ReadMessageHistory,
      ],
    });
  });

  // Add Admins to all tickets (except owner tickets where they are the primary handlers anyway)
  CONFIG.ADMIN_ROLES.forEach((roleId) => {
    if (!config.roles.includes(roleId)) {
      permissionOverwrites.push({
        id: roleId,
        allow: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.SendMessages,
          PermissionFlagsBits.ReadMessageHistory,
        ],
      });
    }
  });

  const channel = await guild.channels.create({
    name: channelName,
    type: ChannelType.GuildText,
    parent: config.category,
    topic: `Ticket ID: ${user.id} | Type: ${config.name}`,
    permissionOverwrites,
  });

  const welcomeEmbed = new EmbedBuilder()
    .setColor(0x2b2d31)
    .setTitle(`Ticket ${config.name}`)
    .setDescription(
      `Bienvenue <@${user.id}> dans votre ticket.\n` +
        "Un membre du personnel va s'occuper de vous sous peu.\n\n" +
        "Utilisez le bouton ci-dessous pour qu'un modérateur prenne en charge le ticket."
    )
    .setFooter({ text: "Secteur - Système de Support" });

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("ticket_claim")
      .setLabel("Prendre en charge")
      .setEmoji("🙋‍♂️")
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId("ticket_close")
      .setLabel("Fermer")
      .setEmoji("🔒")
      .setStyle(ButtonStyle.Danger)
  );

  await channel.send({
    content: `<@${user.id}> | ${config.roles.map(r => `<@&${r}>`).join(" ")}`,
    embeds: [welcomeEmbed],
    components: [row],
  });

  return interaction.reply({
    content: `Votre ticket a été créé : ${channel}`,
    ephemeral: true,
  });
}

export async function handleClaimTicket(interaction) {
  const { channel, member, guild } = interaction;
  
  if (!channel.topic?.includes("Ticket ID:")) {
    return interaction.reply({ content: "Ce n'est pas un ticket.", ephemeral: true });
  }

  const topicParts = channel.topic.split("|");
  const authorId = topicParts[0].split(":")[1].trim();
  const ticketTypeStr = topicParts[1].split(":")[1].trim();

  // Find ticket type config
  const ticketType = Object.values(CONFIG.TICKET_TYPES).find(t => t.name === ticketTypeStr);
  
  if (!ticketType) return;

  // Check if member is staff for this ticket
  const isStaff = member.roles.cache.some(r => ticketType.roles.includes(r.id)) || 
                  member.permissions.has(PermissionFlagsBits.Administrator) ||
                  CONFIG.ADMIN_ROLES.some(r => member.roles.cache.has(r));

  if (!isStaff) {
    return interaction.reply({ content: "Vous n'avez pas la permission de claim ce ticket.", ephemeral: true });
  }

  // Check if already claimed
  if (channel.name.startsWith("claimed-")) {
    return interaction.reply({ content: "Ce ticket est déjà pris en charge.", ephemeral: true });
  }

  // Update permissions
  // 1. Remove access for general roles
  for (const roleId of ticketType.roles) {
    await channel.permissionOverwrites.edit(roleId, {
      ViewChannel: false,
      SendMessages: false,
    });
  }

  // 2. Ensure Author, Admin, and Claimer have access
  await channel.permissionOverwrites.edit(authorId, {
    ViewChannel: true,
    SendMessages: true,
  });

  await channel.permissionOverwrites.edit(member.id, {
    ViewChannel: true,
    SendMessages: true,
  });

  // Keep Admin access (except if it was specified elsewise)
  // Actually, user said: "sauf pour les tickets Owner" for high hierarchy.
  // Wait, re-reading: "les rôles de haute hiérarchie (Admin) gardent toujours la vue sur tous les tickets, même si un staff a cliqué sur "Claim" (sauf pour les tickets Owner)."
  if (ticketTypeStr !== "Owner") {
    for (const roleId of CONFIG.ADMIN_ROLES) {
      await channel.permissionOverwrites.edit(roleId, {
        ViewChannel: true,
        SendMessages: true,
      });
    }
  }

  // Rename channel to indicate it's claimed
  await channel.setName(`claim-${channel.name}`);

  // Change components to remove claim button
  const closeButton = new ButtonBuilder()
    .setCustomId("ticket_close")
    .setLabel("Fermer")
    .setEmoji("🔒")
    .setStyle(ButtonStyle.Danger);
  
  const row = new ActionRowBuilder().addComponents(closeButton);
  
  await interaction.message.edit({ components: [row] });

  return interaction.reply({
    content: `Ce ticket est désormais géré exclusivement par ${member}.`,
  });
}

export async function handleCloseTicket(interaction) {
  const closeEmbed = new EmbedBuilder()
    .setColor(0xd9534f)
    .setTitle("Confirmation de fermeture")
    .setDescription("Êtes-vous sûr de vouloir fermer ce ticket ?");

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("ticket_close_confirm")
      .setLabel("Confirmer")
      .setStyle(ButtonStyle.Danger),
    new ButtonBuilder()
      .setCustomId("ticket_close_cancel")
      .setLabel("Annuler")
      .setStyle(ButtonStyle.Secondary)
  );

  return interaction.reply({
    embeds: [closeEmbed],
    components: [row],
  });
}

export async function handleCloseConfirm(interaction) {
  const { channel, guild } = interaction;

  if (!channel.topic?.includes("Ticket ID:")) return;

  await interaction.reply("Fermeture du ticket et génération du transcript...");

  // Generate Transcript
  const messages = await channel.messages.fetch({ limit: 100 });
  let transcript = `Transcript for ${channel.name}\n\n`;
  
  const sortedMessages = messages.sort((a, b) => a.createdTimestamp - b.createdTimestamp);
  
  sortedMessages.forEach(msg => {
    const timestamp = msg.createdAt.toLocaleString();
    transcript += `[${timestamp}] ${msg.author.tag}: ${msg.content}\n`;
    if (msg.attachments.size > 0) {
      msg.attachments.forEach(att => {
        transcript += `Attachment: ${att.url}\n`;
      });
    }
  });

  const fileName = `transcript-${channel.name}.txt`;
  const filePath = path.join("/tmp", fileName);
  fs.writeFileSync(filePath, transcript);

  const attachment = new AttachmentBuilder(filePath);

  const logChannel = guild.channels.cache.get(CONFIG.LOG_CHANNEL_ID);
  if (logChannel) {
    const logEmbed = new EmbedBuilder()
      .setColor(0x2b2d31)
      .setTitle("Ticket Fermé")
      .addFields(
        { name: "Nom du Salon", value: channel.name, inline: true },
        { name: "Fermé par", value: interaction.user.tag, inline: true }
      );
    
    await logChannel.send({ embeds: [logEmbed], files: [attachment] });
  }

  // Delete file
  setTimeout(() => {
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  }, 5000);

  // Delete channel
  await channel.delete();
}

export async function handleCloseCancel(interaction) {
  return interaction.message.delete();
}

export async function handleAddTicket(message, args) {
  if (!message.channel.topic?.includes("Ticket ID:")) {
    return message.reply("Cette commande ne peut être utilisée que dans un ticket.");
  }

  // Check for Staff or Admin roles
  const hasStaffRole = message.member.roles.cache.has("1474736793063657482") || 
                       message.member.roles.cache.has("1469071689831940308") ||
                       message.member.permissions.has(PermissionFlagsBits.Administrator);

  if (!hasStaffRole) {
    return message.reply("❌ Vous n'avez pas la permission d'ajouter quelqu'un à un ticket.");
  }

  const targetId = args[0]?.replace(/[<@!>]/g, "");
  if (!targetId) {
    return message.reply("Veuillez mentionner un membre ou donner son ID.");
  }

  const target = await message.guild.members.fetch(targetId).catch(() => null);
  
  if (!target) {
    return message.reply("Membre introuvable.");
  }

  await message.channel.permissionOverwrites.edit(target.id, {
    ViewChannel: true,
    SendMessages: true,
    ReadMessageHistory: true,
  });

  return message.reply(`✅ **${target.user.tag}** a été ajouté au ticket.`);
}

export async function handleRemoveTicket(message, args) {
  if (!message.channel.topic?.includes("Ticket ID:")) {
    return message.reply("Cette commande ne peut être utilisée que dans un ticket.");
  }

  // Check for Staff or Admin roles
  const hasStaffRole = message.member.roles.cache.has("1474736793063657482") || 
                       message.member.roles.cache.has("1469071689831940308") ||
                       message.member.permissions.has(PermissionFlagsBits.Administrator);

  if (!hasStaffRole) {
    return message.reply("❌ Vous n'avez pas la permission de retirer quelqu'un d'un ticket.");
  }

  const targetId = args[0]?.replace(/[<@!>]/g, "");
  if (!targetId) {
    return message.reply("Veuillez mentionner un membre ou donner son ID.");
  }

  const target = await message.guild.members.fetch(targetId).catch(() => null);
  
  if (!target) {
    return message.reply("Membre introuvable.");
  }

  await message.channel.permissionOverwrites.delete(target.id);

  return message.reply(`❌ **${target.user.tag}** a été retiré du ticket.`);
}
