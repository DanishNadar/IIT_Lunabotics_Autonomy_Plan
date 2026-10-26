/** Identity of anonymous visitors: read-only, never stored in the database. Safe to import on the client. */
export const GUEST_ID = "00000000-0000-4000-8000-000000000000";

export const isGuestId = (id: string) => id === GUEST_ID;
