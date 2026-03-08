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
import { handleSetupStats } from "./commands/setupstats.js";
import { handleStatsCommand } from "./commands/stats.js";
import { handleSetupAccueil } from "./commands/setupaccueil.js";
import {
  initStatsDB,
  recordTextMessage,
  recordVoiceMinutes,
  getTopText,
  getTopVoice,
  getAllStatsSetups,
  getTotalVoiceMinutes,
  purgeOldStats,
} from "./statsHelper.js";
import {
  handleOpenTicket,
  handleClaimTicket,
  handleCloseTicket,
  handleCloseConfirm,
  handleCloseCancel,
  handleAddTicket,
  handleRemoveTicket,
} from "./ticketHelper.js";

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

// ---------------------------------------------------------------------------
// Stats texte — comptabilise les messages valides (hors bots, hors commandes, >= 5 chars)
// ---------------------------------------------------------------------------
client.on(Events.MessageCreate, async (message) => {
  if (!message.author.bot && message.guild) {
    const content = message.content.trim();
    const isCommand = content.startsWith(PREFIX) || content.startsWith("/");
    if (!isCommand && content.length >= 5) {
      recordTextMessage(message.guild.id, message.author.id).catch(() => {});
    }
  }
});

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

  if (commandName === "setupstats") {
    await handleSetupStats(message);
    return;
  }

  if (commandName === "setupaccueil") {
    await handleSetupAccueil(message);
    return;
  }

  if (commandName === "addticket") {
    await handleAddTicket(message, args);
    return;
  }

  if (commandName === "removeticket") {
    await handleRemoveTicket(message, args);
    return;
  }

  if (commandName === "stats") {
    await handleStatsCommand(message, args);
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

client.once(Events.ClientReady, async (readyClient) => {
  console.log(`Ready! Logged in as ${readyClient.user.tag}`);
  await initStatsDB();

  // Initialisation des sessions actives pour les membres déjà en vocal
  for (const guild of readyClient.guilds.cache.values()) {
    for (const channel of guild.channels.cache.values()) {
      if (channel.isVoiceBased()) {
        for (const member of channel.members.values()) {
          if (!member.user.bot) {
            activeSessions.set(member.id, { guildId: guild.id });
          }
        }
      }
    }
  }

  startVoiceTracker();
  startVoiceLevelCron();
  startStatsCronJob();
});

async function updateCountersForGuild(guild) {
  const counters = getGuildCounters(guild);

  if (counters.memberCounterChannelId) {
    const channel = guild.channels.cache.get(counters.memberCounterChannelId);
    if (channel) {
      const members = guild.members.cache.filter((m) => !m.user.bot).size;
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

// ---------------------------------------------------------------------------
// Tracking vocal en mémoire
// Map: userId => { guildId, joinTime }
// ---------------------------------------------------------------------------
const activeSessions = new Map();

const VOICE_LEVELS = [
  { minutes: 180, roleId: "1479419239176736789", name: "Murmure d'Argent", unlock: "" },
  { minutes: 300, roleId: "1474150157216907446", name: "Cristal", unlock: "Salon VIP" },
  { minutes: 600, roleId: "1474149468176912497", name: "Aura Divine", unlock: "Perm I", extraRole: "1469071689756442805" },
  { minutes: 1200, roleId: "1473735200604426416", name: "Ciel Rosé", unlock: "-banner" },
  { minutes: 1800, roleId: "1474149732124463379", name: "Spectre d'Or", unlock: "-pic" },
  { minutes: 3000, roleId: "1473734999608918077", name: "Bras Droit", unlock: "-fake" },
];

function isValidVoiceSession(member, channel) {
  if (!member || !channel) return false;
  // doit avoir au moins 1 autre humain
  const humans = channel.members.filter((m) => !m.user.bot);
  if (humans.size < 2) return false;
  // ne doit pas être mute/deafened (côté serveur ou client)
  if (
    member.voice.mute ||
    member.voice.deaf ||
    member.voice.selfMute ||
    member.voice.selfDeaf
  )
    return false;
  return true;
}

function startVoiceTracker() {
  // Tick toutes les 60 secondes pour tracker 1 minute de vocal
  setInterval(async () => {
    for (const [userId, session] of activeSessions.entries()) {
      try {
        const guild = client.guilds.cache.get(session.guildId);
        if (!guild) continue;
        const member = await guild.members.fetch(userId).catch(() => null);
        if (!member || !member.voice.channel) {
          activeSessions.delete(userId);
          continue;
        }
        if (isValidVoiceSession(member, member.voice.channel)) {
          await recordVoiceMinutes(session.guildId, userId, 1);
        }
      } catch {
        // silencieux
      }
    }
  }, 60 * 1000);
}

async function checkVoiceLevels() {
  console.log("[VoiceLevel] Vérification des rôles...");
  for (const guild of client.guilds.cache.values()) {
    const voiceChannels = guild.channels.cache.filter((c) => c.isVoiceBased());
    const membersInVoice = new Set();

    for (const channel of voiceChannels.values()) {
      for (const member of channel.members.values()) {
        if (!member.user.bot) {
          membersInVoice.add(member);
        }
      }
    }

    for (const member of membersInVoice) {
      try {
        const totalMinutes = await getTotalVoiceMinutes(guild.id, member.id);
        const memberRoles = member.roles.cache;

        for (const level of VOICE_LEVELS) {
          if (totalMinutes >= level.minutes) {
            let addedAny = false;

            // Ajouter le rôle principal si manquant
            if (!memberRoles.has(level.roleId)) {
              await member.roles.add(level.roleId).catch(() => null);
              addedAny = true;
            }

            // Ajouter le rôle extra si spécifié (ex: Perm I)
            if (level.extraRole && !memberRoles.has(level.extraRole)) {
              await member.roles.add(level.extraRole).catch(() => null);
              addedAny = true;
            }

            // Notification si on vient d'ajouter un rôle
            if (addedAny) {
              const voiceChannel = member.voice.channel;
              if (voiceChannel && voiceChannel.id) {
                const embed = new EmbedBuilder()
                  .setColor(0xffffff)
                  .setTitle("PALLIER ATTEINT !")
                  .setDescription(
                    `Félicitations <@${member.id}>, tu as passé le palier des **${Math.floor(level.minutes / 60)}h** de vocal !`,
                  )
                  .addFields({
                    name: "Récompense",
                    value: `Rôle: **${level.name}**${level.unlock ? `\nUnlock: **${level.unlock}**` : ""}`,
                  })
                  .setFooter({ text: "Ce message se supprimera dans 10 secondes." });

                // Envoyer dans le chat du salon vocal
                try {
                  const msg = await voiceChannel.send({ embeds: [embed] });
                  setTimeout(() => msg.delete().catch(() => null), 10000);
                } catch {
                  // Fallback si pas de permission d'envoyer dans le vocal (certaines configs Discord)
                }
              }
            }
          }
        }
      } catch (err) {
        console.error(
          `Erreur checkVoiceLevels pour ${member.user.tag}: ${err.message}`,
        );
      }
    }
  }
}

function startVoiceLevelCron() {
  // Toutes les 10 minutes
  setInterval(() => checkVoiceLevels(), 10 * 60 * 1000);
  // Un premier check au démarrage
  setTimeout(() => checkVoiceLevels(), 15000);
}

// Rejoindre / quitter un vocal
client.on(Events.VoiceStateUpdate, (oldState, newState) => {
  const userId = newState.member?.user?.id || oldState.member?.user?.id;
  if (!userId) return;
  const member = newState.member || oldState.member;
  if (member?.user?.bot) return;

  const joined = !oldState.channel && newState.channel;
  const left = oldState.channel && !newState.channel;
  const moved = oldState.channel && newState.channel && oldState.channel.id !== newState.channel.id;

  if (joined || moved) {
    activeSessions.set(userId, {
      guildId: newState.guild.id,
    });
  } else if (left) {
    activeSessions.delete(userId);
  }
});

// ---------------------------------------------------------------------------
// Cron job — mise à jour de l'embed toutes les 60 minutes
// ---------------------------------------------------------------------------
async function buildStatsEmbed(guild, topText, topVoice) {
  const resolveUsername = async (userId) => {
    try {
      const member = await guild.members.fetch(userId).catch(() => null);
      if (member) return member.displayName;
      const user = await guild.client.users.fetch(userId).catch(() => null);
      return user ? user.username : `Utilisateur`;
    } catch {
      return `Utilisateur`;
    }
  };

  // Top textuel
  let textLines = "";
  if (topText.length === 0) {
    textLines = "*Aucune donnée*";
  } else {
    for (let i = 0; i < topText.length; i++) {
      const row = topText[i];
      const name = await resolveUsername(row.user_id);
      const rank = String(i + 1).padStart(2, "0");
      textLines += `${rank}. ${name} — ${row.total} messages\n`;
    }
  }

  // Top vocal
  let voiceLines = "";
  if (topVoice.length === 0) {
    voiceLines = "*Aucune donnée*";
  } else {
    for (let i = 0; i < topVoice.length; i++) {
      const row = topVoice[i];
      const name = await resolveUsername(row.user_id);
      const rank = String(i + 1).padStart(2, "0");
      const totalMin = parseInt(row.total_minutes, 10);
      const hours = Math.floor(totalMin / 60);
      const mins = totalMin % 60;
      const timeStr = hours > 0 ? `${hours}h ${mins}min` : `${mins}min`;
      voiceLines += `${rank}. ${name} — ${timeStr}\n`;
    }
  }

  return new EmbedBuilder()
    .setColor(0xffffff)
    .setTitle("CLASSEMENT ACTIVITE | 14 JOURS")
    .addFields(
      {
        name: "TOP 10 TEXTUEL",
        value: textLines.trim() || "*Aucune donnée*",
        inline: true,
      },
      {
        name: "TOP 10 VOCAL",
        value: voiceLines.trim() || "*Aucune donnée*",
        inline: true,
      }
    )
    .setFooter({
      text: "Actualise toutes les heures. La performance est la seule règle.",
    });
}

async function updateStatsEmbeds() {
  const setups = await getAllStatsSetups().catch(() => []);
  for (const setup of setups) {
    try {
      const guild = client.guilds.cache.get(setup.guild_id);
      if (!guild) continue;
      const channel = guild.channels.cache.get(setup.channel_id);
      if (!channel) continue;
      const msg = await channel.messages.fetch(setup.message_id).catch(() => null);
      if (!msg) continue;

      const [topText, topVoice] = await Promise.all([
        getTopText(setup.guild_id),
        getTopVoice(setup.guild_id),
      ]);

      const embed = await buildStatsEmbed(guild, topText, topVoice);
      await msg.edit({ embeds: [embed] });
    } catch (err) {
      console.error(`[Stats] Erreur mise à jour embed: ${err}`);
    }
  }
  await purgeOldStats().catch(() => {});
}

function startStatsCronJob() {
  // Première mise à jour 5 secondes après le démarrage
  setTimeout(() => updateStatsEmbeds(), 5000);
  // Puis toutes les 60 minutes
  setInterval(() => updateStatsEmbeds(), 60 * 60 * 1000);
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
    } else if (["ticket_general", "ticket_abus", "ticket_owner"].includes(interaction.customId)) {
      await handleOpenTicket(interaction);
    } else if (interaction.customId === "ticket_claim") {
      await handleClaimTicket(interaction);
    } else if (interaction.customId === "ticket_close") {
      await handleCloseTicket(interaction);
    } else if (interaction.customId === "ticket_close_confirm") {
      await handleCloseConfirm(interaction);
    } else if (interaction.customId === "ticket_close_cancel") {
      await handleCloseCancel(interaction);
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
