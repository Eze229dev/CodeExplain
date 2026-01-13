import "dotenv/config";
import express from "express";
import cors from "cors";
import OpenAI from "openai";
import rateLimit from "express-rate-limit";
import helmet from "helmet";

const app = express();

// Security middleware
app.use(helmet());
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    credentials: true,
  })
);
app.use(express.json({ limit: "10mb" }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: "Too many requests from this IP, please try again later.",
});
app.use(limiter);

const API_KEY = process.env.NEBIUS_API_KEY;

const client = new OpenAI({
    baseURL: 'https://api.tokenfactory.nebius.com/v1/',
    apiKey:API_KEY,
});
// Code explanation endpoint
app.post("/api/explain-code", async (req, res) => {
  try {
    const { code, language } = req.body;

    if (!code) {
      return res.status(400).json({ error: "Code is required" });
    }

    const messages = [
      {
        role: "user",
        content: `Please explain this ${
          language || ""
        } code in simple terms:\n\n\`\`\`${language || ""}\n${code}\n\`\`\``,
      },
    ];

    const response = await client.chat.completions.create({
      model: "openai/gpt-oss-120b",
      messages,
      temperature: 0.3,
      max_tokens: 800,
    });

    const explanation = response?.choices[0]?.message?.content;
    if (!explanation) {
      return res.status(500).json({ error: "Failed to explain code" });
    }

    res.json({ explanation, language: language || "unknown" });
  } catch (err) {
    console.error("Code Explain API Error:", err);
    res.status(500).json({ error: "Server error", details: err.message });
  }
});

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    hasApiKey: !!API_KEY,
    uptime: process.uptime(),
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ error: "Internal server error" });
});

// 404 handler
app.use("*", (req, res) => {
  res.status(404).json({ error: "Route not found" });
});

const PORT = process.env.PORT || 3002;
app.listen(PORT, () => {
  console.log(`Enhanced API server listening on http://localhost:${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/api/health`);
  console.log(`API Key configured: ${!!API_KEY}`);
});
