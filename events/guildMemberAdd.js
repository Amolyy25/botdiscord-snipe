import { Events, ChannelType } from "discord.js";

const guildMemberAdd = {
  name: Events.GuildMemberAdd,
  async execute(member) {
    const CHANNEL_NAME = "│🛎️・accueil";
    
    // On cherche le salon par son nom
    const channel = member.guild.channels.cache.find(
      (c) => c.name === CHANNEL_NAME && c.type === ChannelType.GuildText
    );

    if (channel) {
      try {
        // Envoie du ping seul
        const msg = await channel.send(`<@${member.id}>`);
        
        // Suppression après 2 secondes
        setTimeout(() => {
          msg.delete().catch(() => null);
        }, 2000);
      } catch (err) {
        console.error(`[JoinPing] Erreur : ${err}`);
      }
    }
  },
};

export default guildMemberAdd;
