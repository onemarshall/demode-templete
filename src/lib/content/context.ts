import { createContext } from "svelte";
import type { NavigationTree } from "./schema";

export const [getNavigationContext, setNavigationContext] = createContext<() => NavigationTree>();
