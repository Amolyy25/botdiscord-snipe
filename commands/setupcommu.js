import {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  SlashCommandBuilder,
  PermissionFlagsBits,
} from "discord.js";

// TODO: Replace with the actual IDs if different
const PERM_V_ROLE_ID = "1469071689768767589"; 
const SOUVERAIN_ROLE_ID = "1469071689831940308"; 

export const handleSetupCommu = async (message) => {
  const member = message.member;
  
  // Permission check: Perm V OR Souverain
  const hasPerm = member.roles.cache.has(PERM_V_ROLE_ID) || 
                  member.roles.cache.has(SOUVERAIN_ROLE_ID) ||
                  member.permissions.has(PermissionFlagsBits.Administrator);

  if (!hasPerm) {
    return message.reply("❌ Vous n'avez pas la permission d'utiliser cette commande.");
  }

  const embed = new EmbedBuilder()
    .setColor("#FFFFFF")
    .setTitle("ACCES AU SECTEUR COMMU+")
    .setDescription(
      "> L'adhésion à la catégorie Commu+ vous donne accès à un espace d'échange privilégié et aux salons suivants :\n\n" +
      "**Art :** Partagez vos créations et vos inspirations artistiques.\n" +
      "**Presentation :** Introduisez-vous auprès des autres membres de la communauté.\n" +
      "**Anecdote :** Racontez vos histoires et moments marquants.\n" +
      "**Vote2Profil :** Soumettez votre profil Discord aux votes des membres pour évaluer son esthétique.\n" +
      "**Les Dossiers :** Archivez les moments et échanges les plus marquants du serveur.\n" +
      "**Confession :** Espace dédié pour partager vos pensées de manière anonyme.\n\n" +
      "Pour rejoindre cet espace et obtenir les accès nécessaires, cliquez sur le bouton ci-dessous."
    );

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("commu_join")
      .setLabel("REJOINDRE")
      .setStyle(ButtonStyle.Secondary)
  );

  await message.channel.send({
    embeds: [embed],
    components: [row],
  });

  // Delete command message to keep channel clean
  await message.delete().catch(() => null);
};

const setupcommu = {
  data: new SlashCommandBuilder()
    .setName("setupcommu")
    .setDescription("Configure le message d'accès Commu+")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles),
  async execute(interaction) {
    // For consistency, though primarily used via prefix
    await handleSetupCommu(interaction);
  },
};

export default setupcommu;
