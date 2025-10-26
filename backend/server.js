import express from "express";
import cors from "cors";
import dotenv from "dotenv";
dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("Backend is running!");
});

app.listen(process.env.PORT || 4000, () => {
  console.log("Server started on port " + (process.env.PORT || 4000));
});
