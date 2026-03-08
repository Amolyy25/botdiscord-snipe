import {
  EmbedBuilder,
  SlashCommandBuilder,
  PermissionFlagsBits,
} from "discord.js";

// Mapping the same permission IDs as used in setupcommu
const PERM_V_ROLE_ID = "1469071689768767589"; 
const SOUVERAIN_ROLE_ID = "1469071689831940308"; 

export const handleSetupSoutien = async (message) => {
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
    .setTitle("SOUTIEN DU SECTEUR ღ")
    .setDescription(
      "Si vous décidez de soutenir notre serveur, nous vous récompenserons :\n\n" +
      "・<@&1471251878175309985> en mettant « .gg/CXCeH6cwpC » en statut Discord.\n\n" +
      "・ <@&1469071689399926791> en utilisant le tag ᴢᴏиᴇ avec les accès ;boost au dans <#1469071692348264634>, +1,5% xp, by pass slow mode dans <#1469071691941412962>, -clown du bot lana, 1 tirage par semaine en plus dans <#1469071692348264634>.\n\n" +
      "・<@&1469314101615398995> commande -pic, -banner, -fake, msg vocal, perm image, ;boost dans <#1469071692348264634>, +2,5% xp, by pass slow mode dans <#1469071691941412962>, 2 tirages par semaine en plus.\n\n" +
      "Merci à tous ceux qui le feront, vous êtes les piliers."
    );

  await message.channel.send({
    embeds: [embed]
  });

  // Delete command message to keep channel clean
  await message.delete().catch(() => null);
};

const setupsoutien = {
  data: new SlashCommandBuilder()
    .setName("setupsoutien")
    .setDescription("Configure le message de récompenses soutien")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  async execute(interaction) {
    await handleSetupSoutien(interaction);
  },
};

export default setupsoutien;
