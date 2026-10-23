/**
 * Montsel organisation access control (spec §6.1, decision D5, Appendix A).
 *
 * Isomorphic: imported by the server config, the migration CLI and the
 * client plugin. Custom roles override the plugin's predefined permissions,
 * so each role merges the shipped statements it should keep.
 *
 * D5: the default admin role includes `member: [create, update, delete]`,
 * which would let an admin grant the admin role — broader than §6.1 allows.
 * Admin therefore loses `member:update`: admins manage ordinary members
 * (invite, remove); every role change to or from admin/owner is owner-only.
 */

import { createAccessControl } from 'better-auth/plugins/access';
import {
	defaultStatements,
	adminAc,
	ownerAc,
	memberAc
} from 'better-auth/plugins/organization/access';

export const ac = createAccessControl(defaultStatements);

export const owner = ac.newRole({
	...ownerAc.statements
});

export const admin = ac.newRole({
	...adminAc.statements,
	member: ['create', 'delete']
});

export const member = ac.newRole({
	...memberAc.statements
});
