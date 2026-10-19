// Bluetooth Intelligence: explicit user-initiated Web Bluetooth only. Never scans silently.
const $ = s => document.querySelector(s);
const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
let dev = null, info = {};
const supported = () => !!(navigator.bluetooth && navigator.bluetooth.requestDevice);
function render(state, note) {
  const sup = supported(), conn = dev && dev.gatt && dev.gatt.connected;
  const rows = [["Browser support", sup ? "Web Bluetooth available" : "Unsupported: this browser does not expose Web Bluetooth (try Chrome on Android or desktop over HTTPS)"],
    ["Connection", conn ? "Connected" : dev ? "Disconnected" : "No device selected"],
    ["Device name", dev ? dev.name || "Not reported" : "—"],
    ["Browser device ID", dev ? dev.id + " (browser-generated, not a MAC address)" : "—"],
    ["MAC address", "MAC address not exposed by this browser."],
    ["Battery level", info.battery ?? (dev ? "Not read yet" : "—")],
    ["Accessible services", info.services ?? "—"],
    ["Device information", info.devinfo ?? "—"],
    ["Codec", "Bluetooth codec information is not exposed by this browser."]];
  $("#btBody").innerHTML = `<div class="btstate ${state || ""}" role="status">${esc(note || (sup ? "Ready. Choose a device to inspect it." : "Bluetooth unavailable here."))}</div>` + rows.map(([k, v]) => `<div class="row"><span>${k}</span><b>${esc(v)}</b></div>`).join("");
  $("#btConnect").disabled = !sup; $("#btDisconnect").disabled = !conn;
}
async function connect() {
  const b = $("#btConnect"); b.classList.add("busy"); b.disabled = true; info = {}; render("busy", "Waiting for device chooser…");
  try {
    dev = await navigator.bluetooth.requestDevice({ acceptAllDevices: true, optionalServices: ["battery_service", "device_information"] });
    dev.addEventListener("gattserverdisconnected", () => render("", "Device disconnected."));
    render("busy", "Connecting…"); const srv = await dev.gatt.connect();
    try { const c = await (await srv.getPrimaryService("battery_service")).getCharacteristic("battery_level"); info.battery = (await c.readValue()).getUint8(0) + " %"; } catch { info.battery = "Not exposed by this device"; }
    try {
      const s = await srv.getPrimaryService("device_information"), td = new TextDecoder(), f = [];
      for (const [n, k] of [["manufacturer_name_string", "Manufacturer"], ["model_number_string", "Model"], ["firmware_revision_string", "Firmware"]]) { try { f.push(k + ": " + td.decode(await (await s.getCharacteristic(n)).readValue())); } catch {} }
      info.devinfo = f.join(" · ") || "Service present, no readable fields";
    } catch { info.devinfo = "Not exposed by this device"; }
    try { const sv = await srv.getPrimaryServices(); info.services = sv.length ? sv.map(x => x.uuid.slice(0, 8)).join(", ") + " (only services declared in the request are visible)" : "None accessible"; } catch { info.services = "Not accessible"; }
    render("ok", "Connected."); window.dispatchEvent(new CustomEvent("aq:toast", { detail: "Bluetooth device connected" }));
  } catch (e) {
    const m = e.name === "NotFoundError" ? "No device selected." : e.name === "SecurityError" || e.name === "NotAllowedError" ? "Permission denied or blocked by browser policy." : "Connection failed: " + (e.message || e.name);
    render("bad", m); window.dispatchEvent(new CustomEvent("aq:toast", { detail: m, bad: true }));
  } finally { b.classList.remove("busy"); if (supported()) b.disabled = false; }
}
function disconnect() { try { dev && dev.gatt.connected && dev.gatt.disconnect(); } catch {} render("", "Disconnected."); window.dispatchEvent(new CustomEvent("aq:toast", { detail: "Bluetooth disconnected" })); }
$("#btCheck").onclick = () => { render(supported() ? "ok" : "bad", supported() ? "Web Bluetooth is available. Pairing still requires your approval." : "Web Bluetooth is not supported in this browser."); window.dispatchEvent(new CustomEvent("aq:toast", { detail: supported() ? "Bluetooth supported" : "Bluetooth unsupported", bad: !supported() })); };
$("#btConnect").onclick = connect; $("#btDisconnect").onclick = disconnect; render();
