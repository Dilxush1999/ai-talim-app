/**
 * AI Ta'lim - Android App Core Logic (InAppBrowser Version)
 * ==========================================================
 */

(function() {
    'use strict';

    const SITE_URL = 'https://talim.page.gd/login.php';
    const SPLASH_MIN_DURATION = 2000;
    let browserInstance = null;

    document.addEventListener('deviceready', onDeviceReady, false);

    function onDeviceReady() {
        console.log('[AI Ta\'lim] Device ready');
        
        // Status bar sozlamalari
        if (window.StatusBar) {
            StatusBar.backgroundColorByHexString('#5b58e7');
            StatusBar.styleLightContent();
        }

        if (navigator.splashscreen) {
            // Native splashscreen'ni yashiramiz, bizda o'zimizniki bor index.html'da
            navigator.splashscreen.hide();
        }

        // Internetni tekshiramiz
        if (!checkConnection()) {
            showErrorScreen();
            return;
        }

        // Ruxsatlarni so'raymiz
        requestAllPermissions(function() {
            setTimeout(startApp, SPLASH_MIN_DURATION);
        });

        // "Orqaga" tugmasini boshqarish
        document.addEventListener("backbutton", onBackKeyDown, false);
    }

    function checkConnection() {
        if (!navigator.connection) return true; // Plugin yo'q bo'lsa true qaytaramiz
        var networkState = navigator.connection.type;
        return networkState !== Connection.NONE;
    }

    function showErrorScreen() {
        document.getElementById('splash-screen').classList.remove('active');
        document.getElementById('no-internet-screen').classList.add('active');
    }

    function hideErrorScreen() {
        document.getElementById('no-internet-screen').classList.remove('active');
        document.getElementById('splash-screen').classList.add('active');
    }

    // Global funksiya qilib e'lon qilamiz (index.html dan chaqirilishi uchun)
    window.retryConnection = function() {
        const btn = document.getElementById('retry-btn');
        if (btn) btn.classList.add('btn-loading');

        setTimeout(function() {
            if (checkConnection()) {
                hideErrorScreen();
                requestAllPermissions(function() {
                    startApp();
                });
            } else {
                if (btn) btn.classList.remove('btn-loading');
                // Animatsiya effekti uchun
                const errorIcon = document.querySelector('.error-icon');
                if (errorIcon) {
                    errorIcon.style.animation = 'none';
                    errorIcon.offsetHeight; // trigger reflow
                    errorIcon.style.animation = 'wifiShake 0.5s ease-in-out';
                }
            }
        }, 1000);
    };

    window.closeExitDialog = function() {
        document.getElementById('exit-dialog').classList.remove('active');
    };

    function openExitDialog() {
        document.getElementById('exit-dialog').classList.add('active');
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
                list.push('android.permission.READ_MEDIA_AUDIO');
            } else {
                list.push(permissions.WRITE_EXTERNAL_STORAGE);
                list.push(permissions.READ_EXTERNAL_STORAGE);
            }
        } catch(e) {}

        permissions.requestPermissions(list, callback, callback);
    }

    function startApp() {
        const btn = document.getElementById('retry-btn');
        if (btn) btn.classList.remove('btn-loading');
        openWebsite();
    }

    function openWebsite() {
        if (!checkConnection()) {
            showErrorScreen();
            return;
        }

        var options = "location=no,zoom=no,pullToRefresh=yes,clearcache=no,clearsessioncache=no,shouldPauseOnSuspend=yes,hidenavigationbuttons=yes,hardwareback=yes";
        
        browserInstance = cordova.InAppBrowser.open(SITE_URL, '_blank', options);

        // Brauzer yopilsa
        browserInstance.addEventListener('exit', function() {
            browserInstance = null;
            openExitDialog();
        });

        // Yuklashda xatolik bo'lsa
        browserInstance.addEventListener('loaderror', function() {
            browserInstance.close();
            browserInstance = null;
            showErrorScreen();
        });
    }

    function onBackKeyDown(e) {
        if (browserInstance) {
            // Agar InAppBrowser ochiq bo'lsa, undan orqaga qaytishga harakat qilamiz
            browserInstance.executeScript({ code: "window.history.back()" });
        } else {
            // Agar exit dialog ochiq bo'lsa, uni yopamiz
            const exitDialog = document.getElementById('exit-dialog');
            if (exitDialog && exitDialog.classList.contains('active')) {
                window.closeExitDialog();
            } else {
                // Aks holda exit dialogni ko'rsatamiz
                openExitDialog();
            }
        }
    }

})();
