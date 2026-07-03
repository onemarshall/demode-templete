type DirectusImageLike =
	| string
	| {
			id?: string | null;
			directus_files_id?: string | { id?: string | null } | null;
			image?: string | { id?: string | null } | null;
			file?: string | { id?: string | null } | null;
	  }
	| null
	| undefined;

const readId = (value: unknown): string | null => {
	if (!value) return null;
	if (typeof value === "string") return value;
	if (typeof value === "object" && "id" in value) {
		const id = (value as { id?: unknown }).id;
		return typeof id === "string" ? id : null;
	}
	return null;
};

export const getImageUuid = (value: DirectusImageLike): string | null => {
	const direct = readId(value);
	if (direct) return direct;
	if (!value || typeof value !== "object") return null;

	return (
		readId(value.directus_files_id) ??
		readId(value.image) ??
		readId(value.file)
	);
};

export const getImageObjectPosition = (
	value:
		| {
				focal_point_x?: number | null;
				focal_point_y?: number | null;
				width?: number | null;
				height?: number | null;
		  }
		| null
		| undefined,
): string => {
	if (!value?.focal_point_x || !value?.focal_point_y || !value.width || !value.height) {
		return "center";
	}

	const x = Math.round((value.focal_point_x / value.width) * 100);
	const y = Math.round((value.focal_point_y / value.height) * 100);
	return `${x}% ${y}%`;
};
