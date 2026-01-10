import Rand, { PRNG } from "rand-seed";

export const seedRandom = (seed: string) => {
	const rand = new Rand(seed);
    return rand.next();
};
