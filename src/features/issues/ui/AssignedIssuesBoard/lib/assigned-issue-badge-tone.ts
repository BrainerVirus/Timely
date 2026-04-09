const toneClasses = {
  neutral: "border-border-subtle bg-field text-muted-foreground",
  primary: "border-primary/35 bg-primary/10 text-primary",
  accent: "border-accent/35 bg-accent/10 text-accent",
  success: "border-success/35 bg-success/10 text-success",
  warning: "border-warning/45 bg-warning/10 text-warning",
  secondary: "border-secondary/35 bg-secondary/10 text-secondary",
  destructive: "border-destructive/35 bg-destructive/10 text-destructive",
} as const;

type ToneName = keyof typeof toneClasses;

const fallbackTones: ToneName[] = ["primary", "accent", "success", "warning", "secondary"];
const exactValueTones = new Map<string, ToneName>([
  ["task", "accent"],
  ["enhancement", "warning"],
  ["feature", "accent"],
  ["bug", "destructive"],
  ["epic", "secondary"],
  ["frontend", "primary"],
  ["backend", "secondary"],
  ["other", "neutral"],
  ["meeting", "secondary"],
  ["irp", "primary"],
]);

function hashString(value: string) {
  let hash = 0;
  for (const character of value) {
    hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
  }
  return hash;
}

function normalizeValue(value: string) {
  return value.trim().toLowerCase();
}

function workflowTone(value: string): ToneName {
  if (/(done|complete|completed|resolved|cerrad|finalizad|listo|terminad)/.test(value)) {
    return "success";
  }
  if (/(doing|progress|review|develop|curso|progreso|desarrollo)/.test(value)) {
    return "accent";
  }
  if (/(todo|to[\s_-]?do|backlog|ready|planned|triage|pendiente|hacer)/.test(value)) {
    return "primary";
  }
  if (/(closed|cerrad)/.test(value)) {
    return "neutral";
  }
  return "secondary";
}

export function getAssignedIssueStateBadgeClassName(state: string) {
  return state.toLowerCase() === "closed" ? toneClasses.neutral : toneClasses.success;
}

export function getAssignedIssueWorkflowBadgeClassName(value: string) {
  return toneClasses[workflowTone(normalizeValue(value))];
}

export function getAssignedIssueLabelBadgeClassName(label: string) {
  const normalized = normalizeValue(label);

  if (/^\d{4}$/.test(normalized)) {
    return toneClasses[fallbackTones[hashString(normalized) % fallbackTones.length] ?? "primary"];
  }

  if (normalized.startsWith("workflow::")) {
    return toneClasses[workflowTone(normalized.split("::")[1] ?? normalized)];
  }

  if (normalized.startsWith("category::")) {
    return toneClasses.accent;
  }

  if (normalized.startsWith("team::")) {
    return toneClasses.secondary;
  }

  if (normalized.startsWith("priority::")) {
    if (/(high|critical|urgent|alta)/.test(normalized)) {
      return toneClasses.destructive;
    }
    if (/(medium|med)/.test(normalized)) {
      return toneClasses.warning;
    }
    return toneClasses.neutral;
  }

  const exactTone = exactValueTones.get(normalized);
  if (exactTone) {
    return toneClasses[exactTone];
  }

  return toneClasses[fallbackTones[hashString(normalized) % fallbackTones.length] ?? "primary"];
}
