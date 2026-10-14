import type { CliObjectiveKind } from "@/db/schema";

/* Pure CLI mission logic — types, labels, and the objective evaluator.
   Deliberately free of any database import so client components can
   use it without webpack trying to bundle Postgres for the browser. */

export type IfaceState = {
  ip: string | null;
  mask: string | null;
  up: boolean;
  desc: string | null;
  speed: string | null;
  mode: "access" | "trunk" | null;
  accessVlan: string | null;
  encap: string | null; // dot1q VLAN id on a sub-interface
};

export const blankIface = (): IfaceState => ({
  ip: null, mask: null, up: false, desc: null,
  speed: null, mode: null, accessVlan: null, encap: null,
});

export type DeviceState = {
  hostname: string;
  reachedPriv: boolean;
  reachedConf: boolean;
  saved: boolean;
  banner: string | null;
  vtyPassword: string | null;
  vtyLogin: boolean;
  ipRouting: boolean;
  natOverload: boolean;
  dhcpPools: Record<string, { network: string | null }>;
  routes: { dest: string; mask: string; via: string }[];
  vlans: string[];
  verified: boolean;
  interfaces: Record<string, IfaceState>;
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
  imagePath: string | null;
  timeLimitSeconds: number;
  objectives: PlayableObjective[];
};

/* Physical ports the simulated device has. */
export const INTERFACES = [
  "GigabitEthernet0/0",
  "GigabitEthernet0/1",
  "GigabitEthernet0/2",
  "FastEthernet0/1",
  "FastEthernet0/2",
  "FastEthernet0/3",
  "FastEthernet0/4",
];

/* Sub-interfaces a professor can pick in the objective form. Students can
   create any sub-interface (1-4094) of a physical port. */
export const SUB_INTERFACES = [
  "GigabitEthernet0/0.10",
  "GigabitEthernet0/0.20",
  "GigabitEthernet0/0.30",
];
export const OBJECTIVE_IFACES = [...INTERFACES, ...SUB_INTERFACES];

export const shortIf = (n?: string | null) =>
  (n ?? "").replace("GigabitEthernet", "Gi").replace("FastEthernet", "Fa");

const SHORT_NAMES: Record<string, string[]> = {
  GigabitEthernet: ["g", "gi", "gig", "gigabitethernet"],
  FastEthernet: ["f", "fa", "fast", "fastethernet"],
};

/** "g0/0.10", "fa0/1", "GigabitEthernet0/1" -> canonical name, or null. */
export function resolveInterface(token: string): string | null {
  const t = token.toLowerCase().replace(/\s+/g, "");
  const m = t.match(/^([a-z]+)(\d+\/\d+)(?:\.(\d+))?$/);
  if (!m) return null;
  const [, prefix, num, sub] = m;
  if (sub && (Number(sub) < 1 || Number(sub) > 4094)) return null;
  for (const name of INTERFACES) {
    const type = name.replace(/\d.*$/, "");
    if (name.replace(/^[A-Za-z]+/, "") !== num) continue;
    if (!SHORT_NAMES[type].includes(prefix)) continue;
    return sub ? `${name}.${sub}` : name;
  }
  return null;
}

/** Human-readable label so professors don't have to write one. */
export function describeObjective(o: {
  kind: CliObjectiveKind;
  iface?: string | null;
  value?: string | null;
  value2?: string | null;
}): string {
  const ifc = shortIf(o.iface);
  switch (o.kind) {
    case "reach_priv": return "Enter privileged EXEC mode";
    case "reach_conf": return "Enter global configuration mode";
    case "hostname": return `Set the hostname to ${o.value ?? "?"}`;
    case "interface_ip": return `Give ${ifc} the address ${o.value ?? "?"} ${o.value2 ?? ""}`.trim();
    case "interface_up": return `Bring ${ifc} up (no shutdown)`;
    case "interface_desc": return `Describe ${ifc} as ${o.value ?? "?"}`;
    case "vty_password": return `Set the VTY password to ${o.value ?? "?"}`;
    case "vty_login": return "Require login on the VTY lines";
    case "banner": return "Configure a MOTD banner";
    case "saved": return "Save the configuration";
    case "dhcp_pool": return `Configure a DHCP pool named ${o.value ?? "?"}`;
    case "static_route": return `Add a static route to ${o.value ?? "?"} via ${o.value2 ?? "?"}`;
    case "sub_interface": return `Create sub-interface ${ifc}`;
    case "port_speed": return `Set ${ifc} speed to ${o.value ?? "?"}`;
    case "ip_routing": return "Enable IP routing";
    case "nat_overload": return "Configure NAT overload (PAT)";
    case "trunk_port": return `Configure ${ifc} as a trunk port`;
    case "access_port": return `Configure ${ifc} as an access port`;
    case "vlan_assign": return `Assign ${ifc} to VLAN ${o.value ?? "?"}`;
    case "vlan_create": return `Create VLAN ${o.value ?? "?"}`;
    case "verify_port": return "Verify the switch ports (show interfaces status)";
    case "router_trunk": return `Configure ${ifc} for trunking (dot1q VLAN ${o.value ?? "?"})`;
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
    case "dhcp_pool": return Boolean(s.dhcpPools[o.value ?? ""]?.network);
    case "static_route":
      return s.routes.some((r) => `${r.dest} ${r.mask}` === o.value && r.via === o.value2);
    case "sub_interface": return Boolean(iface && o.iface?.includes("."));
    case "port_speed": return Boolean(iface && iface.speed === o.value);
    case "ip_routing": return s.ipRouting;
    case "nat_overload": return s.natOverload;
    case "trunk_port": return iface?.mode === "trunk";
    case "access_port": return iface?.mode === "access";
    case "vlan_assign": return Boolean(iface && iface.accessVlan === o.value);
    case "vlan_create": return s.vlans.includes(o.value ?? "");
    case "verify_port": return s.verified;
    case "router_trunk": return Boolean(iface && iface.encap === o.value);
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
  { kind: "dhcp_pool", label: "Configure DHCP pool", needs: ["value"] },
  { kind: "static_route", label: "Configure static route", needs: ["value", "value2"] },
  { kind: "sub_interface", label: "Configure sub-interface", needs: ["iface"] },
  { kind: "port_speed", label: "Configure port speed", needs: ["iface", "value"] },
  { kind: "ip_routing", label: "Enable IP routing", needs: [] },
  { kind: "nat_overload", label: "Configure NAT overload (PAT)", needs: [] },
  { kind: "trunk_port", label: "Configure trunk port", needs: ["iface"] },
  { kind: "access_port", label: "Configure access port", needs: ["iface"] },
  { kind: "vlan_assign", label: "Assign port to VLAN", needs: ["iface", "value"] },
  { kind: "vlan_create", label: "Create VLAN", needs: ["value"] },
  { kind: "verify_port", label: "Verify switch port", needs: [] },
  { kind: "router_trunk", label: "Configure router trunk (dot1q)", needs: ["iface", "value"] },
];