export type PocConfig = {
  id: string;
  configName: string;
  clientId: string;
  clientName: string;
  websiteId: string;
  websiteLink: string | null;
  tenantId: string;
  /** The widget settings, stored by the API as a JSON string. */
  cdnConfig: string;
  createdAt: string | null;
  updatedAt: string | null;
  createdBy: string | null;
  updatedBy: string | null;
  /** Optimistic-locking counter; an update must send back the version it read. */
  version: number;
  /** Persistence flag the API echoes back; false once the row is stored. */
  new: boolean;
};

/** The fields a user edits; the service adds the audit fields below when it writes. */
export type PocConfigMutationPayload = {
  configName: string;
  clientId: string;
  clientName: string;
  websiteId: string;
  websiteLink: string | null;
  tenantId: string;
  cdnConfig: string;
};

/** Request body for POST /api/v1/widget-configs and PUT /api/v1/widget-configs/{id}. */
export type PocConfigWriteBody = PocConfigMutationPayload & {
  id?: string;
  createdBy: string;
  updatedBy: string;
  version: number;
  new: boolean;
};
