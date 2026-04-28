/**
 * AI Ta'lim - Android App Core Logic (InAppBrowser Version)
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

        // Ruxsatlarni so'raymiz
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
        var list = [permissions.CAMERA, permissions.RECORD_AUDIO];

        try {
            if (window.device && parseInt(window.device.version) >= 13) {
                list.push('android.permission.READ_MEDIA_IMAGES');
                list.push('android.permission.READ_MEDIA_VIDEO');
            } else {
                list.push(permissions.WRITE_EXTERNAL_STORAGE);
                list.push(permissions.READ_EXTERNAL_STORAGE);
            }
        } catch(e) {}

        permissions.requestPermissions(list, callback, callback);
    }

    function startApp() {
        setTimeout(function() {
            openWebsite();
        }, SPLASH_MIN_DURATION);
    }

    function openWebsite() {
        // InAppBrowser sozlamalari
        // location=no (manzil satrini yashiradi)
        // pullToRefresh=yes (Android uchun native pull-to-refresh)
        // zoom=no (masshtabni o'zgartirishni cheklaydi)
        var options = "location=no,zoom=no,pullToRefresh=yes,clearcache=no,clearsessioncache=no,shouldPauseOnSuspend=yes";
        
        var browser = cordova.InAppBrowser.open(SITE_URL, '_blank', options);

        // Brauzer yopilsa, ilovani ham yopamiz
        browser.addEventListener('exit', function() {
            navigator.app.exitApp();
        });

        // Xatolik bo'lsa
        browser.addEventListener('loaderror', function() {
            console.error('Load error');
        });
    }

})();
