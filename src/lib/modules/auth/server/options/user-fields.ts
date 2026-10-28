/** Shared runtime/migration schema for application-owned Better Auth user fields. */
export const AUTH_USER_FIELDS={
 provider:{type:'string' as const,required:true,defaultValue:'email',input:false},
 lastLoginMethod:{type:'string' as const}
};
