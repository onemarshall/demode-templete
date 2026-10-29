import { z } from "zod";

/**
 * Shared synthesis-model policy for every module's `resolve<Module>Model`.
 *
 * Judgement models — strategy drafting, independent review — must be strong
 * synthesis models in production. Explicit development contexts may use
 * inexpensive extraction models (flash/mini/nano class) for cheap iteration.
 *
 * Detection fails closed: only an explicit development signal unlocks
 * inexpensive models — `NODE_ENV=development` (set by the vite dev server) or
 * `MODEL_POLICY_DEV=1` (set in `.env` for bun scripts and the trigger dev
 * worker). Anything unset or unknown follows production rules, so a host that
 * forgets to configure production can never silently downgrade judgement
 * models.
 */
export const INEXPENSIVE_MODEL = /(?:flash|mini|nano|haiku|luna|free|mimo)/i;

export function developmentModels(env: Record<string, string | undefined>): boolean {
  return env.NODE_ENV === "development" || env.MODEL_POLICY_DEV === "1";
}

const ResolverOptions = z.object({
  overrideVar: z.string().min(1),
  defaultModel: z.string().min(1),
  label: z.string().min(1),
});

export function resolveSynthesisModel(
  env: Record<string, string | undefined>,
  options: z.input<typeof ResolverOptions>,
): string {
  const { overrideVar, defaultModel, label } = ResolverOptions.parse(options);
  const allowInexpensive = developmentModels(env);
  const override = env[overrideVar];
  if (override) {
    if (!allowInexpensive && INEXPENSIVE_MODEL.test(override))
      throw new Error(
        `${label} requires a strong synthesis model; inexpensive extraction overrides are not accepted outside development.`,
      );
    return override;
  }
  return env.SYNTHESIS_MODEL && (allowInexpensive || !INEXPENSIVE_MODEL.test(env.SYNTHESIS_MODEL))
    ? env.SYNTHESIS_MODEL
    : defaultModel;
}

/**
 * The same decision, once per module, differing only in the override variable,
 * the fallback model and the name used in an operator-facing error.
 *
 * This was nine eleven-line wrapper files (`m04-model-policy.ts` and friends)
 * that each called `resolveSynthesisModel` with three literals. Declared as one
 * table instead; the per-module `resolve<Module>Model` and
 * `<Module>_DEFAULT_SYNTHESIS_MODEL` names are kept below so no caller changes.
 */
const DEFAULT_SYNTHESIS_MODEL = "openai/gpt-6.1-sol";

const MODULE_POLICIES = {
  M01: { overrideVar: "M01_SYNTHESIS_MODEL", defaultModel: DEFAULT_SYNTHESIS_MODEL, label: "Founder Conviction drafting" },
  M02: { overrideVar: "M02_SYNTHESIS_MODEL", defaultModel: DEFAULT_SYNTHESIS_MODEL, label: "Market Reality drafting" },
  M03: {
    overrideVar: "M03_SYNTHESIS_MODEL",
    defaultModel: DEFAULT_SYNTHESIS_MODEL,
    label: "Business Commitments drafting",
  },
  M04: {
    overrideVar: "M04_SYNTHESIS_MODEL",
    defaultModel: DEFAULT_SYNTHESIS_MODEL,
    label: "M04 strategic drafting",
  },
  M05: {
    overrideVar: "M05_SYNTHESIS_MODEL",
    defaultModel: DEFAULT_SYNTHESIS_MODEL,
    label: "Brand Strategy drafting",
  },
  M06: {
    overrideVar: "M06_SYNTHESIS_MODEL",
    defaultModel: DEFAULT_SYNTHESIS_MODEL,
    label: "Marketing Strategy drafting",
  },
  M07: {
    overrideVar: "M07_SYNTHESIS_MODEL",
    defaultModel: DEFAULT_SYNTHESIS_MODEL,
    label: "Sales Strategy drafting",
  },
  M08: {
    overrideVar: "M08_SYNTHESIS_MODEL",
    defaultModel: DEFAULT_SYNTHESIS_MODEL,
    label: "Content Strategy drafting",
  },
  M09: {
    overrideVar: "M09_SYNTHESIS_MODEL",
    defaultModel: DEFAULT_SYNTHESIS_MODEL,
    label: "Digital Direction drafting",
  },
  M10: {
    overrideVar: "M10_SYNTHESIS_MODEL",
    defaultModel: DEFAULT_SYNTHESIS_MODEL,
    label: "Visual Direction drafting",
  },
  CD: {
    overrideVar: "CD_SYNTHESIS_MODEL",
    defaultModel: DEFAULT_SYNTHESIS_MODEL,
    label: "Commercial Direction drafting",
  },
  M11: {
    overrideVar: "M11_SYNTHESIS_MODEL",
    defaultModel: DEFAULT_SYNTHESIS_MODEL,
    label: "Execution planning drafting",
  },
  M12: {
    overrideVar: "M12_SYNTHESIS_MODEL",
    defaultModel: DEFAULT_SYNTHESIS_MODEL,
    label: "Work coordination drafting",
  },
  BF: {
    overrideVar: "BF_SYNTHESIS_MODEL",
    defaultModel: DEFAULT_SYNTHESIS_MODEL,
    label: "Business Foundation drafting",
  },
} as const satisfies Record<string, z.input<typeof ResolverOptions>>;

export const M03_DEFAULT_SYNTHESIS_MODEL = MODULE_POLICIES.M03.defaultModel;
export const M04_DEFAULT_SYNTHESIS_MODEL = MODULE_POLICIES.M04.defaultModel;
export const M05_DEFAULT_SYNTHESIS_MODEL = MODULE_POLICIES.M05.defaultModel;
export const M06_DEFAULT_SYNTHESIS_MODEL = MODULE_POLICIES.M06.defaultModel;
export const M07_DEFAULT_SYNTHESIS_MODEL = MODULE_POLICIES.M07.defaultModel;
export const M08_DEFAULT_SYNTHESIS_MODEL = MODULE_POLICIES.M08.defaultModel;
export const M09_DEFAULT_SYNTHESIS_MODEL = MODULE_POLICIES.M09.defaultModel;
export const M10_DEFAULT_SYNTHESIS_MODEL = MODULE_POLICIES.M10.defaultModel;
export const M11_DEFAULT_SYNTHESIS_MODEL = MODULE_POLICIES.M11.defaultModel;
export const M12_DEFAULT_SYNTHESIS_MODEL = MODULE_POLICIES.M12.defaultModel;
export const BF_DEFAULT_SYNTHESIS_MODEL = MODULE_POLICIES.BF.defaultModel;

/** M03–M12 and the Business Foundation drafting, critique and independent review use a strong synthesis model in production; development may use inexpensive models. */
export function resolveM03Model(env: Record<string, string | undefined>) {
  return resolveSynthesisModel(env, MODULE_POLICIES.M03);
}
export function resolveM04Model(env: Record<string, string | undefined>) {
  return resolveSynthesisModel(env, MODULE_POLICIES.M04);
}
export function resolveM05Model(env: Record<string, string | undefined>) {
  return resolveSynthesisModel(env, MODULE_POLICIES.M05);
}
export function resolveM06Model(env: Record<string, string | undefined>) {
  return resolveSynthesisModel(env, MODULE_POLICIES.M06);
}
export function resolveM07Model(env: Record<string, string | undefined>) {
  return resolveSynthesisModel(env, MODULE_POLICIES.M07);
}
export function resolveM08Model(env: Record<string, string | undefined>) {
  return resolveSynthesisModel(env, MODULE_POLICIES.M08);
}
export function resolveM09Model(env: Record<string, string | undefined>) {
  return resolveSynthesisModel(env, MODULE_POLICIES.M09);
}
export function resolveM10Model(env: Record<string, string | undefined>) {
  return resolveSynthesisModel(env, MODULE_POLICIES.M10);
}

export function resolveCDModel(env: Record<string, string | undefined>) {
  return resolveSynthesisModel(env, MODULE_POLICIES.CD);
}
export function resolveM11Model(env: Record<string, string | undefined>) {
  return resolveSynthesisModel(env, MODULE_POLICIES.M11);
}
export function resolveM12Model(env: Record<string, string | undefined>) {
  return resolveSynthesisModel(env, MODULE_POLICIES.M12);
}
export function resolveBFModel(env: Record<string, string | undefined>) {
  return resolveSynthesisModel(env, MODULE_POLICIES.BF);
}

export const M01_DEFAULT_SYNTHESIS_MODEL=MODULE_POLICIES.M01.defaultModel;
export function resolveM01Model(env:Record<string,string|undefined>){return resolveSynthesisModel(env,MODULE_POLICIES.M01);}

export const M02_DEFAULT_SYNTHESIS_MODEL=MODULE_POLICIES.M02.defaultModel;
export function resolveM02Model(env:Record<string,string|undefined>){return resolveSynthesisModel(env,MODULE_POLICIES.M02);}
