/**
 * AI Ta'lim - Android App Core Logic
 * ===================================
 * Splash, Internet check, WebView, Navigation, Permissions
 */

(function() {
    'use strict';

    // ==================== CONSTANTS ====================
    const SITE_URL = 'https://talim.page.gd';
    const LOGIN_URL = SITE_URL + '/login.php';
    const ROOT_PAGES = [
        '/teacher/dashboard.php',
        '/student/dashboard.php',
        '/admin/dashboard.php'
    ];
    const LOGIN_PAGE = '/login.php';
    const SPLASH_MIN_DURATION = 2000;
    const INTERNET_CHECK_TIMEOUT = 8000;
    const URL_POLL_INTERVAL = 500;

    // ==================== STATE ====================
    let currentScreen = 'splash';
    let navigationStack = [];
    let urlPollTimer = null;
    let lastKnownUrl = '';
    let isRefreshing = false;
    let touchStartY = 0;
    let touchStartTime = 0;
    let pullIndicatorEl = null;
    let iframeEl = null;

    // ==================== INIT ====================
    
    // Wait for deviceready OR fallback for browser testing
    if (window.cordova) {
        document.addEventListener('deviceready', onDeviceReady, false);
    } else {
        document.addEventListener('DOMContentLoaded', onDeviceReady);
    }

    function onDeviceReady() {
        console.log('[AI Ta\'lim] Device ready');
        
        iframeEl = document.getElementById('webframe');
        pullIndicatorEl = document.getElementById('pull-indicator');

        // Setup event listeners
        setupBackButton();
        setupOnlineOffline();
        setupPullToRefresh();
        setupIframeListeners();

        // Request permissions first, then check internet
        requestPermissions(function() {
            startApp();
        });
    }

    // ==================== PERMISSIONS ====================
    
    function requestPermissions(callback) {
        if (!window.cordova || !cordova.plugins || !cordova.plugins.permissions) {
            console.log('[Permissions] No cordova permissions plugin, skipping');
            if (callback) callback();
            return;
        }

        var permissions = cordova.plugins.permissions;
        var permList = [
            permissions.CAMERA,
            permissions.RECORD_AUDIO
        ];

        // Android 13+ uses granular media permissions
        if (device && device.platform === 'Android') {
            var sdkVersion = parseInt(device.version) || 0;
            if (sdkVersion >= 13) {
                permList.push(permissions.READ_MEDIA_IMAGES);
                permList.push(permissions.READ_MEDIA_VIDEO);
                permList.push(permissions.READ_MEDIA_AUDIO);
            } else {
                permList.push(permissions.READ_EXTERNAL_STORAGE);
                permList.push(permissions.WRITE_EXTERNAL_STORAGE);
            }
        }

        permissions.requestPermissions(
            permList,
            function(status) {
                console.log('[Permissions] Granted:', JSON.stringify(status));
                if (callback) callback();
            },
            function(err) {
                console.warn('[Permissions] Error:', err);
                if (callback) callback();
            }
        );
    }

    // ==================== APP START ====================
    
    function startApp() {
        showScreen('splash');
        var startTime = Date.now();

        checkInternet(function(hasInternet) {
            var elapsed = Date.now() - startTime;
            var remaining = Math.max(0, SPLASH_MIN_DURATION - elapsed);

            setTimeout(function() {
                if (hasInternet) {
                    loadWebsite();
                } else {
                    showScreen('no-internet');
                }
            }, remaining);
        });
    }

    // ==================== INTERNET CHECK ====================
    
    function checkInternet(callback) {
        // First check: navigator.onLine
        if (!navigator.onLine) {
            console.log('[Internet] navigator.onLine = false');
            callback(false);
            return;
        }

        // Second check: try to reach the site
        var controller = new AbortController();
        var timeoutId = setTimeout(function() {
            controller.abort();
        }, INTERNET_CHECK_TIMEOUT);

        fetch(SITE_URL + '/favicon.ico?_=' + Date.now(), {
            method: 'HEAD',
            mode: 'no-cors',
            cache: 'no-cache',
            signal: controller.signal
        })
        .then(function() {
            clearTimeout(timeoutId);
            console.log('[Internet] Fetch success');
            callback(true);
        })
        .catch(function(err) {
            clearTimeout(timeoutId);
            console.warn('[Internet] Fetch failed:', err.message);
            // Even if fetch fails, navigator.onLine might be right
            // Try one more method
            var img = new Image();
            var imgTimeout = setTimeout(function() {
                img.src = '';
                callback(false);
            }, 5000);
            img.onload = function() {
                clearTimeout(imgTimeout);
                callback(true);
            };
            img.onerror = function() {
                clearTimeout(imgTimeout);
                callback(false);
            };
            img.src = SITE_URL + '/favicon.ico?_=' + Date.now();
        });
    }

    // ==================== WEBSITE LOADING ====================
    
    function loadWebsite() {
        if (!iframeEl) return;

        // Determine which URL to load
        var targetUrl = SITE_URL + '/';
        
        iframeEl.src = targetUrl;
        showScreen('webview');
        startUrlPolling();
    }

    // ==================== IFRAME LISTENERS ====================
    
    function setupIframeListeners() {
        if (!iframeEl) return;

        iframeEl.addEventListener('load', function() {
            console.log('[Iframe] Loaded');
            isRefreshing = false;
            hidePullIndicator();
            
            // Track navigation
            trackCurrentUrl();
            
            // Check if the loaded page is an error
            checkIframeError();
        });

        iframeEl.addEventListener('error', function(e) {
            console.error('[Iframe] Error:', e);
            showScreen('connection-lost');
            stopUrlPolling();
        });
    }

    function checkIframeError() {
        try {
            var iframeDoc = iframeEl.contentDocument || iframeEl.contentWindow.document;
            var title = iframeDoc.title || '';
            var body = iframeDoc.body ? iframeDoc.body.innerHTML : '';
            
            // Check for common error indicators
            if (title.match(/404|not found/i) || body.match(/404|page not found|sahifa topilmadi/i)) {
                if (body.length < 2000) { // Small page = likely error page
                    showScreen('not-found');
                    return;
                }
            }
        } catch(e) {
            // Cross-origin - can't check content, that's OK
            console.log('[Iframe] Cross-origin, cannot check content');
        }
    }

    // ==================== URL TRACKING & NAVIGATION ====================
    
    function startUrlPolling() {
        stopUrlPolling();
        urlPollTimer = setInterval(trackCurrentUrl, URL_POLL_INTERVAL);
    }

    function stopUrlPolling() {
        if (urlPollTimer) {
            clearInterval(urlPollTimer);
            urlPollTimer = null;
        }
    }

    function trackCurrentUrl() {
        var url = getCurrentIframeUrl();
        if (!url || url === lastKnownUrl) return;
        
        lastKnownUrl = url;
        console.log('[Nav] URL changed:', url);

        try {
            var path = new URL(url).pathname;

            // If we reached a dashboard, clear history (don't go back to login)
            if (isRootPage(path)) {
                navigationStack = [url];
                console.log('[Nav] Root page reached, stack reset');
                return;
            }

            // If it's login page and stack is empty, set as first
            if (path.endsWith(LOGIN_PAGE) && navigationStack.length === 0) {
                navigationStack = [url];
                return;
            }

            // Don't add duplicates
            if (navigationStack.length > 0 && navigationStack[navigationStack.length - 1] === url) {
                return;
            }

            navigationStack.push(url);
            console.log('[Nav] Stack size:', navigationStack.length);
        } catch(e) {
            // Can't parse URL
            if (navigationStack.indexOf(url) === -1) {
                navigationStack.push(url);
            }
        }
    }

    function getCurrentIframeUrl() {
        try {
            return iframeEl.contentWindow.location.href;
        } catch(e) {
            return null;
        }
    }

    function isRootPage(path) {
        for (var i = 0; i < ROOT_PAGES.length; i++) {
            if (path.indexOf(ROOT_PAGES[i]) !== -1) return true;
        }
        return false;
    }

    // ==================== BACK BUTTON ====================
    
    function setupBackButton() {
        document.addEventListener('backbutton', onBackButton, false);
    }

    function onBackButton(e) {
        if (e) e.preventDefault();

        // If dialog is open, close it
        if (isDialogOpen()) {
            hideExitDialog();
            return;
        }

        // If on error screen, exit app
        if (currentScreen !== 'webview') {
            exitApp();
            return;
        }

        // Get current path
        var currentUrl = getCurrentIframeUrl();
        var currentPath = '';
        try {
            currentPath = new URL(currentUrl).pathname;
        } catch(e) {}

        // If on root page (dashboard), show exit dialog
        if (isRootPage(currentPath) || navigationStack.length <= 1) {
            showExitDialog();
            return;
        }

        // Go back one page
        navigationStack.pop();
        
        if (navigationStack.length > 0) {
            var prevUrl = navigationStack[navigationStack.length - 1];
            console.log('[Nav] Going back to:', prevUrl);
            // Reload the previous page (yangilangan holda)
            iframeEl.src = prevUrl;
        } else {
            showExitDialog();
        }
    }

    // ==================== EXIT DIALOG ====================
    
    function showExitDialog() {
        var dialog = document.getElementById('exit-dialog');
        if (dialog) {
            dialog.classList.add('active');
        }
    }

    function hideExitDialog() {
        var dialog = document.getElementById('exit-dialog');
        if (dialog) {
            dialog.classList.remove('active');
        }
    }

    function isDialogOpen() {
        var dialog = document.getElementById('exit-dialog');
        return dialog && dialog.classList.contains('active');
    }

    function exitApp() {
        if (navigator.app && navigator.app.exitApp) {
            navigator.app.exitApp();
        } else if (navigator.device && navigator.device.exitApp) {
            navigator.device.exitApp();
        } else {
            window.close();
        }
    }

    // Make these globally accessible for HTML onclick handlers
    window.hideExitDialog = hideExitDialog;
    window.exitApp = exitApp;

    // ==================== ONLINE / OFFLINE ====================
    
    function setupOnlineOffline() {
        document.addEventListener('offline', function() {
            console.log('[Network] Went offline');
            if (currentScreen === 'webview') {
                showScreen('connection-lost');
                stopUrlPolling();
            }
        }, false);

        document.addEventListener('online', function() {
            console.log('[Network] Back online');
            // Don't auto-reload, let user press retry
        }, false);
    }

    // ==================== PULL TO REFRESH ====================
    
    function setupPullToRefresh() {
        var webviewScreen = document.getElementById('webview-screen');
        if (!webviewScreen) return;

        // We'll use a touch overlay approach
        // The pull zone is a thin area at the top
        var pullZone = document.getElementById('pull-zone');
        if (!pullZone) return;

        pullZone.addEventListener('touchstart', function(e) {
            if (currentScreen !== 'webview' || isRefreshing) return;
            touchStartY = e.touches[0].clientY;
            touchStartTime = Date.now();
        }, { passive: true });

        pullZone.addEventListener('touchmove', function(e) {
            if (currentScreen !== 'webview' || isRefreshing) return;
            
            var diff = e.touches[0].clientY - touchStartY;
            if (diff > 30) {
                showPullIndicator();
            }
            if (diff > 100) {
                triggerRefresh();
            }
        }, { passive: true });

        pullZone.addEventListener('touchend', function() {
            if (!isRefreshing) {
                hidePullIndicator();
            }
        }, { passive: true });
    }

    function showPullIndicator() {
        if (pullIndicatorEl) {
            pullIndicatorEl.classList.add('active');
        }
    }

    function hidePullIndicator() {
        if (pullIndicatorEl) {
            pullIndicatorEl.classList.remove('active');
        }
    }

    function triggerRefresh() {
        if (isRefreshing) return;
        isRefreshing = true;
        console.log('[Refresh] Triggered');
        
        showPullIndicator();

        // Check internet first
        checkInternet(function(hasInternet) {
            if (hasInternet) {
                try {
                    iframeEl.contentWindow.location.reload();
                } catch(e) {
                    iframeEl.src = iframeEl.src;
                }
            } else {
                showScreen('connection-lost');
                stopUrlPolling();
            }
        });
    }

    // ==================== SCREEN MANAGEMENT ====================
    
    function showScreen(screenName) {
        console.log('[Screen] Switching to:', screenName);
        
        var screens = document.querySelectorAll('.screen');
        for (var i = 0; i < screens.length; i++) {
            screens[i].classList.remove('active');
        }

        var target = document.getElementById(screenName + '-screen');
        if (target) {
            target.classList.add('active');
        }

        currentScreen = screenName;
    }

    // ==================== RETRY HANDLERS (global) ====================
    
    window.retryConnection = function() {
        var btn = event.currentTarget;
        btn.classList.add('btn-loading');

        checkInternet(function(hasInternet) {
            btn.classList.remove('btn-loading');
            if (hasInternet) {
                loadWebsite();
            } else {
                // Shake the button to indicate failure
                btn.style.animation = 'none';
                btn.offsetHeight; // trigger reflow
                btn.style.animation = 'wifiShake 0.5s ease';
            }
        });
    };

    window.goBackFromError = function() {
        if (navigationStack.length > 1) {
            navigationStack.pop();
            var prevUrl = navigationStack[navigationStack.length - 1];
            iframeEl.src = prevUrl;
            showScreen('webview');
            startUrlPolling();
        } else {
            // No history, go to main page
            loadWebsite();
        }
    };

    window.retryFromConnectionLost = function() {
        var btn = event.currentTarget;
        btn.classList.add('btn-loading');

        checkInternet(function(hasInternet) {
            btn.classList.remove('btn-loading');
            if (hasInternet) {
                // Reload the last known URL or main site
                if (lastKnownUrl) {
                    iframeEl.src = lastKnownUrl;
                } else {
                    iframeEl.src = SITE_URL + '/';
                }
                showScreen('webview');
                startUrlPolling();
            } else {
                btn.style.animation = 'none';
                btn.offsetHeight;
                btn.style.animation = 'wifiShake 0.5s ease';
            }
        });
    };

})();
