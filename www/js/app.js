/**
 * AI Ta'lim - Android App Core Logic (Direct Redirect Version)
 * ==========================================================
 */

(function() {
    'use strict';

    const SITE_URL = 'https://talim.page.gd/login.php';
    const SPLASH_MIN_DURATION = 3000;

    if (window.cordova) {
        document.addEventListener('deviceready', onDeviceReady, false);
    } else {
        document.addEventListener('DOMContentLoaded', onDeviceReady);
    }

    function onDeviceReady() {
        console.log('[AI Ta\'lim] Device ready');
        
        // Android 12+ Splashni yashirish
        if (navigator.splashscreen) {
            navigator.splashscreen.hide();
        }

        startApp();
    }

    function startApp() {
        var startTime = Date.now();

        checkInternet(function(hasInternet) {
            var elapsed = Date.now() - startTime;
            var remaining = Math.max(0, SPLASH_MIN_DURATION - elapsed);

            setTimeout(function() {
                if (hasInternet) {
                    window.location.href = SITE_URL;
                } else {
                    document.getElementById('splash-screen').classList.remove('active');
                    document.getElementById('no-internet-screen').classList.add('active');
                }
            }, remaining);
        });
    }

    function checkInternet(callback) {
        if (navigator.connection && navigator.connection.type === 'none') {
            callback(false);
            return;
        }

        var img = new Image();
        var timer = setTimeout(function() {
            callback(true); 
        }, 5000);

        img.onload = function() { clearTimeout(timer); callback(true); };
        img.onerror = function() { clearTimeout(timer); callback(true); };
        img.src = 'https://talim.page.gd/favicon.ico?_=' + Date.now();
    }

    window.retryConnection = function() {
        window.location.reload();
    };

})();
