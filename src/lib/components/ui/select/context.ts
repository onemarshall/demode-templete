import { getContext, setContext } from "svelte";

const SELECT_CONTEXT = Symbol("select");

type SelectContext = {
	getValue: () => string;
	setValue: (value: string) => void;
};

export const setSelectContext = (context: SelectContext) => setContext(SELECT_CONTEXT, context);
export const getSelectContext = () => getContext<SelectContext>(SELECT_CONTEXT);
