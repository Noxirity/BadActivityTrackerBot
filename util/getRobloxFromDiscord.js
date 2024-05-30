const axios = require("axios");
module.exports = async function getRobloxFromDiscord(client, discord_id) {
  try {
    const url =
      "https://api.blox.link/v4/public/guilds/932320416989610065/discord-to-roblox/" +
      discord_id;
    const response = await axios.get(url, {
      headers: {
        Authorization: process.env.BLOXLINK_API_KEY,
      },
    });

    console.log(response.data);
    return [true, response.data.robloxID, response.data.resolved.roblox];
  } catch (error) {
    return [false, null];
  }
};
