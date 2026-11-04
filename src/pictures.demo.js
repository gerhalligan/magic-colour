// Demo build only (MC_DEMO=1): two Shapes pictures and two Grid pictures, so the demo download stays small.
import { hydrate } from './codec.js';
import p0 from './pictures/happy-fish.json';
import p1 from './pictures/unicorn-pal.json';
import p2 from './pictures/grid-butterfly.json';
import p3 from './pictures/grid-heart.json';
export default [p0, p1, p2, p3].map(hydrate);
