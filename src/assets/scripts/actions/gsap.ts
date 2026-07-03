import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/dist/ScrollTrigger";
import { ScrollSmoother } from "gsap/dist/ScrollSmoother";
import { SplitText } from "gsap/dist/SplitText";
import { Flip } from "gsap/dist/Flip";
import { Observer } from "gsap/dist/Observer";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger, ScrollSmoother, SplitText, Flip, Observer);
}
export * from "gsap";
export { ScrollTrigger, ScrollSmoother, SplitText, Flip, Observer };
