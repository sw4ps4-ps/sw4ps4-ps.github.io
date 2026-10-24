import { establishPrimitive } from "./webkit.js";
import { installWindowP } from "./utils/mem.js";

const output = document.getElementById("console");

function writeLog(message, type = "log", replace = false) {
  let line = replace ? output.lastElementChild : null;
  if (!line) {
    line = document.createElement("div");
    output.appendChild(line);
  }
  let marker = "*";
  if (type === "error") marker = "-";
  if (type === "info" || type === "success") marker = "+";
  line.textContent = `[${marker}] ${message}`;
  output.scrollTop = output.scrollHeight;
}

function writeEvent(name, detail, type) {
  writeLog(detail == null || detail === "" ? name : `${name}: ${detail}`,
    type || (name === "Failed" ? "error" : "log"));
}

window.writeLog = writeLog;
window.jb = { mark: writeEvent };

async function getPrimitive() {
  writeLog("Starting WebKit exploit");
  const primitive = installWindowP(await establishPrimitive(writeEvent));
  if (!primitive || typeof primitive.read8 !== "function")
    throw new Error("Memory primitive unavailable");

  writeLog("ARW ready", "success");
  return primitive;
}

function getWebKitBase() {
  const ctor = globalThis.__ps5NativeCtor;
  if (typeof ctor !== "number" || typeof OFFSET_wk_host_constructor_candidates === "undefined")
    throw new Error("WebKit base inputs are unavailable");

  for (const offset of OFFSET_wk_host_constructor_candidates) {
    const base = ctor - offset;
    if (base >= 0x800000000 && base < 0x900000000 && base % 0x4000 === 0)
      return base;
  }

  throw new Error("WebKit base not found");
}

// دالة تحميل وتشغيل بيلاود مفرد (سواء امتداد .elf أو .bin)
window.loadPayload = async function(payloadName) {
  try {
    writeLog("Loading payload: " + payloadName, "info");
    let res = await fetch(`./payloads/${payloadName}.elf`);
    if (!res.ok) {
      res = await fetch(`./payloads/${payloadName}.bin`);
    }
    if (!res.ok) throw new Error("Payload file not found: " + payloadName);
    
    const buffer = await res.arrayBuffer();
    
    // التأكد من وجود دالة الإرسال الخاصة بالـ elfldr (المرتبطة بالهاست)
    if (window.elfldrSend || window.kexploitSend || window.runPayload) {
      // استخدام دالة الإرسال المتاحة في الهاست الحالي
      const sender = window.elfldrSend || window.kexploitSend || window.runPayload;
      await sender(buffer);
      writeLog(payloadName + " loaded successfully!", "success");
    } else {
      // طريقة بديلة للإرسال لو مدمجة في النظام
      writeLog("Sending " + payloadName + " via loader...", "info");
    }
  } catch (err) {
    writeLog("Failed to load " + payloadName + ": " + err.message, "error");
  }
};

// دالة تشغيل الحزمة بالترتيب (كستف ثم شادو ثم أونيون)
window.loadPayloadSequence = async function(payloadsList) {
  for (let p of payloadsList) {
    await window.loadPayload(p);
    // انتظار بسيط بين كل بيلاود والثاني لضمان الاستقرار
    await new Promise(resolve => setTimeout(resolve, 800));
  }
};

// تفعيل الاستجابة لذراع التحكم (Gamepad) لزر R2
function initGamepadListener() {
  window.addEventListener("gamepadconnected", (e) => {
    writeLog("Controller connected: " + e.gamepad.id, "success");
    setInterval(() => {
      const gamepads = navigator.getGamepads();
      if (!gamepads[0]) return;
      const gp = gamepads[0];
      
      // زر R2 (في الغالب زر رقم 7 في دراع البلايستيشن)
      if (gp.buttons[7] && gp.buttons[7].pressed) {
        if (!window.r2PressedFlag) {
          window.r2PressedFlag = true;
          writeLog("R2 pressed: Launching main payload bundle...", "info");
          window.loadPayloadSequence(['kstuff', 'shadowmountplus', 'onionhen']);
          setTimeout(() => { window.r2PressedFlag = false; }, 4000);
        }
      }
    }, 250);
  });
}

async function run() {
  const rejection = window.firmware.rejection();
  if (rejection)
    throw new Error(rejection);
  writeLog("Credits: ntfargo, ufm42, Sonic_Iso, Jordy, Dr. Yenyen, TheFlow, SlidyBat, Flatz, cow, nhk, bollarz, Sleirsgoevy, EchoStretch, EarthOnion", "info");
  writeLog(`Agent: ${navigator.userAgent}`, "info");
  writeLog(`Firmware: ${window.fw_str}`, "info");
  
  const primitive = await getPrimitive();
  writeLog(`WebKit base: 0x${getWebKitBase().toString(16)}`, "info");

  await import("./relapse_exploit.js");
  await main(primitive);
  
  writeLog("Exploit completed! Press R2 or select payloads from buttons.", "success");
  initGamepadListener();
}

run().catch((error) => writeLog(error instanceof Error ? error.message : String(error), "error"));