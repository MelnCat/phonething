import { useEventListener } from "usehooks-ts";
import styles from "./App.module.css";
import io, { Socket } from "socket.io-client";

import { useEffect, useMemo, useRef, useState } from "react";
import { seedRandom } from "./util/random";
import { Host } from "./components/Host";
import { Client } from "./components/Client";

function App() {
	const host = location.href.endsWith("?host");
	if (host) return <Host />;
	return <Client />;
}

export default App;
