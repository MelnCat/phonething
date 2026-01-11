import styles from "./Host.module.css";
import { useState, useRef, useEffect, useMemo } from "react";
import { io, Socket } from "socket.io-client";
import { useEventListener, useInterval } from "usehooks-ts";
import { seedRandom } from "../util/random";
import Matter, { Bodies, Composite, Constraint, Engine, Query, Render, Runner, World } from "matter-js";

export const Host = () => {
	// a: 0-360, b: -180-180, g: -90-90
	const connection = useRef<Socket | null>(null);
	const [received, setReceived] = useState<Record<string, { pos: [number, number]; raw: [number, number, number] }>>({});
	const receivedRef = useRef<Record<string, { pos: [number, number]; raw: [number, number, number] }>>({});
	const [clicking, setClicking] = useState<Record<string, string | boolean>>({});
	const clickingRef = useRef<Record<string, string | boolean>>({});
	const clickStartRef = useRef<Record<string, [number, number]>>({});
	const circleStartRef = useRef<Record<string, [number, number]>>({});
	const dragRef = useRef<Record<string, Constraint>>({});

	const containerRef = useRef<HTMLDivElement | null>(null);
	const canvasRef = useRef<HTMLCanvasElement | null>(null);
	const engineRef = useRef<Matter.Engine | null>(null);
	useEffect(() => {
		if (connection.current) return;
		const socket = io();
		connection.current = socket;
		connection.current.on("data", data => {
			setReceived(data);
			receivedRef.current = data;
			for (const [k, v] of Object.entries(dragRef.current)) {
				const data = receivedRef.current[k];
				if (!data) continue;
				v.pointB = { x: 1920 * data.pos[0], y: 1080 * data.pos[1] };
			}
		});
		connection.current.on("click", (id, type, toggled) => {
			setClicking(x => ({ ...x, [id]: toggled ? type : false }));
			clickingRef.current[id] = toggled ? type : false;
			if (type === "middle") {
				if (!toggled && dragRef.current[id]) {
					World.remove(engineRef.current!.world, dragRef.current[id]);
					delete dragRef.current[id];
				} else if (toggled) {
					const bodies = Composite.allBodies(engineRef.current!.world);
					const x = 1920 * (receivedRef.current[id]?.pos[0] ?? 0);
					const y = 1080 * (receivedRef.current[id]?.pos[1] ?? 0);
					const clicked = Query.point(bodies, {
						x,
						y,
					});

					if (clicked.length > 0) {
						const target = clicked[0];

						const drag = Constraint.create({
							pointA: { x: x - clicked[0].position.x, y: y - clicked[0].position.y },
							pointB: { x, y },
							bodyA: target,
							stiffness: 0.1,
							length: 0,
						});

						World.add(engineRef.current!.world, drag);

						dragRef.current[id] = drag;
					}
				}
				return;
			}
			if (toggled) (type === "left" ? clickStartRef : circleStartRef).current[id] = receivedRef.current[id].pos;
			else {
				const start = (type === "left" ? clickStartRef : circleStartRef).current[id];
				if (!start) return;
				const curr = receivedRef.current[id].pos;
				const w = 1920 * (curr[0] - start[0]);
				const h = 1080 * (curr[1] - start[1]);
				const box =
					type === "left"
						? Bodies.rectangle(
								(1920 * (start[0] + curr[0])) / 2,
								(1080 * (start[1] + curr[1])) / 2,
								1920 * (curr[0] - start[0]),
								1080 * (curr[1] - start[1]),
								{
									render: {
										fillStyle: `#${Math.floor(Math.random() * 0x1000000)
											.toString(16)
											.padStart(6, "0")}`,
									},
									friction: 0.3,
								}
						  )
						: Bodies.fromVertices(
								(1920 * (start[0] + curr[0])) / 2,
								(1080 * (start[1] + curr[1])) / 2,
								[...Array(50)].map((_, i) => ({
									x: (Math.cos((i * Math.PI * 2) / 50) * w) / 2,
									y: (Math.sin((i * Math.PI * 2) / 50) * h) / 2,
								})) as any,
								{
									render: {
										fillStyle: `#${Math.floor(Math.random() * 0x1000000)
											.toString(16)
											.padStart(6, "0")}`,
									},
									friction: 0.3,
								}
						  );
				Composite.add(engineRef.current!.world, box);
				delete (type === "left" ? clickStartRef : circleStartRef).current[id];
			}
		});
	}, []);
	useEffect(() => {
		if (engineRef.current) return;

		let engine = Engine.create({});
		engineRef.current = engine;

		let render = Render.create({
			element: containerRef.current!,
			engine: engine,
			canvas: canvasRef.current!,
			options: {
				width: 1920,
				height: 1080,
				background: "#ffffff",
				wireframes: false,
			},
		});

		const box = Bodies.rectangle(1920 / 2, 1080, 1920 + 50, 100, {
			isStatic: true,
		});
		Composite.add(engineRef.current!.world, box);
		Render.run(render);
		const runner = Runner.create();
		Runner.run(runner, engine);
	}, []);

	return (
		<div className={styles.app} ref={containerRef}>
			{Object.entries(received).map(([k, v]) => (
				<div
					key={k}
					className={styles.over}
					style={{
						left: `${v.pos[0] * 100}vw`,
						top: `${(v.pos[1] * 100 * 9) / 16}vw`,
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
								transform: `translateZ(-40px) rotateY(${v.raw[0]}deg) rotateX(${-v.raw[1]}deg) rotateZ(${
									v.raw[2]
								}deg) rotateX(90deg)`,
							}}
						>
							G
						</div>
					</div>
				))}
			</div>
			{Object.entries(clickStartRef.current).map(([k, v]) => (
				<div
					key={k}
					className={styles.outlineBox}
					style={{
						left: `${Math.min(v[0], received[k].pos[0]) * 100}vw`,
						top: `${(Math.min(v[1], received[k].pos[1]) * 100 * 9) / 16}vw`,
						width: `${Math.abs(received[k].pos[0] - v[0]) * 100}vw`,
						height: `${(Math.abs(received[k].pos[1] - v[1]) * 100 * 9) / 16}vw`,
						borderColor: `#${Math.floor(seedRandom(k) * 0x1000000)
							.toString(16)
							.padStart(6, "0")}aa`,
					}}
				></div>
			))}
			{Object.entries(circleStartRef.current).map(([k, v]) => (
				<div
					key={k}
					className={styles.outlineBox}
					style={{
						left: `${Math.min(v[0], received[k].pos[0]) * 100}vw`,
						top: `${(Math.min(v[1], received[k].pos[1]) * 100 * 9) / 16}vw`,
						width: `${Math.abs(received[k].pos[0] - v[0]) * 100}vw`,
						height: `${(Math.abs(received[k].pos[1] - v[1]) * 100 * 9) / 16}vw`,
						borderRadius: "50%",
						borderColor: `#${Math.floor(seedRandom(k) * 0x1000000)
							.toString(16)
							.padStart(6, "0")}aa`,
					}}
				></div>
			))}
			<canvas width={1920} height={1080} className={styles.canvas} ref={canvasRef}></canvas>
		</div>
	);
};
