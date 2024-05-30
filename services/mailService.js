// mailService.js

const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  host: "mail.noxirity.com",
  port: 587,
  secure: false,
  auth: {
    user: "no-reply@noxirity.com",
    pass: process.env.EMAIL_NOREPLY_PASS,
  },
  tls: {
    rejectUnauthorized: false,
  },
});

const sendMail = async (to, subject, text, html) => {
  const mailOptions = {
    from: "no-reply@noxirity.com",
    to,
    subject,
    text,
    html,
  };

  transporter.sendMail(mailOptions, (err, info) => {
    if (err) {
      console.error(err);
      return false;
    } else {
      console.log("Email sent: " + info.response);
      return true;
    }
  });
};

module.exports = {
  sendMail,
};
