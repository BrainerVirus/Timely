#[derive(Clone)]
pub struct GitLabCapabilities {
    pub supports_oauth_pkce: bool,
    pub supports_pat: bool,
    pub preferred_scope: &'static str,
}

#[allow(dead_code)]
pub fn capabilities() -> GitLabCapabilities {
    GitLabCapabilities {
        supports_oauth_pkce: true,
        supports_pat: true,
        preferred_scope: "read_api",
    }
}
