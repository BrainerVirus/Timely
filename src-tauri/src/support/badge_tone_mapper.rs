use std::collections::HashMap;

use crate::domain::models::ToneName;

pub struct BadgeToneMapper {
    dictionaries: HashMap<String, ToneName>,
}

impl BadgeToneMapper {
    pub fn new() -> Self {
        let mut dictionaries = HashMap::new();

        // Success states
        for key in &[
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
        ] {
            dictionaries.insert(key.to_string(), ToneName::Success);
        }

        // Accent states (in progress)
        for key in &[
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
        ] {
            dictionaries.insert(key.to_string(), ToneName::Accent);
        }

        // Primary states (todo/backlog)
        for key in &[
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
        ] {
            dictionaries.insert(key.to_string(), ToneName::Primary);
        }

        // Warning states (blocked/waiting)
        for key in &[
            "blocked",
            "on hold",
            "waiting",
            "paused",
            "pending",
            "bloqueado",
            "en espera",
            "pausado",
            "em espera",
        ] {
            dictionaries.insert(key.to_string(), ToneName::Warning);
        }

        // Destructive states (urgent/critical)
        for key in &[
            "urgent",
            "critical",
            "high priority",
            "escalated",
            "urgente",
            "critico",
            "alta prioridad",
            "alta prioridade",
        ] {
            dictionaries.insert(key.to_string(), ToneName::Destructive);
        }

        // Neutral states (archived/cancelled)
        for key in &[
            "archived",
            "cancelled",
            "wontfix",
            "wont-fix",
            "duplicate",
            "archivado",
            "cancelado",
            "arquivado",
        ] {
            dictionaries.insert(key.to_string(), ToneName::Neutral);
        }

        Self { dictionaries }
    }

    pub fn map_status(&self, status: &str) -> ToneName {
        let normalized = status.trim().to_lowercase();

        // Exact dictionary match
        if let Some(tone) = self.dictionaries.get(&normalized) {
            return *tone;
        }

        // Heuristic regex matching
        if Self::is_success(&normalized) {
            return ToneName::Success;
        }
        if Self::is_accent(&normalized) {
            return ToneName::Accent;
        }
        if Self::is_primary(&normalized) {
            return ToneName::Primary;
        }
        if Self::is_warning(&normalized) {
            return ToneName::Warning;
        }
        if Self::is_destructive(&normalized) {
            return ToneName::Destructive;
        }
        if Self::is_neutral(&normalized) {
            return ToneName::Neutral;
        }

        // Hash fallback for unknowns
        self.hash_tone(&normalized)
    }

    pub fn map_label(&self, label: &str) -> ToneName {
        let normalized = label.trim().to_lowercase();

        // Prefix-based logic
        if normalized.starts_with("category::") {
            return ToneName::Accent;
        }
        if normalized.starts_with("team::") {
            return ToneName::Secondary;
        }
        if normalized.starts_with("priority::") {
            let suffix = normalized.split("::").nth(1).unwrap_or(&normalized);
            if Self::is_destructive(suffix) {
                return ToneName::Destructive;
            }
            if Self::is_warning(suffix) {
                return ToneName::Warning;
            }
            return ToneName::Neutral;
        }
        if normalized.starts_with("workflow::") {
            let suffix = normalized.split("::").nth(1).unwrap_or(&normalized);
            return self.map_status(suffix);
        }

        // Exact match for known labels
        if let Some(tone) = self.dictionaries.get(&normalized) {
            return *tone;
        }

        // Hash fallback
        self.hash_tone(&normalized)
    }

    fn is_success(value: &str) -> bool {
        value.contains("done")
            || value.contains("complete")
            || value.contains("resolved")
            || value.contains("finished")
            || value.contains("cerrado")
            || value.contains("finalizado")
            || value.contains("listo")
            || value.contains("terminado")
            || value.contains("concluido")
            || value.contains("resolvido")
            || value.contains("fechado")
            || value.contains("pronto")
    }

    fn is_accent(value: &str) -> bool {
        value.contains("progress")
            || value.contains("doing")
            || value.contains("review")
            || value.contains("develop")
            || value.contains("curso")
            || value.contains("progreso")
            || value.contains("desarrollo")
            || value.contains("revision")
            || value.contains("progresso")
            || value.contains("revisao")
            || value.contains("desenvolvimento")
    }

    fn is_primary(value: &str) -> bool {
        value.contains("todo")
            || value.contains("backlog")
            || value.contains("ready")
            || value.contains("planned")
            || value.contains("triage")
            || value.contains("open")
            || value.contains("pendiente")
            || value.contains("hacer")
            || value.contains("abierto")
            || value.contains("fazer")
            || value.contains("planejado")
            || value.contains("aberto")
            || value.contains("pendente")
    }

    fn is_warning(value: &str) -> bool {
        value.contains("block")
            || value.contains("hold")
            || value.contains("wait")
            || value.contains("paused")
            || value.contains("pending")
            || value.contains("bloqueado")
            || value.contains("espera")
            || value.contains("pausado")
    }

    fn is_destructive(value: &str) -> bool {
        value.contains("urgent")
            || value.contains("critical")
            || value.contains("high")
            || value.contains("escalated")
            || value.contains("urgente")
            || value.contains("critico")
            || value.contains("alta")
    }

    fn is_neutral(value: &str) -> bool {
        value.contains("archived")
            || value.contains("cancelled")
            || value.contains("wontfix")
            || value.contains("duplicate")
            || value.contains("archivado")
            || value.contains("cancelado")
            || value.contains("arquivado")
    }

    fn hash_tone(&self, value: &str) -> ToneName {
        let hash = Self::hash_string(value);
        let tones = [
            ToneName::Primary,
            ToneName::Accent,
            ToneName::Success,
            ToneName::Warning,
            ToneName::Secondary,
        ];
        tones[hash % tones.len()]
    }

    fn hash_string(value: &str) -> usize {
        let mut hash = 0usize;
        for ch in value.chars() {
            hash = hash.wrapping_mul(31).wrapping_add(ch as usize);
        }
        hash
    }
}

impl Default for BadgeToneMapper {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn maps_known_statuses() {
        let mapper = BadgeToneMapper::new();
        assert_eq!(mapper.map_status("Done"), ToneName::Success);
        assert_eq!(mapper.map_status("In Progress"), ToneName::Accent);
        assert_eq!(mapper.map_status("To Do"), ToneName::Primary);
        assert_eq!(mapper.map_status("Blocked"), ToneName::Warning);
        assert_eq!(mapper.map_status("Urgent"), ToneName::Destructive);
        assert_eq!(mapper.map_status("Archived"), ToneName::Neutral);
    }

    #[test]
    fn maps_spanish_statuses() {
        let mapper = BadgeToneMapper::new();
        assert_eq!(mapper.map_status("Terminado"), ToneName::Success);
        assert_eq!(mapper.map_status("En progreso"), ToneName::Accent);
        assert_eq!(mapper.map_status("Pendiente"), ToneName::Primary);
    }

    #[test]
    fn maps_labels_by_prefix() {
        let mapper = BadgeToneMapper::new();
        assert_eq!(mapper.map_label("category::product"), ToneName::Accent);
        assert_eq!(mapper.map_label("team::frontend"), ToneName::Secondary);
        assert_eq!(mapper.map_label("priority::high"), ToneName::Destructive);
        assert_eq!(mapper.map_label("priority::low"), ToneName::Neutral);
        assert_eq!(mapper.map_label("workflow::done"), ToneName::Success);
    }

    #[test]
    fn falls_back_to_hash_for_unknowns() {
        let mapper = BadgeToneMapper::new();
        let tone1 = mapper.map_status("CustomStateXYZ");
        let tone2 = mapper.map_status("CustomStateXYZ");
        assert_eq!(tone1, tone2); // Same unknown state gets same color
    }
}
