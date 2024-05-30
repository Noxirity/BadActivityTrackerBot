const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonStyle,
  ButtonBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
} = require("discord.js");
const embeds = require("../../util/embed");
const crypto = require("crypto");
const databaseService = require("../../services/databaseService");

const EXPIRATION_TIME = 15 * 60 * 1000;
module.exports = {
  name: "oauth_unlink_accounts",
  aliases: ["oauth_add_account", "oauth_manage_accounts_return", "unlink_accounts_confirm", "unlink_accounts_cancel"],
  async execute(interaction, client) {
    const cid = interaction.customId;
    const database = await databaseService.getDatabase("RobloxOAuth");
    const collection = database.collection("users");

    if (cid === "oauth_add_account") {
      await interaction.update({
        embeds: [
          new EmbedBuilder().setDescription(
            "<a:loading:1238468154502680586> Generating login ID..."
          ),
        ],
        components: [],
      });

      let random_id;
      function generateRandomId() {
        return crypto.randomBytes(20).toString("hex");
      }

      const existingUser = await collection.findOne({
        discord_id: interaction.user.id,
      });

      if (existingUser) {
        const total_accounts = (existingUser.roblox_ids || []).length;
        if (total_accounts >= 5) {
          const msg = await embeds.errorEmbed(
            interaction,
            "You have reached the maximum number of accounts linked to your Discord account. Please remove an account before adding another one.",
            null,
            true,
            true
          );

          await interaction.editReply({
            embeds: [msg],
            components: [
              new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                  .setStyle(ButtonStyle.Secondary)
                  .setLabel("Return Back")
                  .setEmoji("<:BackArrow:1076566529228943441>")
                  .setCustomId("oauth_manage_accounts_return")
              ),
            ],
          });

          return;
        }
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
        // this should never happen, but just in case
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
        embeds: [],
        components: [actionRow],
        ephemeral: true,
      });

      let verified = false;
      let timeout;

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

      changeStream.on("change", async (change) => {
        const user = change.fullDocument;
        const roblox_ids = user.roblox_ids || [];
        if (user.discord_id !== interaction.user.id) return;

        if (roblox_ids.length > 0) {
          const roblox = roblox_ids[roblox_ids.length - 1];

          const embed = await embeds.successEmbed(
            interaction,
            `You have successfully linked [@${roblox[1]}](https://www.roblox.com/users/${roblox[0]}/profile) to your account!`,
            null,
            true,
            true
          );

          console.log(embed);

          await interaction.editReply({
            embeds: [embed],
            components: [
              new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                  .setStyle(ButtonStyle.Secondary)
                  .setLabel("Return Back")
                  .setEmoji("<:BackArrow:1076566529228943441>")
                  .setCustomId("oauth_manage_accounts_return")
              ),
            ],
          });

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
    } else if (cid === "oauth_manage_accounts_return") {
      await interaction.update({
        embeds: [
          new EmbedBuilder().setDescription(
            "<a:loading:1238468154502680586> Fetching account data..."
          ),
        ],
        components: [],
      });

      const existingUser = await collection.findOne({
        discord_id: interaction.user.id,
      });

      let roblox_ids = existingUser ? existingUser.roblox_ids : [];
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
      });
    } else if (cid === "oauth_unlink_accounts") {
      const existingUser = await collection.findOne({
        discord_id: interaction.user.id,
      });

      let roblox_ids = existingUser ? existingUser.roblox_ids : [];
      if (roblox_ids.length === 0) {
        const msg = await embeds.errorEmbed(
          interaction,
          "You have no accounts linked to your Discord account.",
          null,
          true,
          true
        );

        await interaction.editReply({
          embeds: [msg],
          components: [
            new ActionRowBuilder().addComponents(
              new ButtonBuilder()
                .setStyle(ButtonStyle.Secondary)
                .setLabel("Return Back")
                .setEmoji("<:BackArrow:1076566529228943441>")
                .setCustomId("oauth_manage_accounts_return")
            ),
          ],
        });

        return;
      }

      const actionRow = new ActionRowBuilder();
      const dropdown_menu = new StringSelectMenuBuilder()
        .setCustomId(`.unlink_accounts_dropdown`)
        .setMaxValues(roblox_ids.length)
        .setMinValues(1)
        .setPlaceholder("Click to select accounts");
      const options = [];
      for (const [index, [id, username]] of roblox_ids.entries()) {
        options.push(
          new StringSelectMenuOptionBuilder()
            .setValue(`id_${id}#${index}`)
            .setLabel(`@${username}`)
            .setDescription(`Select to unlink @${username}.`)
        );
      }
      dropdown_menu.addOptions(options);
      actionRow.addComponents(dropdown_menu);

      const btnActionRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setLabel("Confirm & Unlink")
          .setStyle(ButtonStyle.Danger)
          .setCustomId("unlink_accounts_confirm"),
        new ButtonBuilder()
          .setLabel("Cancel")
          .setStyle(ButtonStyle.Secondary)
          .setCustomId("oauth_manage_accounts_return")
      );

      await interaction.update({
        embeds: [
          await embeds.neutralEmbed(
            interaction,
            "Select the accounts you wish to unlink from your Discord account.",
            null,
            true,
            true
          ),
        ],
        components: [actionRow, btnActionRow],
        ephemeral: true,
      });
    } else if (cid === "unlink_accounts_confirm") {
      console.log(interaction.message.components[0].components[0]);
    }
  },
};
