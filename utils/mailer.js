const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  host: "smtp.office365.com",
  port: 587,
  secure: false, // TLS
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  },
  tls: {
    ciphers: "SSLv3"
  }
});

async function enviarCorreo(destino, asunto, mensajeHTML) {
  try {
    await transporter.sendMail({
      from: `"CJSystem HelpDesk" <${process.env.EMAIL_USER}>`,
      to: destino,
      subject: asunto,
      html: mensajeHTML
    });

    console.log("📨 Correo enviado a:", destino);
  } catch (err) {
    console.log("❌ Error enviando correo:", err);
  }
}

module.exports = enviarCorreo;
