/**
 * AI Ta'lim - Android App Core Logic (Sequential Permissions)
 * ==========================================================
 */

(function() {
    'use strict';

    const SITE_URL = 'https://talim.page.gd/login.php';
    const SPLASH_MIN_DURATION = 2500;

    document.addEventListener('deviceready', onDeviceReady, false);

    function onDeviceReady() {
        console.log('[AI Ta\'lim] Device ready');
        
        if (navigator.splashscreen) {
            navigator.splashscreen.hide();
        }

        // Ruxsatlarni ketma-ket so'raymiz
        requestAllPermissions(function() {
            startApp();
        });
    }

    function requestAllPermissions(callback) {
        if (!window.plugins || !window.plugins.permissions) {
            callback();
            return;
        }

        var permissions = window.plugins.permissions;
        
        // 1. Kamera
        permissions.requestPermission(permissions.CAMERA, function() {
            // 2. Mikrofon
            permissions.requestPermission(permissions.RECORD_AUDIO, function() {
                // 3. Fayllar (Android versiyasiga qarab)
                var filePermission = permissions.WRITE_EXTERNAL_STORAGE;
                
                try {
                    if (window.device && parseInt(window.device.version) >= 13) {
                        // Android 13+ da media ruxsatlari alohida
                        permissions.requestPermission('android.permission.READ_MEDIA_IMAGES', callback, callback);
                    } else {
                        permissions.requestPermission(filePermission, callback, callback);
                    }
                } catch(e) {
                    callback();
                }
            }, callback);
        }, callback);
    }

    function startApp() {
        var startTime = Date.now();
        
        // Internet bormi yo'qmi, baribir saytga o'tamiz
        // Chunki Redirect-dan so'ng WebView o'zi oflayn holatni boshqaradi
        setTimeout(function() {
            window.location.href = SITE_URL;
        }, SPLASH_MIN_DURATION);
    }

    window.retryConnection = function() {
        window.location.reload();
    };

})();
