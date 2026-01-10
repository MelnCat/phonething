import express from "express";
import ViteExpress from "vite-express";
import * as socketIo from "socket.io";
import keysender from "keysender";

let stopMouse = false;
const obj = new keysender.Hardware();
const screenSize = keysender.getScreenSize();

const app = express();

app.get("/hello", (_, res) => {
	res.send("Hello Vite + React + TypeScript!");
});

const server = app.listen(3000, "0.0.0.0", () => console.log("Server is listening..."));

ViteExpress.bind(app, server);

const io = new socketIo.Server(server);

const scroll: Record<string, boolean> = {};

let currentMouse = [0, 0];
let lastMouse: [number, number][] = [];

setInterval(() => {
	if (stopMouse) return;
	obj.mouse.moveTo(currentMouse[0], currentMouse[1]);
	if (!lastMouse.length) return;
	const average = [lastMouse.reduce((l, c) => l + c[0], 0) / lastMouse.length, lastMouse.reduce((l, c) => l + c[1], 0) / lastMouse.length];
    if (((average[0] - currentMouse[0])**2 + (average[1] - currentMouse[1]) ** 2) < 10 ** 2) return;
    currentMouse = average;
}, 5);

io.on("connection", socket => {
	console.log("a user connected");
	socket.on("data", data => {
		io.emit("data", data);
		lastMouse.push([screenSize.width * data[0], screenSize.height * (1 - data[1])]);
        if (lastMouse.length > 10) lastMouse.shift();
	});
	socket.on("click", (type, toggled) => {
		obj.mouse.toggle(type, toggled);
	});
	socket.on("scroll", (dir, toggled) => {
		scroll[dir] = toggled;
	});
});

setInterval(() => {
	if (scroll.up) obj.mouse.scrollWheel(1);
	if (scroll.down) obj.mouse.scrollWheel(-1);
}, 30);

new keysender.GlobalHotkey({
	key: "f10",
	mode: "once",
	async action() {
		stopMouse = true;
        obj.mouse.toggle("left", false)
        obj.mouse.toggle("right", false)
	},
});
