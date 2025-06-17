// public/mockServiceWorker.js
"use strict";
var e, t = /* @__PURE__ */ new Map;

function n(e, t, n) {
    let o = t.length;
    for (; o--;)
        if (Object.is(e[o], t[o])) return !1;
    return !0
}
var o = class {
    constructor(e = 10) {
        this.events = new Map, this.maxListeners = e, this.hasWarnedAboutPotentialMemoryLeak = !1
    }
    on(e, t, {
        once: n = !1
    } = {}) {
        const o = this.events.get(e) || [];
        return o.push({
            listener: t,
            once: n
        }), this.events.set(e, o), o.length > this.maxListeners && !this.hasWarnedAboutPotentialMemoryLeak && (console.warn(`Possible EventEmitter memory leak detected. ${o.length} "${String(e)}" listeners added. Use emitter.setMaxListeners() to increase limit.`), this.hasWarnedAboutPotentialMemoryLeak = !0), () => this.removeListener(e, t)
    }
    once(e, t) {
        return this.on(e, t, {
            once: !0
        })
    }
    removeListener(e, t) {
        const n = this.events.get(e);
        if (!n) return;
        const o = n.findIndex((e => e.listener === t)); - 1 !== o && n.splice(o, 1)
    }
    removeAllListeners(e) {
        this.events.delete(e)
    }
    emit(e, ...t) {
        const o = this.events.get(e);
        if (!o) return !1;
        for (const s of [...o]) {
            s.once && this.removeListener(e, s.listener);
            try {
                s.listener.apply(this, t)
            } catch (r) {
                console.error(`Error in "${String(e)}" event listener:`, r)
            }
        }
        return !0
    }
    setMaxListeners(e) {
        this.maxListeners = e
    }
};
var s = "[MSW] Mocking enabled.",
    r = ((e = r || {})[e.ERROR = 0] = "ERROR", e[e.WARNING = 1] = "WARNING", e),
    i = {
        color: "#ff4e4e"
    },
    a = {
        color: "#ffc107"
    },
    c = {
        color: "silver"
    },
    l = {
        color: "#4ade80",
        fontWeight: "bold"
    },
    u = {
        color: "#38bdf8",
        fontWeight: "bold"
    },
    f = {
        "quiet": () => {},
        "bypass": () => `Error: given request is not handled by any request handler.

  If you intended to bypass this request, use "req.passthrough()" command.
  If you wish to mock this request, please ensure there's a handler for it.
  Find more anout request handlers here: https://mswjs.io/docs/basics/request-handler`,
        "warn": () => `Warning: given request is not handled by any request handler.

  If you intended to bypass this request, use "req.passthrough()" command.
  If you wish to mock this request, please ensure there's a handler for it.
  Find more anout request handlers here: https://mswjs.io/docs/basics/request-handler`
    };
var p = e => " betekent dat de mock-service-worker met succes is geregistreerd. Je kunt nu verzoeken onderscheppen.";
var d = e => " means the mock service worker is successfully registered. You can now intercept requests.";
var h = e => " signifas ke la imitation-servlaboristo estas sukcese registrita. Vi nun povas kapti petojn.";
var g = e => " bedeutet, dass der Mock-Service-Worker erfolgreich registriert wurde. Du kannst jetzt Anfragen abfangen.";
var m = e => " tarkoittaa, että valepalvelutyöntekijä on rekisteröity onnistuneesti. Voit nyt siepata pyyntöjä.";
var b = e => " signifie que le service worker simulé est correctement enregistré. Vous pouvez désormais intercepter les requêtes.";
var w = e => " merkir at spottþjónuststarfsmaðurin er skrásettur. Tú kanst nú avhoyra fyrispurningar.";
var v = e => " jelenti, hogy a modellező szolgáltatásfeldolgozó sikeresen regisztrálva lett. Most már elfoghatsz kéréseket.";
var y = e => " berarti pekerja layanan tiruan berhasil didaftarkan. Anda sekarang dapat mencegat permintaan.";
var S = e => " significa che il mock service worker è stato registrato con successo. Ora puoi intercettare le richieste.";
var k = e => " はモックサービスワーカーが正常に登録されたことを意味します。リクエストをインターセプトできるようになりました。";
var R = e => " tähendab, et mock-teenusetöötaja on edukalt registreeritud. Nüüd saate taotlusi kinni pidada.";
var O = e => " oznacza, że pozorny pracownik usługi został pomyślnie zarejestrowany. Możesz teraz przechwytywać żądania.";
var E = e => " significa que o mock service worker foi registrado com sucesso. Agora você pode interceptar requisições.";
var _ = e => " вказує, що імітаційний сервіс-працівник успішно зареєстрований. Тепер ви можете перехоплювати запити.";
var P = e => " betyder, att mock-servicearbetaren har registrerats framgångsrikt. Du kan nu fånga upp förfrågningar.";
var I = e => " значит, что мок-сервис-воркер успешно зарегистрирован. Теперь вы можете перехватывать запросы.";
var T = e => " znamená, že pracovník simulovanej služby je úspešne zaregistrovaný. Teraz môžete zachytávať požiadavky.";
var x = e => " pomeni, da je lažni storitveni delavec uspešno registriran. Zdaj lahko prestrežete zahteve.";
var M = e => " significa que el trabajador de servicio simulado se ha registrado correctamente. Ahora puede interceptar solicitudes.";
var D = e => " ina maana kwamba mfanyakazi wa huduma ya kubeza amesajiliwa kwa mafanikio. Sasa unaweza kukatiza maombi.";
var C = e => " znamená, že pracovník mock služby je úspěšně zaregistrován. Nyní můžete zachycovat požadavky.";
var A = {
    "msw-activated": (e, t) => {
        const n = {
            "ar-SA": () => "تعني أن عامل الخدمة الوهمي قد تم تسجيله بنجاح. يمكنك الآن اعتراض الطلبات.",
            "cs-CZ": C,
            "da-DK": () => " betyder, at mock service-medarbejderen er registreret korrekt. Du kan nu opsnappe anmodninger.",
            "de-DE": g,
            "en-US": d,
            "es-ES": M,
            "et-EE": R,
            "fi-FI": m,
            "fo-FO": w,
            "fr-FR": b,
            "he-IL": () => "משמעותו שעובד השירות המדומה נרשם בהצלחה. כעת באפשרותך ליירט בקשות.",
            "hu-HU": v,
            "id-ID": y,
            "it-IT": S,
            "ja-JP": k,
            "ko-KR": () => "는 모의 서비스 워커가 성공적으로 등록되었음을 의미합니다. 이제 요청을 가로챌 수 있습니다.",
            "nl-NL": p,
            "no-NO": () => "betyr at mock-tjenestearbeideren er vellykket registrert. Du kan nå avskjære forespørsler.",
            "pl-PL": O,
            "pt-BR": E,
            "pt-PT": () => "significa que o mock service worker foi registado com sucesso. Agora pode intercetar pedidos.",
            "ro-RO": () => "înseamnă că lucrătorul de serviciu simulat este înregistrat cu succes. Acum puteți intercepta cererile.",
            "ru-RU": I,
            "sk-SK": T,
            "sl-SI": x,
            "sv-SE": P,
            "sw-TZ": D,
            "tr-TR": () => "sahte hizmet çalışanının başarıyla kaydedildiği anlamına gelir. Artık istekleri kesebilirsiniz.",
            "uk-UA": _,
            "vi-VN": () => "có nghĩa là nhân viên dịch vụ giả lập đã được đăng ký thành công. Bây giờ bạn có thể chặn các yêu cầu.",
            "zh-CN": () => "表示模拟服务工作线程已成功注册。您现在可以拦截请求。",
            "zh-TW": () => "表示模擬服務工作執行緒已成功註冊。您現在可以攔截請求。"
        } [t] || d;
        return [`%c${e.label}%c ${n(t)}`, "color:gold;font-weight:bold;", "color:silver;font-weight:normal;"]
    }
};
var L = Object.freeze({
    __proto__: null,
    MOCK_ACTIVATE: "MOCK_ACTIVATE",
    MOCK_SUCCESS: s,
    MOCK_NOT_FOUND_WARNING: `\nWarning: captured a request without a matching request handler:

  • %s %s

If you intended to intercept this request, perhaps you forgot to add a handler?
If you want to skip this request, compile this handler with "{ once: true }".
If you want to passthrough this request, use "req.passthrough()".
`,
    SERVICE_WORKER_ACTIVATION_FAILURE: `[MSW] Failed to activate the Service Worker: %s

This is commonly caused by an attempt to mock resources served by a different origin (refer to the "Origin" header of this request). To fix this, amend your Service Worker registration to include that origin:

https://mswjs.io/docs/recipes/mock-different-origin`,
    UNHANDLED_EXCEPTION: `[MSW] Unhandled exception in the request handler for "%s %s":

%s

This is a handler error, not an unhandled network error.
Make sure you always return a response from your request marshaler (see https://mswjs.io/docs/basics/request-handler).`,
    states: A
});
async function j() {
    return self.clients.claim()
}
self.addEventListener("install", (() => self.skipWaiting())), self.addEventListener("activate", (e => e.waitUntil(j()))), self.addEventListener("message", (async e => {
    "MOCK_ACTIVATE" === e.data && j()
})), self.addEventListener("fetch", (e => {
    const {
        request: n
    } = e, {
        msw: o
    } = self;
    if (!o) return;
    const {
        worker: s,
        REGISTRATION_CHECKSUM: r
    } = o;
    if (!s) return;
    const i = new URL(n.url);
    if (!["http:", "https:"].includes(i.protocol)) return;
    const a = i.host === self.location.host && i.pathname === self.location.pathname && r && i.searchParams.get("checksum") !== r;
    if (a) return;
    const c = "bypass" === n.headers.get("x-msw-intention");
    if (c) {
        const o = new Headers(n.headers);
        return o.delete("x-msw-intention"), void e.respondWith(fetch(new Request(n.url, { ...n,
            headers: o
        })))
    }
    e.respondWith(s.handleRequest(n, e.clientId))
}));
