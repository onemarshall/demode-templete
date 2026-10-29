/**
 * VAT configuration.
 *
 * The business has not established its VAT position, so this resolves to
 * "off" unless the owner sets the variables. Turning it on is a decision, not
 * a deployment detail:
 *
 *   1. Confirm VAT registration and the applicable rate with the accountant.
 *   2. Recreate the Stripe prices with an explicit `tax_behavior`, because it
 *      is immutable once a price exists. Our current prices are `unspecified`.
 *   3. Add the tax registration in Stripe Tax.
 *   4. Set VAT_ENABLED=true and redeploy.
 *
 * Until all four are true, charging VAT would be wrong in one direction or the
 * other, so the switch stays off.
 */
export interface VatConfig {
	enabled: boolean;
	/** Percentage, e.g. 20 for UK standard rate. */
	ratePercent: number;
	/** Whether the displayed catalogue price includes VAT. */
	display: 'exclusive' | 'inclusive';
	/** Stripe Tax calculates the amount; the display is ours. */
	automaticTax: boolean;
}

interface VatEnv {
	VAT_ENABLED?: boolean | string;
	VAT_RATE_PERCENT?: string | number;
	VAT_PRICE_DISPLAY?: string;
}

const asBool = (value: boolean | string | undefined): boolean =>
	value === true || value === 'true' || value === '1';

export function getVatConfig(env: VatEnv): VatConfig {
	const enabled = asBool(env.VAT_ENABLED);
	const rawRate = Number(env.VAT_RATE_PERCENT ?? 20);
	const ratePercent = Number.isFinite(rawRate) && rawRate >= 0 ? rawRate : 20;
	const display = env.VAT_PRICE_DISPLAY === 'inclusive' ? 'inclusive' : 'exclusive';

	return {
		enabled,
		ratePercent,
		display,
		// Stripe Tax only makes sense once the prices carry a tax_behavior and
		// a registration exists. Enabling it early produces a silent zero.
		automaticTax: enabled,
	};
}

/** Short suffix for a price label, e.g. "excl. VAT". Empty when VAT is off. */
export function vatLabel(config: VatConfig): string {
	if (!config.enabled) return '';
	return config.display === 'inclusive' ? 'incl. VAT' : 'excl. VAT';
}
