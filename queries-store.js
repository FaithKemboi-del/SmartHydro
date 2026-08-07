(function () {
  const QUERIES_KEY = "smartHydroUserQueries";

  function auth() {
    return window.SmartHydroAuth;
  }

  function supabase() {
    return auth()?.getSupabaseClient?.() || null;
  }

  function readLocal() {
    try {
      const raw = localStorage.getItem(QUERIES_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch (_error) {
      return [];
    }
  }

  function writeLocal(queries) {
    localStorage.setItem(QUERIES_KEY, JSON.stringify(queries.slice(0, 200)));
  }

  function makeId() {
    if (window.crypto && typeof window.crypto.randomUUID === "function") {
      return window.crypto.randomUUID();
    }
    return `query-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  }

  function normalizeQuery(entry) {
    if (!entry || typeof entry !== "object") {
      return null;
    }

    return {
      id: entry.id || makeId(),
      created_at: entry.created_at || new Date().toISOString(),
      user_email: String(entry.user_email || "").trim().toLowerCase(),
      user_name: String(entry.user_name || "").trim(),
      subject: String(entry.subject || "").trim(),
      message: String(entry.message || "").trim(),
      status: entry.status === "answered" ? "answered" : "open",
      admin_response: entry.admin_response ? String(entry.admin_response) : "",
      responded_at: entry.responded_at || null,
      responded_by: entry.responded_by ? String(entry.responded_by) : "",
    };
  }

  function sortQueries(queries) {
    return [...queries].sort((a, b) => {
      const aTime = new Date(a.created_at || 0).getTime();
      const bTime = new Date(b.created_at || 0).getTime();
      return bTime - aTime;
    });
  }

  async function listQueries({ email } = {}) {
    const client = supabase();
    const normalizedEmail = email ? String(email).trim().toLowerCase() : "";

    if (client) {
      let query = client
        .from("user_queries")
        .select(
          "id, created_at, user_email, user_name, subject, message, status, admin_response, responded_at, responded_by",
        )
        .order("created_at", { ascending: false })
        .limit(100);

      if (normalizedEmail) {
        query = query.eq("user_email", normalizedEmail);
      }

      const { data, error } = await query;

      if (!error && Array.isArray(data)) {
        const queries = sortQueries(data.map(normalizeQuery).filter(Boolean));
        if (!normalizedEmail) {
          writeLocal(queries);
        }
        return { queries, source: "supabase" };
      }
    }

    let queries = sortQueries(readLocal().map(normalizeQuery).filter(Boolean));
    if (normalizedEmail) {
      queries = queries.filter((entry) => entry.user_email === normalizedEmail);
    }
    return { queries, source: "local" };
  }

  async function submitQuery({ email, name, subject, message }) {
    const trimmedMessage = String(message || "").trim();
    const autoSubject =
      String(subject || "").trim() ||
      (trimmedMessage.length > 80 ? `${trimmedMessage.slice(0, 77)}...` : trimmedMessage) ||
      "User query";

    const entry = normalizeQuery({
      id: makeId(),
      created_at: new Date().toISOString(),
      user_email: email,
      user_name: name,
      subject: autoSubject,
      message: trimmedMessage,
      status: "open",
      admin_response: "",
      responded_at: null,
      responded_by: "",
    });

    if (!entry.user_email || !entry.message) {
      throw new Error("Email and message are required.");
    }

    const client = supabase();

    if (client) {
      const { data, error } = await client
        .from("user_queries")
        .insert({
          id: entry.id,
          created_at: entry.created_at,
          user_email: entry.user_email,
          user_name: entry.user_name,
          subject: entry.subject,
          message: entry.message,
          status: entry.status,
        })
        .select(
          "id, created_at, user_email, user_name, subject, message, status, admin_response, responded_at, responded_by",
        )
        .maybeSingle();

      if (!error) {
        const saved = normalizeQuery(data || entry);
        const local = readLocal().filter((item) => item.id !== saved.id);
        local.unshift(saved);
        writeLocal(local);
        window.dispatchEvent(new CustomEvent("smartHydro:queriesChanged"));
        return { query: saved, source: "supabase" };
      }
    }

    const local = readLocal().filter((item) => item.id !== entry.id);
    local.unshift(entry);
    writeLocal(local);
    window.dispatchEvent(new CustomEvent("smartHydro:queriesChanged"));
    return { query: entry, source: "local" };
  }

  async function respondToQuery({ id, response, adminEmail }) {
    const trimmedResponse = String(response || "").trim();
    const queryId = String(id || "").trim();
    const respondedBy = String(adminEmail || "").trim().toLowerCase();

    if (!queryId || !trimmedResponse) {
      throw new Error("Query id and response are required.");
    }

    const patch = {
      status: "answered",
      admin_response: trimmedResponse,
      responded_at: new Date().toISOString(),
      responded_by: respondedBy || "admin",
    };

    const client = supabase();

    if (client) {
      const { data, error } = await client
        .from("user_queries")
        .update(patch)
        .eq("id", queryId)
        .select(
          "id, created_at, user_email, user_name, subject, message, status, admin_response, responded_at, responded_by",
        )
        .maybeSingle();

      if (!error && data) {
        const saved = normalizeQuery(data);
        const local = readLocal().map((item) => (item.id === queryId ? saved : item));
        if (!local.some((item) => item.id === queryId)) {
          local.unshift(saved);
        }
        writeLocal(local);
        window.dispatchEvent(new CustomEvent("smartHydro:queriesChanged"));
        return { query: saved, source: "supabase" };
      }
    }

    const local = readLocal();
    const index = local.findIndex((item) => item.id === queryId);
    if (index < 0) {
      throw new Error("Query not found.");
    }

    const updated = normalizeQuery({ ...local[index], ...patch });
    local[index] = updated;
    writeLocal(local);
    window.dispatchEvent(new CustomEvent("smartHydro:queriesChanged"));
    return { query: updated, source: "local" };
  }

  window.SmartHydroQueries = {
    listQueries,
    submitQuery,
    respondToQuery,
  };
})();
