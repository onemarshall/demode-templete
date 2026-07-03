import { getContext, setContext } from "svelte";

const RADIO_CONTEXT = Symbol("radio-group");

type RadioContext = {
	getValue: () => string;
	setValue: (value: string) => void;
	getName?: () => string;
};

export const setRadioContext = (context: RadioContext) => setContext(RADIO_CONTEXT, context);
export const getRadioContext = () => getContext<RadioContext>(RADIO_CONTEXT);
