export interface ParsedPackage {
  street: string;
  number: string;
  quantity: number;
  status: "Entregado" | "Incidencia";
}

export interface MorningReport {
  packages: ParsedPackage[];
  totalCount: number;
  messageTotal: number;
}

export interface AfternoonReport {
  postalCode: string;
  date: string;
  received: number;
  incidents: number;
  delivered: number;
  earnings: number;
}

export interface AirtableSettings {
  pat: string;
  baseId: string;
  deliveriesTable: string;
  summariesTable: string;
}

export interface GoogleAuthSettings {
  clientId: string;
  authorizedEmail: string;
}

export interface UserSession {
  email: string;
  name: string;
  picture: string;
  loggedIn: boolean;
  method: "google" | "local";
}
