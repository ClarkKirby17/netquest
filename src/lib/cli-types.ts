import type { CliObjectiveKind } from "@/db/schema";

/* Pure CLI mission logic — types, labels, and the objective evaluator.
   Deliberately free of any database import so client components can
   use it without webpack trying to bundle Postgres for the browser. */

export type DeviceState = {
  hostname: string;
  reachedPriv: boolean;
  reachedConf: boolean;
  saved: boolean;
  banner: string | null;
  vtyPassword: string | null;
  vtyLogin: boolean;
  interfaces: Record<
    string,
    { ip: string | null; mask: string | null; up: boolean; desc: string | null }
  >;
};

export type PlayableObjective = {
  id: number;
  kind: CliObjectiveKind;
  iface: string | null;
  value: string | null;
  value2: string | null;
  label: string;
};

export type PlayableMission = {
  id: number;
  title: string;
  briefing: string;
  timeLimitSeconds: number;
  objectives: PlayableObjective[];
};

export const INTERFACES = [
  "GigabitEthernet0/0",
  "GigabitEthernet0/1",
  "GigabitEthernet0/2",
];

/** Human-readable label so professors don't have to write one. */
export function describeObjective(o: {
  kind: CliObjectiveKind;
  iface?: string | null;
  value?: string | null;
  value2?: string | null;
}): string {
  const shortIf = (o.iface ?? "").replace("GigabitEthernet", "Gi");
  switch (o.kind) {
    case "reach_priv": return "Enter privileged EXEC mode";
    case "reach_conf": return "Enter global configuration mode";
    case "hostname": return `Set the hostname to ${o.value ?? "?"}`;
    case "interface_ip": return `Give ${shortIf} the address ${o.value ?? "?"} ${o.value2 ?? ""}`.trim();
    case "interface_up": return `Bring ${shortIf} up (no shutdown)`;
    case "interface_desc": return `Describe ${shortIf} as ${o.value ?? "?"}`;
    case "vty_password": return `Set the VTY password to ${o.value ?? "?"}`;
    case "vty_login": return "Require login on the VTY lines";
    case "banner": return "Configure a MOTD banner";
    case "saved": return "Save the configuration";
  }
}

/** Is this objective satisfied by the current device state? */
export function isObjectiveMet(o: PlayableObjective, s: DeviceState): boolean {
  const iface = o.iface ? s.interfaces[o.iface] : undefined;
  switch (o.kind) {
    case "reach_priv": return s.reachedPriv;
    case "reach_conf": return s.reachedConf;
    case "hostname": return s.hostname === o.value;
    case "interface_ip": return Boolean(iface && iface.ip === o.value && iface.mask === o.value2);
    case "interface_up": return Boolean(iface?.up);
    case "interface_desc":
      return (iface?.desc ?? "").trim().toUpperCase() === (o.value ?? "").trim().toUpperCase();
    case "vty_password": return s.vtyPassword === o.value;
    case "vty_login": return s.vtyLogin;
    case "banner": return Boolean(s.banner);
    case "saved": return s.saved;
    default: return false;
  }
}

export const OBJECTIVE_KINDS: {
  kind: CliObjectiveKind;
  label: string;
  needs: ("iface" | "value" | "value2")[];
}[] = [
  { kind: "reach_priv", label: "Enter privileged mode", needs: [] },
  { kind: "reach_conf", label: "Enter global config", needs: [] },
  { kind: "hostname", label: "Set hostname", needs: ["value"] },
  { kind: "interface_ip", label: "Assign IP + mask", needs: ["iface", "value", "value2"] },
  { kind: "interface_up", label: "Bring interface up", needs: ["iface"] },
  { kind: "interface_desc", label: "Describe interface", needs: ["iface", "value"] },
  { kind: "vty_password", label: "Set VTY password", needs: ["value"] },
  { kind: "vty_login", label: "Require VTY login", needs: [] },
  { kind: "banner", label: "Configure MOTD banner", needs: [] },
  { kind: "saved", label: "Save the configuration", needs: [] },
];
