import express from "express";
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Obtener __dirname en ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();

app.get("/", (req, res) => {
  res.send("Test Working Server");
});

app.get("/file", (req, res) => {
  res.sendFile(join(__dirname, "fileTest.txt"));
});

app.get("/json", (req, res) => {
  res.json({ message: "Test Working Server JSON" });
});

app.listen(3000, '0.0.0.0', () => {
  console.log("🚀 Server is running on port 3000");
  console.log("📱 Access: http://localhost:3000");
});

///////////////////////////////////////////////
/////////// Type: CommonJS ///////////////

// const express = require("express");
// const app = express();

// app.get("/", (req, res) => {
//   res.send("Test Working Server");
// });

// app.get("/file", (req, res) => {
//   res.sendFile("./fileTest.txt", { root: __dirname });
// });

// app.get("/json", (req, res) => {
//   res.json({ message: "Test Working Server JSON" });
// });

// app.listen(3000);
// console.log("Server is running on port 3000");

///////////////////////////////////////////////////////