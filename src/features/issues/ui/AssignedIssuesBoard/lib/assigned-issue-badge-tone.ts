import type { ToneName } from "@/shared/types/dashboard";

export const toneClasses = {
  neutral: "border-border-subtle bg-field text-muted-foreground",
  primary: "border-primary/35 bg-primary/10 text-primary",
  accent: "border-accent/35 bg-accent/10 text-accent",
  success: "border-success/35 bg-success/10 text-success",
  warning: "border-warning/45 bg-warning/10 text-warning",
  secondary: "border-secondary/35 bg-secondary/10 text-secondary",
  destructive: "border-destructive/35 bg-destructive/10 text-destructive",
} as const;

function buildToneMap(entries: Array<[string[], ToneName]>): Map<string, ToneName> {
  const map = new Map<string, ToneName>();
  for (const [keys, tone] of entries) {
    for (const key of keys) {
      map.set(key, tone);
    }
  }
  return map;
}

// Exact dictionary — must stay in sync with Rust BadgeToneMapper::new()
const exactTones = buildToneMap([
  // Success states
  [
    [
      "done",
      "complete",
      "completed",
      "resolved",
      "finished",
      "closed",
      "cerrado",
      "finalizado",
      "listo",
      "terminado",
      "completado",
      "concluido",
      "resolvido",
      "fechado",
      "pronto",
    ],
    "success",
  ],
  // Accent states
  [
    [
      "doing",
      "in progress",
      "progress",
      "review",
      "developing",
      "development",
      "curso",
      "progreso",
      "desarrollo",
      "revision",
      "em progresso",
      "revisao",
      "desenvolvimento",
    ],
    "accent",
  ],
  // Primary states
  [
    [
      "todo",
      "to-do",
      "backlog",
      "ready",
      "planned",
      "triage",
      "open",
      "opened",
      "pendiente",
      "hacer",
      "por hacer",
      "abierto",
      "a fazer",
      "planejado",
      "aberto",
      "pendente",
    ],
    "primary",
  ],
  // Warning states
  [
    [
      "blocked",
      "on hold",
      "waiting",
      "paused",
      "pending",
      "bloqueado",
      "en espera",
      "pausado",
      "em espera",
    ],
    "warning",
  ],
  // Destructive states
  [
    [
      "urgent",
      "critical",
      "high priority",
      "escalated",
      "urgente",
      "critico",
      "alta prioridad",
      "alta prioridade",
    ],
    "destructive",
  ],
  // Neutral states
  [
    [
      "archived",
      "cancelled",
      "wontfix",
      "wont-fix",
      "duplicate",
      "archivado",
      "cancelado",
      "arquivado",
    ],
    "neutral",
  ],
  // Label-specific exact matches
  [["task", "feature"], "accent"],
  [
    [
      "enhancement",
      "design",
      "ux",
      "ui",
      "spike",
      "research",
      "investigation",
      "prototype",
      "mvp",
      "discovery",
      "audit",
    ],
    "warning",
  ],
  [["bug", "security", "hotfix"], "destructive"],
  [
    ["epic", "backend", "meeting", "database", "api", "migration", "infrastructure", "devops"],
    "secondary",
  ],
  [["frontend", "irp", "accessibility", "a11y", "i18n", "l10n", "planning", "support"], "primary"],
  [
    [
      "other",
      "docs",
      "ci",
      "cd",
      "cleanup",
      "debt",
      "maintenance",
      "monitoreo",
      "monitoring",
      "logging",
      "configuracion",
      "configuration",
    ],
    "neutral",
  ],
  [["test", "testing", "deploy", "release"], "success"],
  [["refactor", "performance", "integration"], "accent"],
]);

function normalize(value: string) {
  return value.trim().toLowerCase();
}

function hashString(value: string): number {
  let hash = 0;
  for (const ch of value) {
    hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  }
  return hash;
}

function hashTone(value: string): ToneName {
  const tones: ToneName[] = [
    "primary",
    "accent",
    "success",
    "warning",
    "secondary",
    "destructive",
    "neutral",
  ];
  return tones[hashString(value) % tones.length] ?? "primary";
}

function isSuccess(value: string): boolean {
  return /\b(done|complete|completed|resolved|finished|cerrado|finalizado|listo|terminado|concluido|resolvido|fechado|pronto)\b/.test(
    value,
  );
}

function isAccent(value: string): boolean {
  return /\b(progress|doing|review|develop|curso|progreso|desarrollo|revision|progresso|revisao|desenvolvimento)\b/.test(
    value,
  );
}

function isPrimary(value: string): boolean {
  return /\b(todo|to[\s_-]?do|backlog|ready|planned|triage|open|pendiente|hacer|abierto|fazer|planejado|aberto|pendente)\b/.test(
    value,
  );
}

function isWarning(value: string): boolean {
  return /\b(block|hold|wait|paused|pending|bloqueado|espera|pausado)\b/.test(value);
}

function isDestructive(value: string): boolean {
  return /\b(urgent|critical|high|escalated|urgente|critico|alta)\b/.test(value);
}

function isNeutral(value: string): boolean {
  return /\b(archived|cancelled|wontfix|duplicate|archivado|cancelado|arquivado)\b/.test(value);
}

function mapStatus(status: string): ToneName {
  const normalized = normalize(status);

  const exact = exactTones.get(normalized);
  if (exact) return exact;

  if (isSuccess(normalized)) return "success";
  if (isAccent(normalized)) return "accent";
  if (isPrimary(normalized)) return "primary";
  if (isWarning(normalized)) return "warning";
  if (isDestructive(normalized)) return "destructive";
  if (isNeutral(normalized)) return "neutral";

  return hashTone(normalized);
}

function mapLabel(label: string): ToneName {
  const normalized = normalize(label);

  // Prefix-based logic (GitLab scoped labels)
  if (normalized.startsWith("category::")) return "accent";
  if (normalized.startsWith("team::")) return "secondary";
  if (normalized.startsWith("priority::")) {
    const suffix = normalized.split("::")[1] ?? normalized;
    if (isDestructive(suffix)) return "destructive";
    if (isWarning(suffix)) return "warning";
    return "neutral";
  }
  if (normalized.startsWith("workflow::")) {
    const suffix = normalized.split("::")[1] ?? normalized;
    return mapStatus(suffix);
  }

  // Exact match
  const exact = exactTones.get(normalized);
  if (exact) return exact;

  // Hash fallback
  return hashTone(normalized);
}

// --- Public API ---

export function getAssignedIssueStateBadgeClassName(state: string) {
  return toneClasses[mapStatus(state)];
}

export function getAssignedIssueWorkflowBadgeClassName(value: string) {
  return toneClasses[mapStatus(value)];
}

export function getAssignedIssueLabelBadgeClassName(label: string) {
  return toneClasses[mapLabel(label)];
}
