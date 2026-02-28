import dotenv from "dotenv";
dotenv.config();
import fs from "node:fs";
import path from "node:path";
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  Client,
  Collection,
  EmbedBuilder,
  Events,
  GatewayIntentBits,
  MessageFlags,
  PermissionFlagsBits,
} from "discord.js";
import { fileURLToPath } from "node:url";
import { handleFindCommand } from "./commands/find.js";

const TOKEN = process.env.TOKEN;
const PREFIX = process.env.PREFIX || "=";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CONFIG_PATH = path.join(__dirname, "counters.json");
const BLACKLIST_PATH = path.join(__dirname, "blacklist.json");

const APPEAL_GUILD_ID = process.env.APPEAL_GUILD_ID;
const UNBL_SUPPORT_ROLE_ID = "1476935225631178894";

function loadBlackList() {
  try {
    const raw = fs.readFileSync(BLACKLIST_PATH);
    return JSON.parse(raw);
  } catch {
    return { users: {} };
  }
}

function saveBlacklist(blacklist) {
  fs.writeFileSync(BLACKLIST_PATH, JSON.stringify(blacklist, null, 2), "utf-8");
}

function loadConfig() {
  try {
    const raw = fs.readFileSync(CONFIG_PATH, "utf-8");
    return JSON.parse(raw);
  } catch (err) {
    return { guilds: {} };
  }
}

function saveConfig(config) {
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), "utf-8");
}

const countersConfig = loadConfig();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

const blacklist = loadBlackList();
client.blacklist = blacklist;
client.saveBlacklist = () => saveBlacklist(client.blacklist);

client.saveBlacklistEntry = (userId, data) => {
  if (!client.blacklist.users) client.blacklist.users = {};
  client.blacklist.users[userId] = {
    ...(client.blacklist.users[userId] || {}),
    ...data,
  };
  client.saveBlacklist();
};

client.getBlacklistEntry = (userId) => {
  return client.blacklist.users?.[userId] || null;
};

client.on(Events.MessageCreate, async (message) => {
  if (message.author.bot) return;
  if (!message.guild) return;

  if (!message.content.startsWith(PREFIX)) return;

  const args = message.content.slice(PREFIX.length).trim().split(/\s+/);
  const commandName = args.shift()?.toLocaleLowerCase();

  if (commandName === "bl") {
    const member = message.member;
    if (!member.roles.cache.has("1476184863404200061")) {
      const errorreply = new EmbedBuilder()
        .setColor(0xffffff)
        .setDescription(
          `***Cette commande nécessite minimum la perm <@&1476184863404200061>***`,
        );
      message.reply({ embeds: [errorreply] });
      return;
    }

    const targetArg = args[0];
    const reason = args.slice(1).join(" ") || "Aucune raison fournie";

    if (!targetArg) {
      const errorreply = new EmbedBuilder()
        .setColor(0xffffff)
        .setDescription(`***Utilisation: =bl @user/ID raison***`);
      message.reply({ embeds: [errorreply] });
      return;
    }

    let user = null;
    if (message.mentions.users.size > 0) {
      user = message.mentions.users.first();
    } else if (/^\d{17,20}$/.test(targetArg)) {
      try {
        user = await client.users.fetch(targetArg);
      } catch {}
    }

    if (!user) {
      const errorreply = new EmbedBuilder()
        .setColor(0xffffff)
        .setDescription(`***Mentionner un ID ou un @***`);
      message.reply({ embeds: [errorreply] });
      return;
    }

    const mainGuild = message.guild;

    client.saveBlacklistEntry(user.id, {
      reason,
      by: message.author.id,
      at: Date.now(),
      status: "blacklisted",
    });

    try {
      const blInfo = new EmbedBuilder()
        .setColor(0xffffff)
        .setDescription(
          `Tu viens d'être **blacklist** du SECTEUR !\n Pour demander un unbl rend toi sur ce serveur et fais un ticket. ${process.env.APPEAL_INVITE}`,
        );
      await user.send({ embeds: [blInfo] });
    } catch {}

    await mainGuild.members.ban(user.id, { reason });
    const blInfo = new EmbedBuilder()
      .setColor(0xffffff)
      .setDescription(`***${user.tag} à été blacklist.***`);
    message.reply({ embeds: [blInfo] });
  }

  if (commandName === "unbl") {
    const member = message.member;
    if (!member.roles.cache.has("1476922016282972290")) {
      const errorreply = new EmbedBuilder()
        .setColor(0xffffff)
        .setDescription(
          `***Cette commande nécessite minimum la perm <@&1476922016282972290>***`,
        );
      message.reply({ embeds: [errorreply] });
      return;
    }

    const targetId = args[0];
    if (!/^\d{17,20}$/.test(targetId)) {
      return message.reply("Utilisation: `=unbl ID_USER`");
    }
    const entry = client.getBlacklistEntry(targetId);
    if (!entry || entry.status !== "blacklisted") {
      const errorreply = new EmbedBuilder()
        .setColor(0xffffff)
        .setDescription(`***Cet utilisateur n'est pas blacklist***`);
      message.reply({ embeds: [errorreply] });
      return;
    }

    const mainGuild = client.guilds.cache.get(process.env.GUILD_ID);
    if (!mainGuild) {
      const errorreply = new EmbedBuilder()
        .setColor(0xffffff)
        .setDescription(`***ERROR : SERVEUR PRINCIPAL INTROUVABLE***`);
      message.reply({ embeds: [errorreply] });
      return;
    }

    // Unban sur le serveur principal
    await mainGuild.members.unban(targetId).catch(() => null);

    // Mettre à jour la blacklist
    client.saveBlacklistEntry(targetId, {
      status: "unblacklisted",
      unblBy: message.author.id,
      unblAt: Date.now(),
    });

    // Essayer de DM l'utilisateur
    try {
      const user = await client.users.fetch(targetId);
      const unblInfo = new EmbedBuilder()
        .setColor(0xffffff)
        .setDescription(
          `Tu as été **unblacklist** du serveur **${mainGuild.name}**.\nVoici l'invitation: ${process.env.MAIN_INVITE}`,
        );
      await user.send({ embeds: [unblInfo] });
    } catch {}

    const succesEMbed = new EmbedBuilder()
      .setColor(0xffffff)
      .setDescription(`***utilisateur unbl.***`);
    return message.reply({ embeds: [succesEMbed] });
  }

  if (commandName === "find") {
    const member = message.member;
    if (!member.roles.cache.has("1469071689768767589")) {
      const errorreply = new EmbedBuilder()
        .setColor(0xffffff)
        .setDescription(
          `***Cette commande nécessite minimum la perm <@&1469071689768767589>***`,
        );
      message.reply({ embeds: [errorreply] });
      return;
    }
    await handleFindCommand(message, args);
    return;
  }

  // Setup UNBL via préfixe (sur le serveur UNBL uniquement)
  if (commandName === "setup-unbl") {
    if (!APPEAL_GUILD_ID || message.guild.id !== APPEAL_GUILD_ID) {
      return message.reply(
        "Cette commande doit être exécutée sur le serveur UNBL.",
      );
    }

    if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return message.reply(
        "Tu dois être administrateur pour utiliser cette commande.",
      );
    }

    const SUPPORT_CHANNEL_NAME = "│📩・support";

    let supportChannel = message.guild.channels.cache.find(
      (c) =>
        c.name === SUPPORT_CHANNEL_NAME &&
        c.type === ChannelType.GuildText,
    );

    if (!supportChannel) {
      supportChannel = await message.guild.channels.create({
        name: SUPPORT_CHANNEL_NAME,
        type: ChannelType.GuildText,
        permissionOverwrites: [
          {
            id: message.guild.id,
            deny: [
              PermissionFlagsBits.SendMessages,
              PermissionFlagsBits.AddReactions,
            ],
            allow: [PermissionFlagsBits.ViewChannel],
          },
          {
            id: message.client.user.id,
            allow: [
              PermissionFlagsBits.ViewChannel,
              PermissionFlagsBits.SendMessages,
            ],
          },
        ],
      });
    }

    const embed = new EmbedBuilder()
      .setColor(0xffffff)
      .setTitle("Support UNBL")
      .setDescription(
        "Pour demander un unblacklist, clique sur le bouton ci-dessous pour ouvrir un ticket.\n\n" +
          "Un membre du staff examinera ta demande.",
      );

    const button = new ButtonBuilder()
      .setCustomId("unbl_open_ticket")
      .setLabel("Ouvrir un ticket")
      .setStyle(ButtonStyle.Primary);

    const row = new ActionRowBuilder().addComponents(button);

    await supportChannel.send({ embeds: [embed], components: [row] });

    return message.reply(
      `Le salon ${supportChannel} est configuré pour le support UNBL.`,
    );
  }
});

client.countersConfig = countersConfig;
client.saveCountersConfig = () => saveConfig(client.countersConfig);

client.setGuildCounter = (guild, field, value) =>
  setGuildCounter(guild, field, value);

client.once(Events.ClientReady, (readyClient) => {
  console.log(`Ready! Logged in as ${readyClient.user.tag}`);
});

async function updateCountersForGuild(guild) {
  const counters = getGuildCounters(guild);

  if (counters.memberCounterChannelId) {
    const channel = guild.channels.cache.get(counters.memberCounterChannelId);
    if (channel) {
      const members = guild.memberCount;
      await channel.setName(`│🚀・Membres : ${members}`);
    }
  }

  if (counters.vocalCounterChannelId) {
    const channel = guild.channels.cache.get(counters.vocalCounterChannelId);
    if (channel) {
      const voiceChannels = guild.channels.cache.filter((c) =>
        c.isVoiceBased(),
      );
      let total = 0;
      for (const c of voiceChannels.values()) {
        total += c.members.size;
      }
      await channel.setName(`│🔈・Vocal : ${total}`);
    }
  }
  if (counters.boostCounterChannelId) {
    const boostChannel = guild.channels.cache.get(
      counters.boostCounterChannelId,
    );
    if (boostChannel) {
      const boosts = guild.premiumSubscriptionCount ?? 0;
      await boostChannel.setName(`│🔮・Boosts : ${boosts}`);
    }
  }
}

setInterval(
  async () => {
    try {
      for (const guild of client.guilds.cache.values()) {
        await updateCountersForGuild(guild);
      }
    } catch (err) {
      console.error(`Erreur : ${err}`);
    }
  },
  2 * 60 * 1000,
);

function getGuildCounters(guild) {
  const guildId = guild.id;
  const all = client.countersConfig.guilds || {};
  return all[guildId] || {};
}

const setGuildCounter = (guild, field, value) => {
  const guildId = guild.id;
  if (!client.countersConfig.guilds) {
    client.countersConfig.guilds = {};
  }
  if (!client.countersConfig.guilds[guildId]) {
    client.countersConfig.guilds[guildId] = {};
  }
  client.countersConfig.guilds[guildId][field] = value;
  client.saveCountersConfig();
};

// ---------- Gestion des tickets UNBL ----------

async function handleOpenUnblTicket(interaction) {
  const guild = interaction.guild;
  const user = interaction.user;

  if (!APPEAL_GUILD_ID || guild.id !== APPEAL_GUILD_ID) {
    return interaction.reply({
      content: "Ce bouton ne peut être utilisé que sur le serveur UNBL.",
      ephemeral: true,
    });
  }

  // Empêcher les doublons de ticket pour un même user
  const existing = guild.channels.cache.find(
    (c) =>
      c.type === ChannelType.GuildText &&
      c.topic === `UNBL ticket for ${user.id}`,
  );
  if (existing) {
    return interaction.reply({
      content: `Tu as déjà un ticket ouvert : ${existing}.`,
      ephemeral: true,
    });
  }

  const channel = await guild.channels.create({
    name: `ticket-unbl-${user.username}`,
    type: ChannelType.GuildText,
    topic: `UNBL ticket for ${user.id}`,
    permissionOverwrites: [
      {
        id: guild.id,
        deny: [PermissionFlagsBits.ViewChannel],
      },
      {
        id: user.id,
        allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages],
      },
      {
        id: UNBL_SUPPORT_ROLE_ID,
        allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages],
      },
      {
        id: guild.client.user.id,
        allow: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.SendMessages,
          PermissionFlagsBits.ManageChannels,
        ],
      },
    ],
  });

  const embed = new EmbedBuilder()
    .setColor(0xffffff)
    .setTitle("Ticket UNBL")
    .setDescription(
      `Ticket ouvert par <@${user.id}>.\n` +
        "Explique clairement pourquoi tu demandes un unblacklist.",
    );

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("unbl_claim")
      .setLabel("Claim")
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId("unbl_unclaim")
      .setLabel("Unclaim")
      .setStyle(ButtonStyle.Secondary),
  );

  await channel.send({
    content: `<@&${UNBL_SUPPORT_ROLE_ID}>`,
    embeds: [embed],
    components: [row],
  });

  return interaction.reply({
    content: `Ticket créé : ${channel}`,
    ephemeral: true,
  });
}

async function handleClaimUnblTicket(interaction) {
  const guild = interaction.guild;
  const member = interaction.member;
  const channel = interaction.channel;

  if (!channel.topic || !channel.topic.startsWith("UNBL ticket for ")) {
    return interaction.reply({
      content: "Ce salon n'est pas un ticket UNBL.",
      ephemeral: true,
    });
  }

  if (!member.roles.cache.has(UNBL_SUPPORT_ROLE_ID)) {
    return interaction.reply({
      content: "Tu n'as pas la permission de claim ce ticket.",
      ephemeral: true,
    });
  }

  await channel.permissionOverwrites.edit(UNBL_SUPPORT_ROLE_ID, {
    ViewChannel: false,
    SendMessages: false,
  });

  await channel.permissionOverwrites.edit(member.id, {
    ViewChannel: true,
    SendMessages: true,
  });

  return interaction.reply(`${member} a claim ce ticket.`);
}

async function handleUnclaimUnblTicket(interaction) {
  const guild = interaction.guild;
  const member = interaction.member;
  const channel = interaction.channel;

  if (!channel.topic || !channel.topic.startsWith("UNBL ticket for ")) {
    return interaction.reply({
      content: "Ce salon n'est pas un ticket UNBL.",
      ephemeral: true,
    });
  }

  if (!member.roles.cache.has(UNBL_SUPPORT_ROLE_ID)) {
    return interaction.reply({
      content: "Tu n'as pas la permission de unclaim ce ticket.",
      ephemeral: true,
    });
  }

  await channel.permissionOverwrites.edit(UNBL_SUPPORT_ROLE_ID, {
    ViewChannel: true,
    SendMessages: true,
  });

  await channel.permissionOverwrites.delete(member.id).catch(() => null);

  return interaction.reply(`${member} a unclaim ce ticket.`);
}

client.commands = new Collection();

// Chargement dynamique des commandes depuis le dossier "commands"
const commandsPath = path.join(__dirname, "commands");
const commandFiles = fs
  .readdirSync(commandsPath)
  .filter((file) => file.endsWith(".js"));

console.log(`FOLDER : ${commandsPath}`);
console.log(`COMMAND FILES : ${commandFiles}`);

for (const file of commandFiles) {
  const filePath = path.join(commandsPath, file);
  const imported = await import(filePath);
  const command = imported.default ?? imported;

  if ("data" in command && "execute" in command) {
    client.commands.set(command.data.name, command);
  } else {
    console.log(`Attention, commande invalide : ${filePath}`);
  }
}

// Gestion générique des interactions (slash commands + boutons)
client.on(Events.InteractionCreate, async (interaction) => {
  // Slash commands
  if (interaction.isChatInputCommand()) {
    const command = interaction.client.commands.get(interaction.commandName);
    if (!command) {
      return;
    }

    try {
      await command.execute(interaction);
    } catch (error) {
      console.error(error);
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({
          content: "There was an error while executing this command!",
          flags: MessageFlags.Ephemeral,
        });
      } else {
        await interaction.reply({
          content: "There was an error while executing this command!",
          flags: MessageFlags.Ephemeral,
        });
      }
    }
    return;
  }

  // Boutons pour le système de tickets UNBL
  if (interaction.isButton()) {
    if (interaction.customId === "unbl_open_ticket") {
      await handleOpenUnblTicket(interaction);
    } else if (interaction.customId === "unbl_claim") {
      await handleClaimUnblTicket(interaction);
    } else if (interaction.customId === "unbl_unclaim") {
      await handleUnclaimUnblTicket(interaction);
    }
  }
});

// Chargement dynamique des events depuis le dossier "events"
const eventsPath = path.join(__dirname, "events");
if (fs.existsSync(eventsPath)) {
  const eventFiles = fs
    .readdirSync(eventsPath)
    .filter((file) => file.endsWith(".js"));

  for (const file of eventFiles) {
    const filePath = path.join(eventsPath, file);
    const imported = await import(filePath);
    const event = imported.default ?? imported;

    if (!event || !event.name || !event.execute) {
      console.log(`Attention, event invalide : ${filePath}`);
      continue;
    }

    if (event.once) {
      client.once(event.name, (...args) => event.execute(...args));
    } else {
      client.on(event.name, (...args) => event.execute(...args));
    }
  }
}

client.login(TOKEN);
