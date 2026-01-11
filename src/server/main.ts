import express from "express";
import ViteExpress from "vite-express";
import * as socketIo from "socket.io";
import { throttle } from "../client/util/slow.js";

const app = express();

app.get("/hello", (_, res) => {
	res.send("Hello Vite + React + TypeScript!");
});

const server = app.listen(1144, "0.0.0.0", () => console.log("Server is listening..."));

ViteExpress.bind(app, server);

const io = new socketIo.Server(server);

const clients: Record<string, { pos: [number, number]; raw: [number, number, number] }> = {};

const sendData = throttle(
	(data: unknown) => {
		io.emit("data", data);
	},
	20
);

io.on("connection", socket => {
	console.log(`${socket.id} connected`);
	socket.on("data", data => {
		clients[socket.id] = data;
		sendData(clients);
	});
	socket.on("click", (type, toggled) => {
		io.emit("click", socket.id, type, toggled);
	});
	socket.on("disconnect", () => {
		console.log(`${socket.id} disconnected`);
		delete clients[socket.id];
	});
});
