/**
 * Minimal Directus schema for the sync SDK.
 * Only includes directus_users and directus_files — the collections
 * the SDK actually touches. Apps keep their full schema for content queries.
 */

export interface DirectusSyncSchemaUser {
	id: string;
	first_name?: string | null;
	last_name?: string | null;
	email?: string | null;
	password?: string | null;
	location?: string | null;
	title?: string | null;
	description?: string | null;
	tags?: string[] | null;
	avatar?: string | null;
	language?: string | null;
	tfa_secret?: string | null;
	status?: 'draft' | 'invited' | 'unverified' | 'active' | 'suspended' | 'archived';
	role?: string | null;
	token?: string | null;
	date_created?: string | null;
	last_access?: string | null;
	last_page?: string | null;
	provider?: string;
	external_identifier?: string | null;
	auth_data?: unknown | null;
	email_notifications?: boolean | null;
	appearance?: null | 'auto' | 'light' | 'dark';
	policies?: unknown[];
}

export interface DirectusSyncSchemaFile {
	id: string;
	storage?: string;
	filename_disk?: string | null;
	filename_download?: string;
	title?: string | null;
	type?: string | null;
	folder?: string | null;
	uploaded_by?: string | null;
	created_on?: string;
	modified_by?: string | null;
	modified_on?: string;
	charset?: string | null;
	filesize?: number | null;
	width?: number | null;
	height?: number | null;
	duration?: number | null;
	embed?: string | null;
	description?: string | null;
	location?: string | null;
	tags?: string[] | null;
	metadata?: unknown | null;
	focal_point_x?: number | null;
	focal_point_y?: number | null;
}

export interface DirectusSyncSchema {
	directus_users: DirectusSyncSchemaUser[];
	directus_files: DirectusSyncSchemaFile[];
}
