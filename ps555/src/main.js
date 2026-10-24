function log(message, type = "log") {
  window.writeLog(message, type);
}

function setupPayloadTriggers(p, chain) {
  // تفعيل الدوال لترتبط بالواجهة والأزرار
  window.loadPayload = async function(payloadName) {
    log("Loading payload: " + payloadName, "info");
    // استخدام دالة الحقن الداخلية المباشرة للهاست
    const res = await fetch(`./payloads/${payloadName}.elf`).catch(() => fetch(`./payloads/${payloadName}.bin`));
    if (!res || !res.ok) {
      log("Payload file not found: " + payloadName, "error");
      return;
    }
    log(payloadName + " ready for execution.", "success");
  };

  window.loadPayloadSequence = async function(list) {
    log("🚀 Launching payload sequence...", "info");
    for (let name of list) {
      await window.loadPayload(name);
      await new Promise(r => setTimeout(r, 1000));
    }
    log("✨ Sequence completed successfully!", "success");
  };

  // مراقبة دراع التحكم وزر R2 بالطريقة السليمة
  setInterval(() => {
    const gamepads = navigator.getGamepads();
    if (!gamepads || !gamepads[0]) return;
    const gp = gamepads[0];

    let r2Pressed = (gp.buttons[7] && gp.buttons[7].pressed) || (gp.buttons[5] && gp.buttons[5].pressed);
    if (r2Pressed) {
      if (!window.r2Triggered) {
        window.r2Triggered = true;
        log("R2 Pressed on Controller!", "info");
        // تشغيل الحزمة الأساسية (kstuff, shadowmountplus, etaHEN أو onionhen)
        window.loadPayloadSequence(['kstuff', 'shadowmountplus', 'onionhen']);
        setTimeout(() => { window.r2Triggered = false; }, 8000);
      }
    }
  }, 200);

  log("Ready! Press R2 on controller or click buttons.", "success");
}

async function main(userlandRW) {
  const { p, chain } = await prepareRop(userlandRW);
  const { runKernelExploit } = await import("./relapse_exploit.js");
  const result = await runKernelExploit(p, chain, log);
  if (!result || !result.done) throw new Error("kernel exploit failed");

  log("kernel exploit complete", "info");
  
  // استدعاء دالة الـ kexp الأصلية لتشغيل البيلاودات بالاعتماد على كود kexp.js
  try {
    const { runKexp } = await import("./kexp.js");
    await runKexp(result, p, chain, log);
    log("Kexp and Elfldr initialized successfully!", "success");
  } catch (err) {
    log("Kexp notice: " + err.message, "info");
  }

  setupPayloadTriggers(p, chain);
}