import { useState, useRef, useEffect, useMemo } from "react";
import { io, Socket } from "socket.io-client";
import { useEventListener, useTimeout } from "usehooks-ts";
import { seedRandom } from "../util/random";
import styles from "./Client.module.css";
import { throttle } from "../util/slow";

export const Client = () => {
	const [ios, setIos] = useState<boolean | null>(null);
	const loadedRef = useRef(false);
	// a: 0-360, b: -180-180, g: -90-90
	const [alpha, setAlpha] = useState(0);
	const [beta, setBeta] = useState(0);
	const [gamma, setGamma] = useState(0);
	const connection = useRef<Socket | null>(null);
	const [mirrorX, setMirrorX] = useState(false);
	const [mirrorY, setMirrorY] = useState(false);
	const [straight, setStraight] = useState<[number, number, number] | null>(null);

	const [topLeft, setTopLeft] = useState<[number, number, number] | null>(null);
	const [bottomRight, setBottomRight] = useState<[number, number, number] | null>(null);
	const [received, setReceived] = useState<Record<string, [number, number]>>({});

	useEventListener("deviceorientation", event => {
		if (!event.alpha || !event.beta || !event.gamma) return;
		setAlpha(event.alpha);
		setBeta(event.beta);
		setGamma(event.gamma);
		loadedRef.current = true;
	});
	useTimeout(() => {
		if (!loadedRef.current) setIos("requestPermission" in DeviceOrientationEvent);
	}, 500);

	const clickForwards = () => {
		setStraight([alpha, beta, gamma]);
	};
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
	const [toAlpha, toBeta] = topLeft ?? [0, 0];
	const [fromAlpha, fromBeta] = bottomRight ?? [0, 0];
	const totalAlpha = fromAlpha < toAlpha ? toAlpha - fromAlpha : toAlpha - fromAlpha + 360;
	const totalBeta = fromBeta < toBeta ? toBeta - fromBeta : toBeta - fromBeta + 360;
	const offsetAlpha = useMemo(() => {
		if (fromAlpha < toAlpha || alpha > fromAlpha) {
			return alpha - fromAlpha;
		} else {
			return alpha - (fromAlpha - 360);
		}
	}, [alpha, beta, topLeft, bottomRight]);
	const offsetBeta = useMemo(() => {
		if (fromBeta < toBeta || beta > fromBeta) {
			return beta - fromBeta;
		} else {
			return beta - (fromBeta - 360);
		}
	}, [alpha, beta, topLeft, bottomRight]);
	const percentage = useMemo(() => {
		const x = offsetAlpha / totalAlpha;
		const y = offsetBeta / totalBeta;
		const clamp = (num: number) => Math.min(Math.max(num, 0), 1);

		return [clamp(mirrorX ? x : 1 - x), clamp(mirrorY ? y : 1 - y)];
	}, [alpha, beta, topLeft, bottomRight]);

	const center = () => {
		if (!topLeft || !bottomRight) return;
		const alphaDiff = offsetAlpha - totalAlpha / 2;
		const betaDiff = offsetBeta - totalBeta / 2;
		const [toAlpha, toBeta, g1] = topLeft;
		const [fromAlpha, fromBeta, g2] = bottomRight;
		setTopLeft([toAlpha + alphaDiff, toBeta + betaDiff, g1]);
		setBottomRight([fromAlpha + alphaDiff, fromBeta + betaDiff, g2]);
	};
	const uploadData = useRef(
		throttle((data: unknown) => {
			connection.current?.emit("data", data);
		}, 20)
	);

	useEffect(() => {
		if (!connection.current) return;
		if (!topLeft || !bottomRight || !straight) return;

		uploadData.current({ pos: percentage, raw: [alpha - straight[0], beta - straight[1], gamma - straight[2]] });
	}, [percentage, topLeft, bottomRight, alpha, beta, gamma]);
	const click = (direction: "left" | "right" | "middle", toggled: boolean) => {
		if (!connection.current) return;
		connection.current.emit("click", direction, toggled);
	};
	return (
		<div className={styles.app}>
			<div
				style={{
					width: "100%",
					backgroundImage: `linear-gradient(90deg, red 0% ${((alpha - (straight?.[0] ?? 0)) / 360) * 100}%, transparent ${
						((alpha - (straight?.[0] ?? 0)) / 360) * 100
					}% 100%)`,
				}}
			>
				{alpha - (straight?.[0] ?? 0)}
			</div>
			<div
				style={{
					width: "100%",
					backgroundImage: `linear-gradient(90deg, yellow 0% ${((beta - (straight?.[1] ?? 0) + 180) / 360) * 100}%, transparent ${
						((beta - (straight?.[1] ?? 0) + 180) / 360) * 100
					}% 100%)`,
				}}
			>
				{beta - (straight?.[1] ?? 0)}
			</div>
			<div
				style={{
					width: "100%",
					backgroundImage: `linear-gradient(90deg, lime 0% ${((gamma - (straight?.[2] ?? 0) + 90) / 180) * 100}%, transparent ${
						((gamma - (straight?.[2] ?? 0) + 90) / 180) * 100
					}% 100%)`,
				}}
			>
				{gamma - (straight?.[2] ?? 0)}
			</div>
			{ios && (
				<div
					className={styles.ios}
					onClick={() => {
						(DeviceOrientationEvent as any).requestPermission();
						setIos(false);
					}}
				>
					<div className={styles.iosBox}>
						<h1>You are on iOS</h1>
						<p>Click the screen to continue.</p>
					</div>
				</div>
			)}
			{topLeft && bottomRight && straight ? (
				<>
					<div className={styles.topBar}>
						<button onClick={clickForwards}>Set Forwards</button>
						<button onClick={clickTopLeft}>Set Top Left</button>
						<button onClick={clickBottomRight}>Set Bottom Right</button>
						<div className={styles.gap}></div>

						<button onClick={center}>Reset Center</button>
						<button onClick={() => setMirrorX(x => !x)}>Mirror X: {mirrorX ? `ON` : `OFF`}</button>
						<button onClick={() => setMirrorY(x => !x)}>Mirror Y: {mirrorY ? `ON` : `OFF`}</button>
					</div>

					<div className={styles.mouse}>
						<button onPointerDown={() => click("left", true)} onPointerUp={() => click("left", false)}></button>
						<button onPointerDown={() => click("middle", true)} onPointerUp={() => click("middle", false)}></button>
						<button onPointerDown={() => click("right", true)} onPointerUp={() => click("right", false)}></button>
					</div>
				</>
			) : (
				<div className={styles.setup}>
					<button onClick={clickForwards} style={straight ? { backgroundColor: `#55ff55` } : {}}>
						Forwards
					</button>
					<button onClick={clickTopLeft} style={topLeft ? { backgroundColor: `#55ff55` } : {}}>
						Set Top Left
					</button>
					<button onClick={clickBottomRight} style={bottomRight ? { backgroundColor: `#55ff55` } : {}}>
						Set Bottom Right
					</button>
				</div>
			)}
		</div>
	);
};
