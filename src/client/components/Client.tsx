import { useState, useRef, useEffect, useMemo } from "react";
import { io, Socket } from "socket.io-client";
import { useEventListener } from "usehooks-ts";
import { seedRandom } from "../util/random";
import styles from "./Client.module.css";

export const Client = () => {
	// a: 0-360, b: -180-180, g: -90-90
	const [alpha, setAlpha] = useState(0);
	const [beta, setBeta] = useState(0);
	const [gamma, setGamma] = useState(0);
	const connection = useRef<Socket | null>(null);

	const [topLeft, setTopLeft] = useState<[number, number, number]>([0, 0, 0]);
	const [bottomRight, setBottomRight] = useState<[number, number, number]>([0, 0, 0]);
	const [received, setReceived] = useState<Record<string, [number, number]>>({});

	useEventListener("deviceorientation", event => {
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
	const [toAlpha, toBeta] = topLeft;
	const [fromAlpha, fromBeta] = bottomRight;
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

		return [clamp(1 - x), clamp(1 - y)];
	}, [alpha, beta, topLeft, bottomRight]);

	const center = () => {
		const alphaDiff = offsetAlpha - totalAlpha / 2;
		const betaDiff = offsetBeta - totalBeta / 2;
		const [toAlpha, toBeta, g1] = topLeft;
		const [fromAlpha, fromBeta, g2] = bottomRight;
		setTopLeft([toAlpha + alphaDiff, toBeta + betaDiff, g1]);
		setBottomRight([fromAlpha + alphaDiff, fromBeta + betaDiff, g2]);
	};

	useEffect(() => {
		if (!connection.current) return;
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
	return (
		<div className={styles.app}>
			<button onClick={clickTopLeft}>Top Left</button>
			<button onClick={clickBottomRight}>Bottom Right</button>
			<button onClick={() => (DeviceOrientationEvent as any).requestPermission()}>ios</button>
			<button onClick={center}>center</button>
			<div className={styles.mouse}>
				<button onPointerDown={() => click("left", true)} onPointerUp={() => click("left", false)}></button>
				<button onPointerDown={() => click("right", true)} onPointerUp={() => click("right", false)}></button>
			</div>
		</div>
	);
};
