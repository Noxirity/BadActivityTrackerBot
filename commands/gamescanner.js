const mailService = require("../services/mailService");

module.exports = {
  name: "email",
  description: "Send an email to a user.",
  permissions: ["ADMINISTRATOR"],
  async execute(message, client, args, commandPrefix) {
    const email = args[0];
    const subject = args[1];
    const text = args[2];
    const html = args[3];

    if (!email || !subject || !text || !html) {
      return message.channel.send(
        "Please provide an email, subject, text, and html."
      );
    }

    const info = await mailService.sendMail(email, subject, text, html);

    if (info) {
      return message.channel.send(`Email sent to ${email} successfully.`);
    } else {
      console.error(info);
      return message.channel.send("Failed to send email.");
    }
  },
};
