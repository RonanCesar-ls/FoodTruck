import { fileURLToPath } from "node:url";
import express from "express";

export const app = express();

app.use(express.json());
app.use(express.static(fileURLToPath(new URL("../public/", import.meta.url))));
