export const throttle = <T extends (...args: unknown[]) => unknown>(f: T, t: number) => {
	let lastCallTime = 0;
	return (...args: Parameters<T>) => {
        if (Date.now() < lastCallTime + t) return;
        f(...args);
    };
};
