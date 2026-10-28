<script lang="ts">
	import * as Select from "#lib/components/ui/select/index.js";
	import { Button } from "#lib/components/ui/button/index.js";
	import * as Card from "#lib/components/ui/card/index.js";
	import type { M04Field } from "#lib/modules/strategy/shared/fields/m04.js";
	import RecursiveFieldEditor from "./M04FieldEditor.svelte";

	let { fields, value = {}, onChange, depth = 0 }: {
		fields: readonly M04Field[];
		value?: Record<string, unknown>;
		onChange: (next: Record<string, unknown>) => void;
		depth?: number;
	} = $props();

	const set = (key: string, nextValue: unknown) => {
		const field = fields.find((item) => item.key === key);
		const next = { ...value };
		if (nextValue === "__none__") {
			if (field?.nullable) next[key] = null;
			else delete next[key];
		} else if (field?.optional && nextValue === "") delete next[key];
		else next[key] = nextValue;
		if (field?.mirrorBoolean) next[field.mirrorBoolean] = nextValue === "applicable";
		if (key === "input_type" && nextValue === "unknown") next.value_or_range = null;
		if (key === "modelQuestions" && Array.isArray(nextValue)) {
			const answers = nextValue as string[];
			const yes = answers.filter((answer) => answer === "yes").length;
			next.complexity = answers.length !== 4 || answers.some((answer) => answer === "unknown") ? "unknown" : yes >= 3 ? "high" : yes > 0 ? "mixed" : "low";
		}
		onChange(next);
	};
	const add = (field: M04Field) => {
		const current = Array.isArray(value[field.key]) ? [...(value[field.key] as unknown[])] : [];
		current.push(field.kind === "object-list" ? {} : "");
		set(field.key, current);
	};
	const setObject = (field: M04Field, nextValue: Record<string, unknown> | null) => set(field.key, nextValue);
	const remove = (field: M04Field, index: number) => {
		const current = [...((value[field.key] as unknown[]) ?? [])];
		current.splice(index, 1);
		set(field.key, current);
	};
	const computedValue = (field: M04Field, current: unknown) => {
		if (field.key === "allowedOutputs" && Array.isArray(current)) {
			if (!current.length) return "No additional output authority";
			return current.map((item) => typeof item === "string" && item.startsWith("reduced-") ? `Named reduced capability: ${item.slice("reduced-".length).replaceAll("-", " ")}` : String(item)).join(", ");
		}
		if (field.key === "memoHash" && typeof current === "string") return current ? "Exact recommendation version recorded" : "Present the exact recommendation before recording a decision";
		return String(current ?? "unknown");
	};
</script>

<div class="space-y-5">
	{#each fields as field (field.key)}
		{@const current = value[field.key]}
		<div class="space-y-2">
			{#if field.kind === "object"}
				<div class="flex flex-wrap items-start justify-between gap-3">
					<div><h3 class="font-medium">{field.label}</h3>{#if field.help}<p class="mt-1 max-w-3xl text-sm text-muted-foreground">{field.help}</p>{/if}</div>
					<div class="flex gap-2">{#if field.nullable}<Button type="button" variant="outline" size="sm" onclick={() => setObject(field, null)}>Clear / not applicable</Button>{/if}<Button type="button" variant="outline" size="sm" onclick={() => setObject(field, (current && typeof current === "object" && !Array.isArray(current) ? current : {}) as Record<string, unknown>)}>{current && typeof current === "object" ? "Edit details" : "Enter details"}</Button></div>
				</div>
				{#if current && typeof current === "object" && !Array.isArray(current) && field.itemFields}
					<Card.Root><Card.Content class="p-4"><RecursiveFieldEditor fields={field.itemFields} value={current as Record<string, unknown>} depth={depth + 1} onChange={(next) => setObject(field, next)} /></Card.Content></Card.Root>
				{:else if field.nullable && current === null}
					<p class="rounded-md border border-dashed p-4 text-sm text-muted-foreground">Not applicable / no override recorded.</p>
				{:else if field.itemFields}
					<Card.Root><Card.Content class="p-4"><RecursiveFieldEditor fields={field.itemFields} value={{}} depth={depth + 1} onChange={(next) => setObject(field, next)} /></Card.Content></Card.Root>
				{/if}
			{:else if field.kind === "object-list"}
				{@const rows = Array.isArray(current) ? (current as unknown[]) : []}
				<div class="flex flex-wrap items-start justify-between gap-3">
					<div>
						<h3 class="font-medium">{field.label}</h3>
						{#if field.help}<p class="mt-1 max-w-3xl text-sm text-muted-foreground">{field.help}</p>{/if}
						{#if field.minItems != null || field.maxItems != null}
							<p class="mt-1 text-xs {rows.length < (field.minItems ?? 0) || rows.length > (field.maxItems ?? Number.POSITIVE_INFINITY) ? 'text-destructive' : 'text-muted-foreground'}">
								{#if field.minItems != null && field.maxItems != null && field.minItems === field.maxItems}
									{rows.length} of exactly {field.minItems}
								{:else if field.minItems != null && field.maxItems != null}
									{rows.length} of {field.minItems}–{field.maxItems}
								{:else if field.maxItems != null}
									{rows.length} of up to {field.maxItems}
								{:else}
									{rows.length} of at least {field.minItems}
								{/if}
							</p>
						{/if}
					</div>
					<Button type="button" variant="outline" size="sm" onclick={() => add(field)} disabled={field.maxItems != null && rows.length >= field.maxItems}>Add {field.label.toLowerCase().replace(/s$/, "")}</Button>
				</div>
				{#each rows as row, index (index)}
					<Card.Root>
						<Card.Content class="space-y-4 p-4">
							<div class="flex justify-between gap-3">
								<p class="text-sm font-medium">{field.label.replace(/s$/, "")} {index + 1}</p>
								<Button type="button" variant="ghost" size="sm" onclick={() => remove(field, index)} disabled={field.minItems != null && rows.length <= field.minItems}>Remove</Button>
							</div>
							{#if field.itemFields}
								<RecursiveFieldEditor fields={field.itemFields} value={(row && typeof row === "object" ? row : {}) as Record<string, unknown>} depth={depth + 1} onChange={(next: Record<string, unknown>) => {
									const target = [...((Array.isArray(current) ? current : []) as unknown[])]; target[index] = next; set(field.key, target);
								}} />
							{:else}
								<p class="text-sm text-muted-foreground">Add details for this item below.</p>
							{/if}
						</Card.Content>
					</Card.Root>
				{:else}
					<p class="rounded-md border border-dashed p-4 text-sm text-muted-foreground">No entries yet. Add one to record this finding.</p>
				{/each}
			{:else if field.kind === "list"}
				{@const items = Array.isArray(current) ? (current as unknown[]) : []}
				<label class="block space-y-1">
					<span class="text-sm font-medium">{field.label}</span>
					{#if field.help}<span class="block text-sm text-muted-foreground">{field.help}</span>{/if}
					<textarea class="min-h-24 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={Array.isArray(current) ? current.join("\n") : ""} placeholder="One item per line" oninput={(event) => set(field.key, event.currentTarget.value.split("\n").map((item) => item.trim()).filter(Boolean))}></textarea>
					{#if field.minItems != null || field.maxItems != null}
						{#if field.minItems != null && field.maxItems != null && field.minItems === field.maxItems}
							<span class="block text-xs {items.length === field.minItems ? 'text-muted-foreground' : 'text-destructive'}">{items.length} of exactly {field.minItems}.</span>
						{:else if field.minItems != null && items.length < field.minItems}
							<span class="block text-xs text-destructive">{items.length} of at least {field.minItems} — add {field.minItems - items.length} more.</span>
						{:else if field.maxItems != null && items.length > field.maxItems}
							<span class="block text-xs text-destructive">{items.length} — no more than {field.maxItems}.</span>
						{:else}
							<span class="block text-xs text-muted-foreground">{items.length} item{items.length === 1 ? "" : "s"} recorded.</span>
						{/if}
					{/if}
				</label>
			{:else if field.kind === "select-list"}
				<div class="space-y-3">
					<div><span class="text-sm font-medium">{field.label}</span>{#if field.help}<p class="text-sm text-muted-foreground">{field.help}</p>{/if}</div>
					{#each ["Inventory / physical production", "Per-unit variable cost model", "Pricing as a primary lever", "Recurring or multi-period economics"] as question, index (index)}
						<label class="grid items-center gap-3 sm:grid-cols-[1fr_14rem]"><span class="text-sm">{index + 1}. {question}</span><Select.Root type="single" value={Array.isArray(current) ? String(current[index] ?? "unknown") : "unknown"} onValueChange={(next) => { const values = Array.isArray(current) ? [...current] : []; values[index] = next; set(field.key, values); }}><Select.Trigger class="w-full"><Select.Value /></Select.Trigger><Select.Content>{#each field.options ?? [] as option (option.value)}<Select.Item value={option.value}>{option.label}</Select.Item>{/each}</Select.Content></Select.Root></label>
					{/each}
				</div>
			{:else if field.kind === "computed"}
				<div class="rounded-md bg-muted/50 p-3"><p class="text-sm font-medium">{field.label}: <span class="capitalize">{computedValue(field, current)}</span></p>{#if field.help}<p class="mt-1 text-sm text-muted-foreground">{field.help}</p>{/if}</div>
			{:else if field.kind === "boolean"}
				<label class="flex items-center gap-3 rounded-md border p-3 text-sm">
					<input type="checkbox" checked={current === true} disabled={field.readOnly} onchange={(event) => set(field.key, event.currentTarget.checked)} />
					<span>{field.label}{#if field.help}<small class="mt-1 block text-muted-foreground">{field.help}</small>{/if}</span>
				</label>
			{:else if field.kind === "nullable-boolean"}
				<label class="block space-y-1">
					<span class="text-sm font-medium">{field.label}</span>
					{#if field.help}<span class="block text-sm text-muted-foreground">{field.help}</span>{/if}
					<Select.Root type="single" value={current === null || current === undefined ? "unknown" : current ? "true" : "false"} onValueChange={(next) => set(field.key, next === "unknown" ? null : next === "true")}>
						<Select.Trigger class="w-full" disabled={field.readOnly}><Select.Value /></Select.Trigger>
						<Select.Content><Select.Item value="true">Present</Select.Item><Select.Item value="false">Not present</Select.Item><Select.Item value="unknown">Unresolved</Select.Item></Select.Content>
					</Select.Root>
				</label>
			{:else if field.kind === "select"}
				<label class="block space-y-1">
					<span class="text-sm font-medium">{field.label}</span>
					{#if field.help}<span class="block text-sm text-muted-foreground">{field.help}</span>{/if}
					<Select.Root type="single" value={typeof current === "string" ? current : field.nullable && current === null ? "__none__" : ""} onValueChange={(next) => set(field.key, next)}>
						<Select.Trigger class="w-full" disabled={field.readOnly}><Select.Value placeholder="Choose an option" /></Select.Trigger>
						<Select.Content>
							{#if field.optional}<Select.Item value="__none__">Not applicable</Select.Item>{/if}
							{#each field.options ?? [] as option (option.value)}
								<Select.Item value={option.value}>{option.label}</Select.Item>
							{/each}
						</Select.Content>
					</Select.Root>
				</label>
			{:else}
				<label class="block space-y-1">
					<span class="text-sm font-medium">{field.label}</span>
					{#if field.help}<span class="block text-sm text-muted-foreground">{field.help}</span>{/if}
					{#if field.kind === "range"}
						<div class="space-y-3">
							<div class="flex gap-2"><Button type="button" variant={typeof current === "object" && current !== null ? "outline" : "default"} size="sm" onclick={() => set(field.key, typeof current === "number" ? current : current && typeof current === "object" && typeof (current as Record<string, unknown>).low === "number" ? (current as Record<string, unknown>).low : null)}>Single value</Button><Button type="button" variant={typeof current === "object" && current !== null ? "default" : "outline"} size="sm" onclick={() => set(field.key, current && typeof current === "object" ? current : typeof current === "number" ? { low: current, high: current } : { low: null, high: null })}>Range</Button></div>
							{#if current && typeof current === "object"}
								<div class="grid grid-cols-2 gap-3"><label class="space-y-1"><span class="text-xs text-muted-foreground">Low</span><input type="number" step="any" class="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={String((current as Record<string, unknown>).low ?? "")} oninput={(event) => { const low = event.currentTarget.value === "" ? null : Number(event.currentTarget.value); const high = Number((current as Record<string, unknown>).high ?? low); set(field.key, low === null ? null : { low, high }); }} /></label><label class="space-y-1"><span class="text-xs text-muted-foreground">High</span><input type="number" step="any" class="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={String((current as Record<string, unknown>).high ?? "")} oninput={(event) => { const high = event.currentTarget.value === "" ? null : Number(event.currentTarget.value); const low = Number((current as Record<string, unknown>).low ?? high); set(field.key, high === null ? null : { low, high }); }} /></label></div>
							{:else}<label class="block space-y-1"><span class="text-xs text-muted-foreground">Single value</span><input type="number" step="any" class="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={typeof current === "number" ? current : ""} oninput={(event) => set(field.key, event.currentTarget.value === "" ? null : Number(event.currentTarget.value))} /></label>{/if}
						</div>
					{:else if field.kind === "number"}
						<input type="number" step="any" class="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={typeof current === "number" ? current : ""} oninput={(event) => set(field.key, event.currentTarget.value === "" ? null : Number(event.currentTarget.value))} />
					{:else if field.kind === "textarea"}
						<textarea class="min-h-24 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" readonly={field.readOnly} value={typeof current === "string" ? current : ""} oninput={(event) => set(field.key, event.currentTarget.value)}></textarea>
					{:else}
						<input class="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" readonly={field.readOnly} value={typeof current === "string" ? current : ""} oninput={(event) => set(field.key, event.currentTarget.value)} />
					{/if}
				</label>
			{/if}
		</div>
	{/each}
</div>
