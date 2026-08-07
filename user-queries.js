(function () {
  const form = document.querySelector("#user-query-form");
  const messageInput = document.querySelector("#query-message");
  const submitButton = document.querySelector("#query-submit");
  const statusNote = document.querySelector("#query-status-note");
  const listEl = document.querySelector("#user-query-list");

  if (!form || !window.SmartHydroQueries) {
    return;
  }

  function auth() {
    return window.SmartHydroAuth;
  }

  function currentUser() {
    return auth()?.getUserSession?.() || auth()?.getAdminSession?.() || null;
  }

  function escapeHtml(value) {
    return String(value || "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  function formatDate(value) {
    if (!value) {
      return "—";
    }
    return new Date(value).toLocaleString([], {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  }

  function setNote(text) {
    if (statusNote) {
      statusNote.textContent = text || "";
    }
  }

  function renderQueries(queries) {
    if (!listEl) {
      return;
    }

    if (!queries.length) {
      listEl.innerHTML =
        '<article class="query-card query-card-empty"><p>No queries yet. Send one above if you need help.</p></article>';
      return;
    }

    listEl.innerHTML = queries
      .map((query) => {
        const answered = query.status === "answered" && query.admin_response;
        return `
          <article class="query-card ${answered ? "query-card-answered" : "query-card-open"}">
            <div class="query-card-top">
              <span class="severity ${answered ? "low" : "medium"}">${answered ? "Answered" : "Open"}</span>
              <time datetime="${escapeHtml(query.created_at)}">${escapeHtml(formatDate(query.created_at))}</time>
            </div>
            <p>${escapeHtml(query.message)}</p>
            ${
              answered
                ? `<div class="query-response">
                    <strong>Admin reply</strong>
                    <p>${escapeHtml(query.admin_response)}</p>
                    <small>${escapeHtml(formatDate(query.responded_at))}</small>
                  </div>`
                : `<p class="query-waiting">Waiting for an admin response.</p>`
            }
          </article>
        `;
      })
      .join("");
  }

  async function refreshList() {
    const user = currentUser();
    if (!user?.email) {
      renderQueries([]);
      setNote("Sign in to submit and track queries.");
      return;
    }

    const result = await window.SmartHydroQueries.listQueries({ email: user.email });
    renderQueries(result.queries || []);
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const user = currentUser();
    if (!user?.email) {
      setNote("Please sign in before submitting a query.");
      return;
    }

    const message = String(messageInput?.value || "").trim();

    if (!message) {
      setNote("Type your question before sending.");
      return;
    }

    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = "Sending...";
    }

    try {
      const result = await window.SmartHydroQueries.submitQuery({
        email: user.email,
        name: user.name || auth()?.getUserDisplayName?.(user.email) || "",
        message,
      });

      form.reset();
      setNote(
        result.source === "supabase"
          ? "Query sent. An admin can reply from the admin panel."
          : "Query saved on this browser. An admin can reply from the admin panel.",
      );
      await refreshList();
    } catch (error) {
      setNote(`Could not send query: ${String(error?.message || error)}`);
    } finally {
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = "Send query";
      }
    }
  });

  window.addEventListener("smartHydro:queriesChanged", () => {
    refreshList().catch(() => {});
  });

  refreshList().catch(() => {
    renderQueries([]);
  });
})();
