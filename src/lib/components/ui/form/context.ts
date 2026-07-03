import { getContext, setContext } from "svelte";

const FORM_FIELD_CONTEXT = Symbol("form-field");

export type FormFieldContext = {
	getName: () => string;
};

export const setFormFieldContext = (context: FormFieldContext) => {
	setContext(FORM_FIELD_CONTEXT, context);
};

export const getFormFieldContext = (): FormFieldContext | undefined =>
	getContext<FormFieldContext>(FORM_FIELD_CONTEXT);
