import styles from "./Host.module.css";
import { useState, useRef, useEffect, useMemo } from "react";
import { io, Socket } from "socket.io-client";
import { useEventListener, useInterval } from "usehooks-ts";
import { seedRandom } from "../util/random";

export const Host = () => {
	// a: 0-360, b: -180-180, g: -90-90
	const connection = useRef<Socket | null>(null);
	const [received, setReceived] = useState<Record<string, [number, number]>>({});
	const receivedRef = useRef<Record<string, [number, number]>>({});
	const [clicking, setClicking] = useState<Record<string, string | boolean>>({});
	const clickingRef = useRef<Record<string, string | boolean>>({});

	const canvasRef = useRef<HTMLCanvasElement | null>(null);
	const lastDrawRef = useRef(0);
	const dataChange = (from: Record<string, [number, number]>, to: Record<string, [number, number]>) => {
		const canvas = canvasRef.current;
		if (!canvas) return;
		const ctx = canvas.getContext("2d")!;
		for (const [id, toPos] of Object.entries(to)) {
			if (!from[id]) continue;
			const fromPos = from[id];
			if (clickingRef.current[id]) {
				ctx.beginPath();
				ctx.strokeStyle =
					clickingRef.current[id] === "left"
						? `#${Math.floor(seedRandom(id) * 0x1000000)
								.toString(16)
								.padStart(6, "0")}aa`
						: "#ffffff";
				ctx.lineWidth = clickingRef.current[id] === "left" ? 8 : 60;
				ctx.moveTo(fromPos[0] * canvas.width, fromPos[1] * canvas.height);
				ctx.lineTo(toPos[0] * canvas.width, toPos[1] * canvas.height);
				ctx.stroke();
				ctx.closePath();
			}
		}
	};
	useEffect(() => {
		if (canvasRef.current) {
			canvasRef.current.width = canvasRef.current.clientWidth;
			canvasRef.current.height = canvasRef.current.clientHeight;
		}
	}, []);
	useEffect(() => {
		if (connection.current) return;
		const socket = io();
		connection.current = socket;
		connection.current.on("data", data => {
			setReceived(data);
			if (lastDrawRef.current + 20 < Date.now()) {
				dataChange(receivedRef.current, data);
				receivedRef.current = data;
				lastDrawRef.current = Date.now();
			}
		});
		connection.current.on("click", (id, type, toggled) => {
			setClicking(x => ({ ...x, [id]: toggled ? type : false }));
			clickingRef.current[id] = toggled ? type : false;
		});
	}, []);
	return (
		<div className={styles.app}>
			{Object.entries(received).map(([k, v]) => (
				<div
					key={k}
					className={styles.over}
					style={{
						left: `${v[0] * 100}%`,
						top: `${v[1] * 100}%`,
						backgroundColor: `#${Math.floor(seedRandom(k) * 0x1000000)
							.toString(16)
							.padStart(6, "0")}aa`,
					}}
				></div>
			))}
			<canvas width={1920} height={1080} className={styles.canvas} ref={canvasRef}></canvas>
		</div>
	);
};
