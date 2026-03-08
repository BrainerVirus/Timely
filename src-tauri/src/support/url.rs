pub fn normalize_host(host: &str) -> String {
    let trimmed = host.trim().trim_end_matches('/');
    let without_scheme = trimmed
        .strip_prefix("https://")
        .or_else(|| trimmed.strip_prefix("http://"))
        .unwrap_or(trimmed);

    without_scheme.to_string()
}
