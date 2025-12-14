import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import { router } from "./routes/index.js";
import { errorHandler } from "./middleware/errorHandler.js";

export const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: "5mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan("dev"));

app.get("/", (_req, res) => {
	res.status(200).json({ status: "ok" });
});

app.use("/api", router);
app.use(errorHandler);
