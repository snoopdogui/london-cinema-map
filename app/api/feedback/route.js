import nodemailer from "nodemailer";

export async function POST(req) {
  const { message, name, email } = await req.json();

  if (!message || !message.trim()) {
    return Response.json({ error: "No message provided" }, { status: 400 });
  }

  const transporter = nodemailer.createTransport({
    host: "smtp.mail.me.com",
    port: 587,
    secure: false,
    auth: {
      user: process.env.FEEDBACK_EMAIL_USER,
      pass: process.env.FEEDBACK_EMAIL_PASS,
    },
  });

  const from = [name, email].filter(Boolean).join(" — ") || "Anonymous";

  await transporter.sendMail({
    from: `"London Cinema Map" <${process.env.FEEDBACK_EMAIL_USER}>`,
    to: "guidosforni@icloud.com",
    subject: `London Cinema Map — feedback from ${name || "anonymous"}`,
    text: `From: ${from}\n\n${message}`,
    html: `
      <p style="font-family:sans-serif;font-size:13px;color:#888;margin-bottom:16px;">
        <strong>From:</strong> ${from}
      </p>
      <p style="font-family:sans-serif;font-size:15px;line-height:1.6;">
        ${message.replace(/\n/g, "<br/>")}
      </p>
    `,
  });

  return Response.json({ ok: true });
}
