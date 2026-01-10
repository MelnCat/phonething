import express from "express";
import ViteExpress from "vite-express";
import * as socketIo from "socket.io";

const app = express();

app.get("/hello", (_, res) => {
	res.send("Hello Vite + React + TypeScript!");
});

const server = app.listen(3000, "0.0.0.0", () => console.log("Server is listening..."));

ViteExpress.bind(app, server);

const io = new socketIo.Server(server);

const clients: Record<string, [number, number]> = {};

io.on("connection", socket => {
	console.log(`${socket.id} connected`);
	clients[socket.id] = [0, 0];
	socket.on("data", data => {
		clients[socket.id] = data;
		io.emit("data", clients);
	});
	socket.on("click", (type, toggled) => {
		io.emit("click", socket.id, type, toggled);
	});
	socket.on("disconnect", () => {
		console.log(`${socket.id} disconnected`);
		delete clients[socket.id];
	});
});
