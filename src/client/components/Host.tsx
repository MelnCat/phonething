import styles from "./Host.module.css";
import { useState, useRef, useEffect, useMemo } from "react";
import { io, Socket } from "socket.io-client";
import { useEventListener, useInterval } from "usehooks-ts";
import { seedRandom } from "../util/random";

export const Host = () => {
	// a: 0-360, b: -180-180, g: -90-90
	const connection = useRef<Socket | null>(null);
	const [received, setReceived] = useState<Record<string, { pos: [number, number]; raw: [number, number, number] }>>({});
	const receivedRef = useRef<Record<string, { pos: [number, number]; raw: [number, number, number] }>>({});
	const [clicking, setClicking] = useState<Record<string, string | boolean>>({});
	const clickingRef = useRef<Record<string, string | boolean>>({});

	const canvasRef = useRef<HTMLCanvasElement | null>(null);
	const lastDrawRef = useRef(0);
	const dataChange = (
		from: Record<string, { pos: [number, number]; raw: [number, number, number] }>,
		to: Record<string, { pos: [number, number]; raw: [number, number, number] }>
	) => {
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
				ctx.moveTo(fromPos.pos[0] * canvas.width, fromPos.pos[1] * canvas.height);
				ctx.lineTo(toPos.pos[0] * canvas.width, toPos.pos[1] * canvas.height);
				ctx.stroke();
				ctx.closePath();
			}
		}
	};
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
						left: `${v.pos[0] * 100}vw`,
						top: `${v.pos[1] * 100 * 9 / 16}vw`,
						backgroundColor: `#${Math.floor(seedRandom(k) * 0x1000000)
							.toString(16)
							.padStart(6, "0")}aa`,
					}}
				></div>
			))}
			<div className={styles.sticks}>
				{Object.entries(received).map(([k, v]) => (
					<div className={styles.stickContainer} key={`${k}`}>
						<div
							className={styles.stick}
							style={{
								backgroundColor: `#${Math.floor(seedRandom(k) * 0x1000000)
									.toString(16)
									.padStart(6, "0")}aa`,
								transform: `translateZ(-40px) rotateY(${v.raw[0]}deg) rotateX(${-v.raw[1]}deg) rotateZ(${v.raw[2]}deg) rotateX(90deg)`,
							}}
						>G</div>
					</div>
				))}
			</div>
			<canvas width={1920} height={1080} className={styles.canvas} ref={canvasRef}></canvas>
		</div>
	);
};
