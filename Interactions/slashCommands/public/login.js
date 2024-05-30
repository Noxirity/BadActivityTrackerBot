const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");
const databaseService = require("../../../services/databaseService");
const embeds = require("../../../util/embed");
const crypto = require("crypto");
const EXPIRATION_TIME = 15 * 60 * 1000; // 15 minutes

module.exports = {
  data: new SlashCommandBuilder()
    .setName("account")
    .setDescription("Testing command for Roblox OAuth2 login"),
  async execute(interaction, client) {
    await interaction.deferReply({ ephemeral: true });
    const database = await databaseService.getDatabase("RobloxOAuth");
    const collection = database.collection("users");
    const existingUser = await collection.findOne({
      discord_id: interaction.user.id,
    });

    let roblox_ids = existingUser ? existingUser.roblox_ids : [];
    roblox_ids = roblox_ids || [];
    if (roblox_ids.length <= 0) {
      let random_id;
      function generateRandomId() {
        return crypto.randomBytes(20).toString("hex");
      }

      if (existingUser) {
        if (
          !existingUser.login_id_expires ||
          existingUser.login_id_expires - Date.now() < 5 * 60 * 1000
        ) {
          random_id = generateRandomId();

          await collection.updateOne(
            { discord_id: interaction.user.id },
            {
              $set: {
                discord_name: interaction.user.username,
                login_id: random_id,
                login_id_expires: Date.now() + EXPIRATION_TIME,
              },
            }
          );
        } else {
          random_id = existingUser.login_id;
        }
      } else {
        random_id = generateRandomId();

        await collection.insertOne({
          discord_id: interaction.user.id,
          discord_name: interaction.user.username,
          login_id: random_id,
          login_id_expires: Date.now() + EXPIRATION_TIME,
        });
      }

      const actionRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setStyle(ButtonStyle.Link)
          .setURL(`https://auth.noxirity.com/login?i=${random_id}`)
          .setLabel("Login with Roblox")
      );

      await interaction.editReply({
        components: [actionRow],
        ephemeral: true,
      });

      const changeStream = collection.watch(
        [
          {
            $match: {
              "updateDescription.updatedFields.roblox_ids": { $exists: true },
              operationType: "update",
            },
          },
        ],
        { fullDocument: "updateLookup" }
      );

      let verified = false;
      let timeout;

      changeStream.on("change", async (change) => {
        const user = change.fullDocument;
        const roblox_ids = user.roblox_ids || [];
        if (user.discord_id !== interaction.user.id) return;

        if (roblox_ids.length > 0) {
          const roblox = roblox_ids[roblox_ids.length - 1];

          await embeds.successEmbed(
            interaction,
            `You have successfully linked [@${roblox[1]}](https://www.roblox.com/users/${roblox[0]}/profile) to your account!`,
            "You can now use the /account command to view your linked accounts.",
            true
          );

          clearTimeout(timeout);
          changeStream.close();
        }
      });

      timeout = setTimeout(async () => {
        if (verified) return;
        changeStream.close();
        await embeds.errorEmbed(
          interaction,
          "The login session has expired. Please try again.",
          null,
          true
        );
      }, 10 * 60 * 1000);
    } else {
      // return await embeds.errorEmbed(
      //   interaction,
      //   "You already verified - this feature is not yet implemented.",
      //   null,
      //   true
      // );

      const embed = new EmbedBuilder()
        .setTitle("Your Accounts Dashboard")
        .setDescription(
          `You have linked ${roblox_ids.length} Roblox account${
            roblox_ids.length > 1 ? "s" : ""
          } linked to your Discord account.`
        )
        .setColor("#45B681");

      const actionRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setStyle(ButtonStyle.Success)
          .setLabel("Add an Account")
          .setCustomId("oauth_add_account")
          .setEmoji("<:Link:1228503785144320071>")
          .setDisabled(roblox_ids.length >= 5),
        new ButtonBuilder()
          .setStyle(ButtonStyle.Danger)
          .setLabel("Unlink an Account")
          .setCustomId("oauth_unlink_accounts")
      );

      if (roblox_ids.length >= 5) {
        embed.setFooter({
          text: "You have reached the maximum number of accounts linked to your Discord account.",
        });
      }

      await interaction.editReply({
        embeds: [embed],
        components: [actionRow],
        ephemeral: true,
      });
    }
  },
};
