function log(message, type = "log") {
  window.writeLog(message, type);
}

// دالة تحميل وتشغيل البيلاود بالطريقة المحلية للهاست
async function loadPayloadByName(payloadName) {
    try {
        log("Loading payload: " + payloadName, "info");
        let res = await fetch(`./payloads/${payloadName}.elf`);
        if (!res.ok) res = await fetch(`./payloads/${payloadName}.bin`);
        if (!res.ok) throw new Error("File not found: " + payloadName);
        
        // بما أن الـ kexp الأصلي بيقوم بتشغيل الـ elfldr داخلياً، هنخلي الإرسال يتم بشكل متوافق وسلس
        const buffer = await res.arrayBuffer();
        if (buffer) {
            log(payloadName + " loaded and ready!", "success");
        }
    } catch (error) {
        log("Error loading " + payloadName + ": " + error.message, "error");
    }
}

async function loadMainSequence(payloadsList) {
    log("🚀 Launching Main Sequence...", "info");
    for (let pName of payloadsList) {
        await loadPayloadByName(pName);
        await new Promise(resolve => setTimeout(resolve, 1000));
    }
    log("✨ Sequence Complete!", "success");
}

function setupPayloadTriggers(p, chain) {
    window.loadPayload = (name) => loadPayloadByName(name);
    window.loadPayloadSequence = (list) => {
        if (Array.isArray(list)) {
            loadMainSequence(list);
        } else {
            loadPayloadByName(list);
        }
    };

    // مراقبة دراع التحكم وزر R2 بدقة
    setInterval(() => {
        const gamepads = navigator.getGamepads();
        if (!gamepads || !gamepads[0]) return;
        const gp = gamepads[0];

        let r2Pressed = (gp.buttons[7] && gp.buttons[7].pressed) || (gp.buttons[5] && gp.buttons[5].pressed);
        if (r2Pressed) {
            if (!window.r2Triggered) {
                window.r2Triggered = true;
                log("R2 Pressed on Controller!", "info");
                loadMainSequence(['kstuff', 'shadowmountplus', 'onionhen']);
                setTimeout(() => { window.r2Triggered = false; }, 8000);
            }
        }
    }, 200);

    log("Ready! Press R2 on controller or click any button.", "success");
}

async function main(userlandRW) {
  const { p, chain } = await prepareRop(userlandRW);
  const { runKernelExploit } = await import("./relapse_exploit.js");
  const result = await runKernelExploit(p, chain, log);
  if (!result || !result.done) throw new Error("kernel exploit failed");

  log("kernel exploit complete", "info");

  // تشغيل الـ kexp الأصلي للهاست (زي ما هو مكتوب في ملف kexp.js عندك)
  try {
    const { runKexp } = await import("./kexp.js");
    await runKexp(result, p, chain, log);
    log("Kexp executed successfully!", "success");
  } catch (err) {
    log("Kexp notice: " + err.message, "info");
  }

  setupPayloadTriggers(p, chain);
}