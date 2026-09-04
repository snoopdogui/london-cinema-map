import nodemailer from "nodemailer";

export async function POST(req) {
  const { message, name, email } = await req.json();

  if (!message || !message.trim()) {
    return Response.json({ error: "No message provided" }, { status: 400 });
  }

  // The form is only wired up when SMTP credentials are present. Without this
  // guard nodemailer rejects on undefined auth and the request 500s.
  if (!process.env.FEEDBACK_EMAIL_USER || !process.env.FEEDBACK_EMAIL_PASS) {
    console.error("Feedback: FEEDBACK_EMAIL_USER/PASS not configured");
    return Response.json(
      { error: "Feedback is unavailable right now — please try again later." },
      { status: 503 }
    );
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

  try {
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
  } catch (err) {
    console.error("Feedback send failed:", err.message);
    return Response.json(
      { error: "Couldn't send your feedback — please try again later." },
      { status: 502 }
    );
  }

  return Response.json({ ok: true });
}
