const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { convertTime } = require("../../../util/functions");
const { errorEmbed } = require("../../../util/embed");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("stats")
    .setDescription("Shows the bot's stats."),
  async execute(interaction, client) {
    const ping = interaction.createdTimestamp - Date.now();
    await interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setDescription(`<a:loading:1238468154502680586> Fetching stats...`)
          .setColor("#2b2d31"),
      ],
    });

    const promises = [
      client.shard.fetchClientValues("guilds.cache.size"),
      client.shard.broadcastEval((c) =>
        c.guilds.cache.reduce((acc, guild) => acc + guild.memberCount, 0)
      ),
    ];

    Promise.all(promises)
      .then((results) => {
        const totalGuilds = results[0].reduce(
          (acc, guildCount) => acc + guildCount,
          0
        );
        const totalMembers = results[1].reduce(
          (acc, memberCount) => acc + memberCount,
          0
        );
        const ramUsage = client.ramUsage;
        const cpuUsage = client.cpuUsage;
        const uptime = Date.now() - client.startTimestamp;

        if (ramUsage === undefined || cpuUsage === undefined) {
          return errorEmbed(
            interaction,
            "Irity is still starting up.",
            null,
            false
          );
        }

        const embed = new EmbedBuilder()
          .setTitle(`Irity Status`)
          .setColor("#2b2d31")
          .addFields(
            {
              name: "📶 Connection",
              value: `Latency: \`${ping}ms\`\nUptime: \`${convertTime(
                uptime
              )}\``,
              inline: true,
            },
            {
              name: "📊 Statistics",
              value: `Guilds: \`${totalGuilds}\`\nMembers: \`${totalMembers}\``,
              inline: true,
            },
            {
              name: "🖥️ System",
              value: `RAM: \`${ramUsage}%\`\nCPU: \`${cpuUsage}%\``,
              inline: true,
            }
          )
          .setFooter({
            text: `Requested by ${interaction.user.tag} |⚡${
              client.shard.ids[0] + 1
            }/${client.shard.count}`,
          });

        interaction.editReply({ embeds: [embed] });
      })
      .catch(console.error);
  },
};
