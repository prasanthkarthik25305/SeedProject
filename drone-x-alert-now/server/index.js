import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import geminiProxy from "./geminiProxy.js";

dotenv.config();

const app = express();

app.use(cors({
  origin: [
    "http://localhost:8080",
    "http://localhost:5173",
    "http://10.16.61.204:8080",
    "https://dronex-copy.onrender.com",
    "https://dronex-alert-now.vercel.app",  
    "https://dronex-alert-now-git-main-venkats-projects-0c1df854.vercel.app",
    /^https:\/\/dronex-alert-[a-z0-9-]+\.vercel\.app$/ 
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Add OPTIONS handling for preflight requests
app.options('*', cors());

app.use(express.json());
app.use("/api", geminiProxy);

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`🚀 SERVER RUNNING ON PORT: ${PORT}`);
});

