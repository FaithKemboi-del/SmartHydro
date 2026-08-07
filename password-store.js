(function () {
  const DB_NAME = "SmartHydroDB";
  const DB_VERSION = 1;
  const STORE_NAME = "users";
  const HASH_SALT = "smart-hydro-demo-salt-v1";

  function openDatabase() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = () => {
        const db = request.result;

        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: "email" });
          store.createIndex("name", "name", { unique: false });
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error("Could not open SmartHydroDB."));
    });
  }

  async function withStore(mode, handler) {
    const db = await openDatabase();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, mode);
      const store = transaction.objectStore(STORE_NAME);
      let result;

      Promise.resolve()
        .then(() => handler(store))
        .then((value) => {
          result = value;
        })
        .catch(reject);

      transaction.oncomplete = () => {
        db.close();
        resolve(result);
      };
      transaction.onerror = () => {
        db.close();
        reject(transaction.error || new Error("IndexedDB transaction failed."));
      };
    });
  }

  function requestToPromise(request) {
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error("IndexedDB request failed."));
    });
  }

  async function hashPassword(password) {
    const payload = `${HASH_SALT}:${String(password || "")}`;
    const data = new TextEncoder().encode(payload);
    const digest = await crypto.subtle.digest("SHA-256", data);
    return Array.from(new Uint8Array(digest))
      .map((byte) => byte.toString(16).padStart(2, "0"))
      .join("");
  }

  async function saveHashedUser(user) {
    const email = String(user.email || "")
      .trim()
      .toLowerCase();

    if (!email || !user.passwordHash) {
      throw new Error("email and passwordHash are required.");
    }

    const record = {
      email,
      name: user.name || email.split("@")[0] || "User",
      role: user.role || "user",
      passwordHash: user.passwordHash,
      createdAt: user.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await withStore("readwrite", (store) => requestToPromise(store.put(record)));
    return record;
  }

  async function getHashedUser(email) {
    const normalizedEmail = String(email || "")
      .trim()
      .toLowerCase();

    if (!normalizedEmail) {
      return null;
    }

    return withStore("readonly", (store) => requestToPromise(store.get(normalizedEmail)));
  }

  async function listHashedUsers() {
    return withStore("readonly", (store) => requestToPromise(store.getAll()));
  }

  async function verifyPassword(email, password) {
    const user = await getHashedUser(email);

    if (!user?.passwordHash) {
      return false;
    }

    const attemptHash = await hashPassword(password);
    return attemptHash === user.passwordHash;
  }

  async function registerHashedUser({ email, password, name, role = "user" }) {
    const passwordHash = await hashPassword(password);
    return saveHashedUser({
      email,
      name,
      role,
      passwordHash,
      createdAt: new Date().toISOString(),
    });
  }

  async function ensureDemoHashedUsers() {
    const auth = window.SmartHydroAuth;
    const defaults = [
      {
        email: auth?.ADMIN_EMAIL || "fyugalbox21@gmail.com",
        name: "Admin",
        role: "admin",
        password: auth?.ADMIN_PASSWORD || "chep2005..",
      },
      {
        email: auth?.FAITH_EMAIL || "faithkemboi21@gmail.com",
        name: "Faith",
        role: "user",
        password: auth?.USER_OVERRIDE_PASSWORD || "chep2005..",
      },
      {
        email: "paulkevinkariuki@gmail.com",
        name: "Paul",
        role: "user",
        password: "chep2005..",
      },
      {
        email: auth?.AWUOR_EMAIL || "awuor053@gmail.com",
        name: "Awuor",
        role: "user",
        password: auth?.AWUOR_PASSWORD || "lavender2026",
      },
    ];

    for (const user of defaults) {
      const existing = await getHashedUser(user.email);

      if (existing?.passwordHash) {
        continue;
      }

      await registerHashedUser(user);
    }

    return listHashedUsers();
  }

  window.SmartHydroPasswordStore = {
    DB_NAME,
    STORE_NAME,
    hashPassword,
    saveHashedUser,
    getHashedUser,
    listHashedUsers,
    verifyPassword,
    registerHashedUser,
    ensureDemoHashedUsers,
  };
})();
