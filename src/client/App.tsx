import { useEventListener } from "usehooks-ts";
import styles from "./App.module.css";
import io, { Socket } from "socket.io-client";

import { useEffect, useMemo, useRef, useState } from "react";

const dist = (a: number, b: number) => Math.abs(a - b)

function App() {
	// a: 0-360, b: -180-180, g: -90-90
	const [alpha, setAlpha] = useState(0);
	const [beta, setBeta] = useState(0);
	const [gamma, setGamma] = useState(0);
	const connection = useRef<Socket | null>(null);

	const [topLeft, setTopLeft] = useState<null | [number, number, number]>(null);
	const [bottomRight, setBottomRight] = useState<null | [number, number, number]>(null);
	const [shouldSend, setShouldSend] = useState(false);
	const [received, setReceived] = useState([0, 0]);

	useEventListener("deviceorientation", event => {]
		if (!event.alpha || !event.beta || !event.gamma) return;
        setAlpha(event.alpha);
		setBeta(event.beta);
		setGamma(event.gamma);
	});

	const clickTopLeft = () => {
		setTopLeft([alpha, beta, gamma]);
	};
	const clickBottomRight = () => {
		setBottomRight([alpha, beta, gamma]);
	};

	useEffect(() => {
		if (connection.current) return;
		const socket = io();
		connection.current = socket;
		connection.current.on("data", data => {
			setReceived(data);
		});
	}, []);

	const percentage = useMemo(() => {
		if (!topLeft || !bottomRight) return [0, 0] as const;
		const [minAlpha, maxBeta] = topLeft;
		const [maxAlpha, minBeta] = bottomRight;

		const alphaPercent = (alpha - minAlpha) / (maxAlpha - minAlpha);

		const betaPercent = (beta - minBeta) / (maxBeta - minBeta);

		const clamp = (num: number) => Math.min(Math.max(num, 0), 1);
		return [clamp(alphaPercent), clamp(betaPercent)] as const;
	}, [alpha, beta, topLeft, bottomRight]);

	useEffect(() => {
		if (!connection.current) return;
		if (!shouldSend) return;
		connection.current.emit("data", percentage);
	}, [percentage]);
	const click = (direction: "left" | "right" | "middle", toggled: boolean) => {
		if (!connection.current) return;
		connection.current.emit("click", direction, toggled);
	};
	const scroll = (direction: "up" | "down", toggled: boolean) => {
		if (!connection.current) return;
		connection.current.emit("scroll", direction, toggled);
	};
	const center = () => {};
	return (
		<div className={styles.app}>
			<div className={styles.over} style={{ left: `${received[0] * 100}%`, top: `${(1 - received[1]) * 100}%` }}></div>
			<div
				style={{
					backgroundImage: `linear-gradient(90deg, red 0% ${(alpha / 360) * 100}%, transparent ${(alpha / 360) * 100}% 100%)`,
				}}
			>
				{alpha}
			</div>
			<div
				style={{
					backgroundImage: `linear-gradient(90deg, yellow 0% ${((beta + 180) / 360) * 100}%, transparent ${
						((beta + 180) / 360) * 100
					}% 100%)`,
				}}
			>
				{beta}
			</div>
			<div
				style={{
					backgroundImage: `linear-gradient(90deg, lime 0% ${((gamma + 90) / 180) * 100}%, transparent ${
						((gamma + 90) / 180) * 100
					}% 100%)`,
				}}
			>
				{gamma}
			</div>
			{percentage.map((x, i) => (
				<div
					key={i}
					style={{
						backgroundImage: `linear-gradient(90deg, gray 0% ${x * 100}%, transparent ${x * 100}% 100%)`,
					}}
				>
					{x}
				</div>
			))}
			<button onClick={clickTopLeft}>Top Left</button>
			<button onClick={clickBottomRight}>Bottom Right</button>
			<button onClick={() => setShouldSend(true)}>send</button>
			<button onClick={() => (DeviceOrientationEvent as any).requestPermission()}>ios</button>
			<button onClick={center}>center</button>
			<div className={styles.mouse}>
				<button onPointerDown={() => click("left", true)} onPointerUp={() => click("left", false)}></button>
				<div className={styles.scroll}>
					<button onPointerDown={() => click("middle", true)} onPointerUp={() => click("middle", false)}></button>
					<button onPointerDown={() => scroll("up", true)} onPointerUp={() => scroll("up", false)}>
						^
					</button>
					<button onPointerDown={() => scroll("down", true)} onPointerUp={() => scroll("down", false)}>
						v
					</button>
				</div>
				<button onPointerDown={() => click("right", true)} onPointerUp={() => click("right", false)}></button>
			</div>
		</div>
	);
}

export default App;
