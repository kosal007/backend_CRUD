const baseUrl = process.env.BASE_URL || "http://localhost:4000";

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function request(path, { method = "GET", token, body } = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      "content-type": "application/json",
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  let json = null;
  try {
    json = await response.json();
  } catch {
    json = null;
  }

  return {
    status: response.status,
    json,
  };
}

async function main() {
  const now = Date.now();
  const managerEmail = "manager.test.1775622641578@example.com";
  const managerPassword = "Manager123!";
  const staffEmail = `staff.attendance.${now}@example.com`;
  const staffPassword = "Staff12345!";

  const report = [];
  const pass = (step, detail) => report.push({ step, detail });

  const managerLogin = await request("/api/auth/login", {
    method: "POST",
    body: { email: managerEmail, password: managerPassword },
  });
  assert(managerLogin.status === 200, `Manager login failed: ${managerLogin.status} ${JSON.stringify(managerLogin.json)}`);
  const managerToken = managerLogin.json?.data?.token;
  assert(typeof managerToken === "string" && managerToken.length > 20, "Manager token missing");
  pass("Manager login", "OK");

  const registerStaff = await request("/api/auth/register", {
    method: "POST",
    token: managerToken,
    body: {
      name: "Attendance Staff",
      email: staffEmail,
      password: staffPassword,
      role: "ROLE_B",
    },
  });
  assert(registerStaff.status === 201, `Staff register failed: ${registerStaff.status} ${JSON.stringify(registerStaff.json)}`);
  const staffId = registerStaff.json?.data?.user?.id;
  assert(typeof staffId === "string", "Staff user id missing");
  pass("Create test staff", staffId);

  const staffLogin = await request("/api/auth/login", {
    method: "POST",
    body: { email: staffEmail, password: staffPassword },
  });
  assert(staffLogin.status === 200, `Staff login failed: ${staffLogin.status} ${JSON.stringify(staffLogin.json)}`);
  const staffToken = staffLogin.json?.data?.token;
  assert(typeof staffToken === "string" && staffToken.length > 20, "Staff token missing");
  pass("Staff login", "OK");

  const createStore = await request("/api/stores", {
    method: "POST",
    token: managerToken,
    body: {
      name: `Test Store ${now}`,
      latitude: 11.5564,
      longitude: 104.9282,
      radius: 120,
      status: "active",
    },
  });
  assert(createStore.status === 201, `Create store failed: ${createStore.status} ${JSON.stringify(createStore.json)}`);
  const store = createStore.json?.data;
  assert(store?.id, "Store id missing");
  assert(store.latitude === 11.5564 && store.longitude === 104.9282 && store.radius === 120, "Store fields mismatch on create");
  const storeId = store.id;
  pass("Create Store", storeId);

  const getStore = await request(`/api/stores/${storeId}`);
  assert(getStore.status === 200, `Get store failed: ${getStore.status} ${JSON.stringify(getStore.json)}`);
  assert(getStore.json?.data?.id === storeId, "Get store id mismatch");
  assert(getStore.json?.data?.latitude === 11.5564, "Get store latitude mismatch");
  assert(getStore.json?.data?.longitude === 104.9282, "Get store longitude mismatch");
  assert(getStore.json?.data?.radius === 120, "Get store radius mismatch");
  pass("Get Store", "Geofence correct");

  const invalidUserFormat = await request("/api/attendance/check-in", {
    method: "POST",
    token: staffToken,
    body: { userId: "not-a-uuid", storeId, latitude: 11.55, longitude: 104.92 },
  });
  assert(invalidUserFormat.status === 400, `Invalid userId format expected 400, got ${invalidUserFormat.status}`);
  pass("Invalid userId format", "Rejected 400");

  const invalidStoreFormat = await request("/api/attendance/check-in", {
    method: "POST",
    token: staffToken,
    body: { userId: staffId, storeId: "bad-store-id", latitude: 11.55, longitude: 104.92 },
  });
  assert(invalidStoreFormat.status === 400, `Invalid storeId format expected 400, got ${invalidStoreFormat.status}`);
  pass("Invalid storeId format", "Rejected 400");

  const nonExistingUser = await request("/api/attendance/check-in", {
    method: "POST",
    token: managerToken,
    body: { userId: crypto.randomUUID(), storeId, latitude: 11.55, longitude: 104.92 },
  });
  assert(nonExistingUser.status === 404, `Invalid userId expected 404, got ${nonExistingUser.status}`);
  pass("Invalid userId not found", "Rejected 404");

  const nonExistingStore = await request("/api/attendance/check-in", {
    method: "POST",
    token: staffToken,
    body: { userId: staffId, storeId: crypto.randomUUID(), latitude: 11.55, longitude: 104.92 },
  });
  assert(nonExistingStore.status === 404, `Invalid storeId expected 404, got ${nonExistingStore.status}`);
  pass("Invalid storeId not found", "Rejected 404");

  const checkoutWithoutCheckin = await request("/api/attendance/check-out", {
    method: "POST",
    token: staffToken,
    body: { userId: staffId },
  });
  assert(checkoutWithoutCheckin.status === 400, `Check-out without check-in expected 400, got ${checkoutWithoutCheckin.status}`);
  pass("Check-out without check-in", "Rejected 400");

  const checkIn = await request("/api/attendance/check-in", {
    method: "POST",
    token: staffToken,
    body: { userId: staffId, storeId, latitude: 11.5565, longitude: 104.9284 },
  });
  assert(checkIn.status === 201, `Check-in failed: ${checkIn.status} ${JSON.stringify(checkIn.json)}`);
  const activeSession = checkIn.json?.data;
  assert(activeSession?.status === "active", "check-in status not active");
  assert(activeSession?.checkInTime, "check-in time missing");
  pass("Check-in", activeSession.id);

  const duplicateCheckin = await request("/api/attendance/check-in", {
    method: "POST",
    token: staffToken,
    body: { userId: staffId, storeId },
  });
  assert(duplicateCheckin.status === 409, `Duplicate check-in expected 409, got ${duplicateCheckin.status}`);
  pass("Duplicate check-in", "Rejected 409");

  const currentActive = await request(`/api/attendance/current?userId=${staffId}`, { token: staffToken });
  assert(currentActive.status === 200, `Current active failed: ${currentActive.status}`);
  assert(currentActive.json?.data?.id === activeSession.id, "Current active mismatch");
  pass("Current session (active)", activeSession.id);

  await sleep(2200);

  const checkOut = await request("/api/attendance/check-out", {
    method: "POST",
    token: staffToken,
    body: { userId: staffId },
  });
  assert(checkOut.status === 200, `Check-out failed: ${checkOut.status} ${JSON.stringify(checkOut.json)}`);
  const completed = checkOut.json?.data;
  assert(completed?.status === "completed", "check-out status not completed");
  assert(completed?.checkOutTime, "check-out time missing");
  assert(typeof completed?.totalDuration === "number", "total duration missing");
  assert(completed.totalDuration >= 2000, `Duration too small: ${completed.totalDuration}`);
  pass("Check-out", `${completed.id}, ${completed.totalDuration}ms`);

  const currentAfter = await request(`/api/attendance/current?userId=${staffId}`, { token: staffToken });
  assert(currentAfter.status === 200, `Current after checkout failed: ${currentAfter.status}`);
  assert(currentAfter.json?.data === null, "Current session should be null after checkout");
  pass("Current session (after)", "null");

  const history = await request(`/api/attendance/history?userId=${staffId}`, { token: staffToken });
  assert(history.status === 200, `History failed: ${history.status}`);
  const rows = history.json?.data;
  assert(Array.isArray(rows), "History is not an array");
  assert(rows.length >= 1, "History expected at least 1 row");
  const found = rows.find((row) => row.id === completed.id);
  assert(found, "Completed session not found in history");
  assert(found.status === "completed", "History status mismatch");
  assert(typeof found.totalDuration === "number" && found.totalDuration >= 2000, "History duration mismatch");
  pass("History", `${rows.length} rows`);

  console.log("=== API TEST REPORT ===");
  for (const row of report) {
    console.log(`✅ ${row.step}: ${row.detail}`);
  }

  console.log("\nSUMMARY: PASS");
  console.log(JSON.stringify({
    baseUrl,
    testUserId: staffId,
    testStoreId: storeId,
    completedSessionId: completed.id,
    totalDurationMs: completed.totalDuration,
  }, null, 2));
}

main().catch((error) => {
  console.error("\n❌ SUMMARY: FAIL");
  console.error(error?.stack || error);
  process.exit(1);
});
