const STORAGE_KEY = "przypomnij.reminders.v1";
const notifiedIds = new Set(JSON.parse(localStorage.getItem("przypomnij.notified.v1") || "[]"));

const form = document.querySelector("#reminderForm");
const titleInput = document.querySelector("#titleInput");
const noteInput = document.querySelector("#noteInput");
const dateInput = document.querySelector("#dateInput");
const timeInput = document.querySelector("#timeInput");
const list = document.querySelector("#reminderList");
const emptyState = document.querySelector("#emptyState");
const template = document.querySelector("#reminderTemplate");
const installDialog = document.querySelector("#installDialog");
const notificationDot = document.querySelector("#notificationDot");
const notificationStatus = document.querySelector("#notificationStatus");
const enableNotificationsButton = document.querySelector("#enableNotificationsButton");

let reminders = loadReminders();
let activeFilter = "active";

initializeDefaults();
render();
refreshNotificationStatus();
scheduleVisibleReminders();

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("./sw.js").catch(() => {});
}

form.addEventListener("submit", (event) => {
  event.preventDefault();

  const title = titleInput.value.trim();
  const note = noteInput.value.trim();
  const dueAt = new Date(`${dateInput.value}T${timeInput.value}`);

  if (!title || Number.isNaN(dueAt.getTime())) {
    return;
  }

  reminders.push({
    id: crypto.randomUUID(),
    title,
    note,
    dueAt: dueAt.toISOString(),
    done: false,
    createdAt: new Date().toISOString()
  });

  saveReminders();
  form.reset();
  initializeDefaults();
  render();
  scheduleVisibleReminders();
});

document.querySelectorAll(".segment").forEach((button) => {
  button.addEventListener("click", () => {
    activeFilter = button.dataset.filter;
    document.querySelectorAll(".segment").forEach((item) => item.classList.toggle("active", item === button));
    render();
  });
});

document.querySelector("#installHelpButton").addEventListener("click", () => {
  installDialog.showModal();
});

enableNotificationsButton.addEventListener("click", async () => {
  await requestNotifications();
  refreshNotificationStatus();
  scheduleVisibleReminders();
});

function initializeDefaults() {
  const now = new Date();
  const next = new Date(now.getTime() + 15 * 60 * 1000);
  dateInput.value = formatDateInput(next);
  timeInput.value = formatTimeInput(next);
}

function loadReminders() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
}

function saveReminders() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(reminders));
}

function render() {
  list.textContent = "";
  const visible = getVisibleReminders();

  emptyState.classList.toggle("visible", visible.length === 0);

  visible.forEach((reminder) => {
    const item = template.content.firstElementChild.cloneNode(true);
    const dueDate = new Date(reminder.dueAt);
    const isOverdue = dueDate < new Date() && !reminder.done;

    item.classList.toggle("done", reminder.done);
    item.querySelector("h2").textContent = reminder.title;
    item.querySelector(".note").textContent = reminder.note;
    item.querySelector(".note").hidden = !reminder.note;
    item.querySelector(".date-line").textContent = formatFriendlyDate(dueDate, isOverdue);
    item.querySelector(".date-line").classList.toggle("overdue", isOverdue);

    item.querySelector(".check-button").addEventListener("click", () => {
      reminder.done = !reminder.done;
      saveReminders();
      render();
    });

    item.querySelector(".calendar-button").addEventListener("click", () => {
      downloadCalendarFile(reminder);
    });

    item.querySelector(".delete-button").addEventListener("click", () => {
      reminders = reminders.filter((candidate) => candidate.id !== reminder.id);
      notifiedIds.delete(reminder.id);
      persistNotifiedIds();
      saveReminders();
      render();
    });

    list.append(item);
  });
}

function getVisibleReminders() {
  return reminders
    .filter((reminder) => {
      if (activeFilter === "active") return !reminder.done;
      if (activeFilter === "done") return reminder.done;
      return true;
    })
    .sort((a, b) => new Date(a.dueAt) - new Date(b.dueAt));
}

async function requestNotifications() {
  if (!("Notification" in window)) {
    return;
  }

  if (Notification.permission === "default") {
    await Notification.requestPermission();
  }
}

function refreshNotificationStatus() {
  if (!("Notification" in window)) {
    notificationStatus.textContent = "Ta przeglądarka nie obsługuje powiadomień.";
    enableNotificationsButton.disabled = true;
    return;
  }

  const permission = Notification.permission;
  notificationDot.classList.toggle("ready", permission === "granted");
  enableNotificationsButton.hidden = permission === "granted";

  if (permission === "granted") {
    notificationStatus.textContent = "Powiadomienia są włączone, gdy aplikacja działa.";
  } else if (permission === "denied") {
    notificationStatus.textContent = "Powiadomienia są zablokowane w ustawieniach Safari.";
  } else {
    notificationStatus.textContent = "Włącz powiadomienia po dodaniu aplikacji do ekranu głównego.";
  }
}

function scheduleVisibleReminders() {
  reminders.forEach((reminder) => {
    if (reminder.done || notifiedIds.has(reminder.id)) return;

    const delay = new Date(reminder.dueAt).getTime() - Date.now();
    if (delay <= 0) {
      notify(reminder);
      return;
    }

    if (delay < 24 * 60 * 60 * 1000) {
      window.setTimeout(() => notify(reminder), delay);
    }
  });
}

function notify(reminder) {
  if (reminder.done || notifiedIds.has(reminder.id)) return;

  notifiedIds.add(reminder.id);
  persistNotifiedIds();

  if ("Notification" in window && Notification.permission === "granted") {
    new Notification(reminder.title, {
      body: reminder.note || "Masz zaplanowane przypomnienie.",
      icon: "./icon.svg"
    });
  }

  render();
}

function persistNotifiedIds() {
  localStorage.setItem("przypomnij.notified.v1", JSON.stringify([...notifiedIds]));
}

function downloadCalendarFile(reminder) {
  const start = new Date(reminder.dueAt);
  const end = new Date(start.getTime() + 15 * 60 * 1000);
  const title = escapeCalendarText(reminder.title);
  const description = escapeCalendarText(reminder.note || "Przypomnienie z aplikacji Przypomnij");

  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Przypomnij//PWA//PL",
    "BEGIN:VEVENT",
    `UID:${reminder.id}@przypomnij-pwa`,
    `DTSTAMP:${toCalendarDate(new Date())}`,
    `DTSTART:${toCalendarDate(start)}`,
    `DTEND:${toCalendarDate(end)}`,
    `SUMMARY:${title}`,
    `DESCRIPTION:${description}`,
    "BEGIN:VALARM",
    "TRIGGER:-PT0M",
    "ACTION:DISPLAY",
    `DESCRIPTION:${title}`,
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR"
  ].join("\r\n");

  const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${slugify(reminder.title)}.ics`;
  link.click();
  URL.revokeObjectURL(url);
}

function formatDateInput(date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0")
  ].join("-");
}

function formatTimeInput(date) {
  return [
    String(date.getHours()).padStart(2, "0"),
    String(date.getMinutes()).padStart(2, "0")
  ].join(":");
}

function formatFriendlyDate(date, overdue) {
  const formatted = new Intl.DateTimeFormat("pl-PL", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(date);

  return overdue ? `Po terminie: ${formatted}` : formatted;
}

function toCalendarDate(date) {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

function escapeCalendarText(value) {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

function slugify(value) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40) || "przypomnienie";
}
