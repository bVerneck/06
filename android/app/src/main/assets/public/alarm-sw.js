// Alarm scheduling logic injected into the generated Workbox Service Worker
// via workbox.importScripts. Runs in the SW global scope and uses IndexedDB
// (localStorage is not available inside a Service Worker).
//
// Primary mechanism: the Scheduled Notification API (showTrigger +
// TimestampTrigger), which the browser fires on its own even when the screen
// is locked or the app is closed. Fallback: a setInterval inside the Worker
// that polls due tasks for browsers without showTrigger support.

var DB_NAME = "taskflow-sw";
var STORE = "alarms";
var FIRED_STORE = "fired";
var VIBRATE = [500, 250, 500];

function supportsTrigger() {
  return typeof TimestampTrigger !== "undefined";
}

function dbOpen() {
  return new Promise(function (resolve, reject) {
    var req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = function () {
      var db = req.result;
      if (!db.objectStoreNames.contains(STORE))
        db.createObjectStore(STORE, { keyPath: "id" });
      if (!db.objectStoreNames.contains(FIRED_STORE))
        db.createObjectStore(FIRED_STORE, { keyPath: "key" });
    };
    req.onsuccess = function () {
      resolve(req.result);
    };
    req.onerror = function () {
      reject(req.error);
    };
  });
}

function dbPut(store, value) {
  return dbOpen().then(function (db) {
    return new Promise(function (resolve, reject) {
      var tx = db.transaction(store, "readwrite");
      tx.objectStore(store).put(value);
      tx.oncomplete = function () {
        resolve();
      };
      tx.onerror = function () {
        reject(tx.error);
      };
    });
  });
}

function dbGetAll(store) {
  return dbOpen().then(function (db) {
    return new Promise(function (resolve, reject) {
      var tx = db.transaction(store, "readonly");
      var req = tx.objectStore(store).getAll();
      req.onsuccess = function () {
        resolve(req.result || []);
      };
      req.onerror = function () {
        reject(req.error);
      };
    });
  });
}

function dbClear(store) {
  return dbOpen().then(function (db) {
    return new Promise(function (resolve, reject) {
      var tx = db.transaction(store, "readwrite");
      tx.objectStore(store).clear();
      tx.oncomplete = function () {
        resolve();
      };
      tx.onerror = function () {
        reject(tx.error);
      };
    });
  });
}

function notifOpts(task) {
  return {
    body: task.notes || task.listName || "",
    tag: "alarm-" + task.id,
    vibrate: VIBRATE,
    requireInteraction: true,
    renotify: true,
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-192.png",
  };
}

// Schedule a notification at the exact due time using the browser-managed
// TimestampTrigger. These persist across SW restarts and fire with the screen
// locked / app closed. We mark the task so the interval fallback skips it
// (avoids double-firing).
function scheduleTask(task) {
  if (!task.dueDate || task.completed) return Promise.resolve();
  var due = new Date(task.dueDate).getTime();
  if (Number.isNaN(due) || due <= Date.now()) return Promise.resolve();

  if (!supportsTrigger()) return Promise.resolve();

  return self.registration
    .showNotification(task.title, Object.assign({}, notifOpts(task), {
      showTrigger: new TimestampTrigger(due),
    }))
    .then(function () {
      task.trigger = true;
      return dbPut(STORE, task);
    })
    .catch(function () {
      /* ignore scheduling failures */
    });
}

var intervalId = null;

function checkDue() {
  if (Notification.permission !== "granted") return Promise.resolve();
  return Promise.all([dbGetAll(STORE), dbGetAll(FIRED_STORE)]).then(function (
    results,
  ) {
    var tasks = results[0];
    var fired = results[1];
    var firedSet = {};
    fired.forEach(function (f) {
      firedSet[f.key] = true;
    });
    var now = Date.now();
    var pending = [];
    tasks.forEach(function (t) {
      if (!t.dueDate || t.completed) return;
      // Tasks scheduled via showTrigger fire on their own; skip them here.
      if (t.trigger) return;
      var due = new Date(t.dueDate).getTime();
      var key = t.id + ":" + t.dueDate;
      if (due <= now && now - due < 5 * 60 * 1000 && !firedSet[key]) {
        firedSet[key] = true;
        pending.push(dbPut(FIRED_STORE, { key: key }));
        pending.push(
          self.registration.showNotification(t.title, notifOpts(t)).catch(
            function () {},
          ),
        );
      }
    });
    return Promise.all(pending);
  });
}

function startInterval() {
  if (intervalId !== null) return;
  intervalId = setInterval(checkDue, 30000);
}

self.addEventListener("message", function (event) {
  var data = event.data;
  if (!data) return;
  if (data.type === "SCHEDULE_ALARMS") {
    dbClear(STORE).then(function () {
      var tasks = data.tasks || [];
      var chain = Promise.resolve();
      tasks.forEach(function (t) {
        chain = chain.then(function () {
          return dbPut(STORE, t).then(function () {
            return scheduleTask(t);
          });
        });
      });
      return chain;
    }).then(function () {
      startInterval();
      return checkDue();
    });
  } else if (data.type === "CHECK_NOW") {
    startInterval();
    checkDue();
  }
});

self.addEventListener("notificationclick", function (event) {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(
      function (cls) {
        for (var i = 0; i < cls.length; i++) {
          if ("focus" in cls[i]) return cls[i].focus();
        }
        if (self.clients.openWindow) return self.clients.openWindow("/");
      },
    ),
  );
});

startInterval();
