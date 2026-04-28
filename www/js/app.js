/**
 * AI Ta'lim - Android App Core Logic (Robust Version)
 * ==========================================================
 */

(function() {
    'use strict';

    const SITE_URL = 'https://talim.page.gd/login.php';
    const SPLASH_MIN_DURATION = 2000;

    document.addEventListener('deviceready', onDeviceReady, false);

    function onDeviceReady() {
        console.log('[AI Ta\'lim] Device ready');
        
        if (navigator.splashscreen) {
            navigator.splashscreen.hide();
        }

        // Ruxsatlarni so'rashni boshlaymiz, lekin xato bo'lsa ham startApp-ni chaqiramiz
        try {
            requestPermissions(function() {
                startApp();
            });
        } catch (e) {
            console.error('Permission error:', e);
            startApp();
        }
    }

    function requestPermissions(callback) {
        // Agar plaginlar bo'lmasa, o'tkazib yuboramiz
        if (!window.plugins || !window.plugins.permissions) {
            callback();
            return;
        }

        var permissions = window.plugins.permissions;
        var list = [
            permissions.CAMERA,
            permissions.RECORD_AUDIO
        ];

        // Android versiyasini tekshirishda xatolik bo'lmasligi uchun try-catch
        try {
            var platform = (window.device && window.device.platform) ? window.device.platform : '';
            var version = (window.device && window.device.version) ? parseInt(window.device.version) : 0;

            if (platform === 'Android' && version >= 13) {
                list.push('android.permission.READ_MEDIA_IMAGES');
                list.push('android.permission.READ_MEDIA_VIDEO');
                list.push('android.permission.READ_MEDIA_AUDIO');
            } else {
                list.push(permissions.WRITE_EXTERNAL_STORAGE);
                list.push(permissions.READ_EXTERNAL_STORAGE);
            }
        } catch (err) {
            console.warn('Device info error:', err);
        }

        permissions.requestPermissions(list, function() {
            callback();
        }, function() {
            callback();
        });
    }

    function startApp() {
        var startTime = Date.now();

        // Internetni juda tez tekshiramiz
        checkInternet(function(hasInternet) {
            var elapsed = Date.now() - startTime;
            var remaining = Math.max(0, SPLASH_MIN_DURATION - elapsed);

            setTimeout(function() {
                // Saytga yo'naltirish
                window.location.href = SITE_URL;
            }, remaining);
        });
    }

    function checkInternet(callback) {
        if (navigator.connection && navigator.connection.type === 'none') {
            callback(false);
            return;
        }
        // Shunchaki o'tkazib yuboramiz, sayt o'zi xato beradi agar internet bo'lmasa
        callback(true);
    }

    window.retryConnection = function() {
        window.location.reload();
    };

})();
