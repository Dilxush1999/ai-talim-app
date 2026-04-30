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
            StatusBar.overlaysWebView(true);
            StatusBar.backgroundColorByHexString('#00000000');
            StatusBar.styleLightContent();
            StatusBar.show();
        }

        if (navigator.splashscreen) {
            // Native splashscreen'ni yashiramiz
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
        if (!navigator.connection) return true; 
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
                const errorIcon = document.querySelector('.error-icon');
                if (errorIcon) {
                    errorIcon.style.animation = 'none';
                    errorIcon.offsetHeight; 
                    errorIcon.style.animation = 'wifiShake 0.5s ease-in-out';
                }
            }
        }, 1000);
    };

    window.closeExitDialog = function() {
        document.getElementById('exit-dialog').classList.remove('active');
        // Agar browserInstance null bo'lsa (exit bo'lgan), qayta ochamiz
        if (!browserInstance) {
            openWebsite();
        }
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

        var options = "location=no,zoom=no,pullToRefresh=yes,clearcache=no,clearsessioncache=no,shouldPauseOnSuspend=yes,hidenavigationbuttons=yes,hardwareback=yes,useWideViewPort=yes,loadWithOverviewMode=yes";
        
        browserInstance = cordova.InAppBrowser.open(SITE_URL, '_blank', options);

        // Sahifa yuklanib bo'lgach, Pull to Refresh skriptini yuboramiz (Premium Dizayn)
        browserInstance.addEventListener('loadstop', function() {
            browserInstance.executeScript({
                code: `
                    (function() {
                        // 1. Oldingi spinnerni tozalash (agar mavjud bo'lsa)
                        const oldPtr = document.getElementById('custom-ptr');
                        if (oldPtr) oldPtr.remove();

                        // 2. CSS Styles qo'shish
                        const style = document.createElement('style');
                        style.id = 'ptr-style';
                        style.innerHTML = \`
                            #custom-ptr {
                                position: fixed;
                                top: -70px;
                                left: 50%;
                                transform: translateX(-50%);
                                width: 50px;
                                height: 50px;
                                background: white;
                                border-radius: 50%;
                                display: flex;
                                align-items: center;
                                justify-content: center;
                                box-shadow: 0 6px 20px rgba(0,0,0,0.15);
                                z-index: 1000000;
                                transition: top 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275), opacity 0.2s ease;
                                opacity: 0;
                                pointer-events: none;
                            }
                            #custom-ptr .ptr-spinner {
                                width: 26px;
                                height: 26px;
                                border: 3px solid rgba(91, 88, 231, 0.1);
                                border-top-color: #5b58e7;
                                border-radius: 50%;
                                animation: ptr-spin 0.8s linear infinite;
                            }
                            @keyframes ptr-spin { to { transform: rotate(360deg); } }
                        \`;
                        document.head.appendChild(style);

                        // 3. Spinner Elementini yaratish
                        const ptr = document.createElement('div');
                        ptr.id = 'custom-ptr';
                        ptr.innerHTML = '<div class="ptr-spinner"></div>';
                        document.body.appendChild(ptr);

                        // 4. Mantiq
                        let startY = 0;
                        let isAtTop = false;
                        const threshold = 180;
                        
                        document.addEventListener('touchstart', function(e) {
                            startY = e.touches[0].pageY;
                            isAtTop = (window.pageYOffset || document.documentElement.scrollTop) === 0;
                        }, {passive: true});

                        document.addEventListener('touchmove', function(e) {
                            if (!isAtTop) return;
                            let moveY = e.touches[0].pageY;
                            let diff = moveY - startY;
                            
                            if (diff > 0 && diff < threshold) {
                                ptr.style.top = (diff / 2.5 - 50) + 'px';
                                ptr.style.opacity = diff / threshold;
                                ptr.style.transition = 'none'; // Tortayotganda transitionni o'chiramiz
                            }
                            
                            if (diff >= threshold) {
                                ptr.style.top = '40px';
                                ptr.style.opacity = '1';
                                ptr.style.background = '#f8fafc';
                            }
                        }, {passive: true});

                        document.addEventListener('touchend', function(e) {
                            let endY = e.changedTouches[0].pageY;
                            let diff = endY - startY;
                            
                            ptr.style.transition = 'top 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275), opacity 0.3s ease';

                            if (isAtTop && diff >= threshold) {
                                // Sahifani yangilash
                                ptr.style.top = '40px';
                                setTimeout(() => {
                                    location.reload();
                                }, 200);
                            } else {
                                // Spinnerni yashirish
                                ptr.style.top = '-70px';
                                ptr.style.opacity = '0';
                            }
                        }, {passive: true});
                    })();
                `
            });
        });

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
        // Agar InAppBrowser ochiq bo'lsa, bu listener odatda ishlamaydi (plugin o'zi boshqaradi).
        // Lekin xavfsizlik uchun tekshiramiz.
        if (browserInstance) return;

        // Agar exit dialog ochiq bo'lsa, uni yopamiz
        const exitDialog = document.getElementById('exit-dialog');
        if (exitDialog && exitDialog.classList.contains('active')) {
            window.closeExitDialog();
        } else {
            // Aks holda exit dialogni ko'rsatamiz
            openExitDialog();
        }
    }

})();
