import express from "express";
import cors from "cors";
import nodemailer from "nodemailer";

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(cors());
app.use(express.json());

// Simple auth using a shared secret
function verifySecret(req, res, next) {
  const headerSecret = req.headers["x-email-bridge-secret"];
  if (!process.env.BRIDGE_SECRET) {
    return res
      .status(500)
      .json({ error: "BRIDGE_SECRET not configured on server" });
  }
  if (!headerSecret || headerSecret !== process.env.BRIDGE_SECRET) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
}

// Health check
app.get("/", (req, res) => {
  res.send("Educentra Email Bridge is running.");
});

// Main email endpoint
app.post("/send-demo-email", verifySecret, async (req, res) => {
  try {
    const { record } = req.body; // record is your DemoRequest

    if (!record) {
      return res
        .status(400)
        .json({ error: "Missing 'record' in request body" });
    }

    const demoRequest = record;

    // Configure Gmail SMTP via App Password
    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 587,
      secure: false, // STARTTLS
      auth: {
        user: process.env.SMTP_USERNAME, // your Gmail
        pass: process.env.SMTP_PASSWORD, // app password
      },
    });

    const emailHTML = `
      <h2>New Demo Request Received</h2>
      <p><strong>Name:</strong> ${demoRequest.name}</p>
      <p><strong>Email:</strong> ${demoRequest.email}</p>
      <p><strong>Phone:</strong> ${demoRequest.phone || "Not provided"}</p>
      <p><strong>Institution:</strong> ${demoRequest.institution}</p>
      <p><strong>Role:</strong> ${demoRequest.role}</p>
      ${
        demoRequest.message
          ? `<p><strong>Message:</strong><br>${demoRequest.message}</p>`
          : ""
      }
      <p><strong>Status:</strong> ${demoRequest.status || "pending"}</p>
    `;

    await transporter.sendMail({
      from: `"EDUCENTRA Demo Requests" <${process.env.SMTP_USERNAME}>`,
      to: process.env.TO_EMAIL || process.env.SMTP_USERNAME,
      subject: `New Demo Request from ${demoRequest.name}`,
      html: emailHTML,
    });

    res.json({ success: true });
  } catch (err) {
    console.error("Email bridge error:", err);
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Email bridge listening on port ${PORT}`);
});
