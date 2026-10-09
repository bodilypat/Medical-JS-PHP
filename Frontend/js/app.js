/**
 * Frontend/js/app.js
 * Medical Management System
 *
 * Global frontend application controller.
 *
 * Responsibilities:
 * - Application initialization
 * - Authentication/session protection
 * - Navigation and active menu handling
 * - Mobile sidebar/navigation
 * - User/session display
 * - Logout handling
 * - Global notifications
 * - Modal handling
 * - Dropdown handling
 * - Theme handling
 * - Page/module initialization
 * - Global error handling
 *
 * Expected dependencies:
 * - api.js
 * - auth.js
 * - Page-specific modules
 *
 * Recommended script order:
 *   api.js
 *   auth.js
 *   app.js
 *   page-specific-module.js
 */

(function () {
    'use strict';

    const App = {
        initialized: false,

        config: {
            appName: 'Medical Management System',

            loginPage: 'login.html',
            dashboardPage: 'dashboard.html',

            tokenKey: 'medical_auth_token',
            userKey: 'medical_auth_user',

            themeKey: 'medical_theme',

            navigationSelector: '[data-nav-link]',
            modalSelector: '[data-modal]',
            dropdownSelector: '[data-dropdown]'
        },

        state: {
            user: null,
            currentPage: '',
            theme: 'light',
            sidebarOpen: false,
            notifications: [],
            initializedModules: {}
        }
    };

    /* =========================================================
     * Utility functions
     * ======================================================= */

    function getElement(selector) {
        return document.querySelector(selector);
    }

    function getElements(selector) {
        return Array.from(
            document.querySelectorAll(selector)
        );
    }

    function escapeHtml(value) {
        if (value === null || value === undefined) {
            return '';
        }

        return String(value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    function getCurrentPage() {
        const path = window.location.pathname;

        const filename =
            path.split('/').pop() || 'index.html';

        return filename.toLowerCase();
    }

    function isLoginPage() {
        const page = getCurrentPage();

        return (
            page === 'login.html' ||
            page === 'login' ||
            page === ''
        );
    }

    function isPublicPage() {
        const page = getCurrentPage();

        return [
            'login.html',
            'login',
            'forgot-password.html',
            'forgot-password.php',
            'register.html',
            'register.php',
            'index.html',
            'index.php'
        ].includes(page);
    }

    function getStoredUser() {
        try {
            const raw =
                localStorage.getItem(
                    App.config.userKey
                ) ||
                sessionStorage.getItem(
                    App.config.userKey
                );

            if (!raw) {
                return null;
            }

            return JSON.parse(raw);
        } catch (error) {
            console.error(
                'Unable to read stored user:',
                error
            );

            return null;
        }
    }

    function getStoredToken() {
        return (
            localStorage.getItem(
                App.config.tokenKey
            ) ||
            sessionStorage.getItem(
                App.config.tokenKey
            ) ||
            ''
        );
    }

    function getUserDisplayName(user) {
        if (!user) {
            return 'User';
        }

        if (user.name) {
            return user.name;
        }

        if (user.full_name) {
            return user.full_name;
        }

        const fullName = [
            user.first_name,
            user.last_name
        ]
            .filter(Boolean)
            .join(' ');

        if (fullName) {
            return fullName;
        }

        if (user.username) {
            return user.username;
        }

        if (user.email) {
            return user.email;
        }

        return 'User';
    }

    function getUserInitials(user) {
        const name =
            getUserDisplayName(user);

        const parts = name
            .trim()
            .split(/\s+/)
            .filter(Boolean);

        if (parts.length === 0) {
            return 'U';
        }

        if (parts.length === 1) {
            return parts[0]
                .substring(0, 2)
                .toUpperCase();
        }

        return (
            parts[0][0] +
            parts[parts.length - 1][0]
        ).toUpperCase();
    }

    function capitalize(value) {
        if (!value) {
            return '';
        }

        return String(value)
            .replace(/[_-]+/g, ' ')
            .replace(/\s+/g, ' ')
            .replace(/\b\w/g, char =>
                char.toUpperCase()
            );
    }

    function debounce(
        callback,
        delay = 300
    ) {
        let timer = null;

        return function (...args) {
            clearTimeout(timer);

            timer = setTimeout(
                () => {
                    callback.apply(
                        this,
                        args
                    );
                },
                delay
            );
        };
    }

    /* =========================================================
     * Authentication
     * ======================================================= */

    function isAuthenticated() {
        if (
            window.Auth &&
            typeof window.Auth.isAuthenticated ===
                'function'
        ) {
            return window.Auth.isAuthenticated();
        }

        return Boolean(
            getStoredToken()
        );
    }

    async function getCurrentUser() {
        if (
            window.Auth &&
            typeof window.Auth.me ===
                'function'
        ) {
            try {
                const user =
                    await window.Auth.me();

                if (user) {
                    App.state.user =
                        user;
                }

                return user;
            } catch (error) {
                console.warn(
                    'Unable to refresh current user:',
                    error
                );
            }
        }

        App.state.user =
            getStoredUser();

        return App.state.user;
    }

    async function requireAuthentication() {
        if (isPublicPage()) {
            return true;
        }

        if (!isAuthenticated()) {
            redirectToLogin();
            return false;
        }

        App.state.user =
            getStoredUser();

        return true;
    }

    function redirectToLogin() {
        const currentUrl =
            window.location.href;

        const loginUrl =
            `${App.config.loginPage}?redirect=${encodeURIComponent(
                currentUrl
            )}`;

        window.location.href =
            loginUrl;
    }

    function redirectToDashboard() {
        window.location.href =
            App.config.dashboardPage;
    }

    async function logout() {
        try {
            if (
                window.Auth &&
                typeof window.Auth.logout ===
                    'function'
            ) {
                await window.Auth.logout();
            } else {
                localStorage.removeItem(
                    App.config.tokenKey
                );

                localStorage.removeItem(
                    App.config.userKey
                );

                sessionStorage.removeItem(
                    App.config.tokenKey
                );

                sessionStorage.removeItem(
                    App.config.userKey
                );
            }
        } catch (error) {
            console.error(
                'Logout error:',
                error
            );

            /*
             * Even when the server-side logout request
             * fails, clear the local authentication state.
             */
            localStorage.removeItem(
                App.config.tokenKey
            );

            localStorage.removeItem(
                App.config.userKey
            );

            sessionStorage.removeItem(
                App.config.tokenKey
            );

            sessionStorage.removeItem(
                App.config.userKey
            );
        }

        App.state.user = null;

        window.location.href =
            App.config.loginPage;
    }

    /* =========================================================
     * User interface
     * ======================================================= */

    function updateUserInterface() {
        const user =
            App.state.user ||
            getStoredUser();

        if (!user) {
            return;
        }

        const displayName =
            getUserDisplayName(user);

        const initials =
            getUserInitials(user);

        const role =
            user.role ||
            user.user_role ||
            '';

        getElements(
            '[data-user-name]'
        ).forEach(element => {
            element.textContent =
                displayName;
        });

        getElements(
            '[data-user-email]'
        ).forEach(element => {
            element.textContent =
                user.email || '';
        });

        getElements(
            '[data-user-role]'
        ).forEach(element => {
            element.textContent =
                capitalize(role);
        });

        getElements(
            '[data-user-initials]'
        ).forEach(element => {
            element.textContent =
                initials;
        });

        getElements(
            '[data-user-id]'
        ).forEach(element => {
            element.textContent =
                user.id ||
                user.user_id ||
                '';
        });

        getElements(
            '[data-user-avatar]'
        ).forEach(element => {
            if (user.avatar) {
                element.src =
                    user.avatar;
                element.alt =
                    displayName;
            } else {
                element.textContent =
                    initials;
            }
        });

        document.body.dataset.userRole =
            role;
    }

    /* =========================================================
     * Navigation
     * ======================================================= */

    function initializeNavigation() {
        const currentPage =
            getCurrentPage();

        App.state.currentPage =
            currentPage;

        getElements(
            App.config.navigationSelector
        ).forEach(link => {
            const href =
                link.getAttribute('href');

            if (!href) {
                return;
            }

            const target =
                href
                    .split('/')
                    .pop()
                    .split('?')[0]
                    .split('#')[0]
                    .toLowerCase();

            const isActive =
                target === currentPage;

            link.classList.toggle(
                'active',
                isActive
            );

            if (isActive) {
                link.setAttribute(
                    'aria-current',
                    'page'
                );
            } else {
                link.removeAttribute(
                    'aria-current'
                );
            }
        });

        getElements(
            '[data-page-title]'
        ).forEach(element => {
            const title =
                document.title;

            if (title) {
                element.textContent =
                    title.replace(
                        /\s*[-|]\s*Medical Management System/i,
                        ''
                    );
            }
        });
    }

    function navigate(url) {
        if (!url) {
            return;
        }

        window.location.href = url;
    }

    function initializeNavigationEvents() {
        getElements(
            App.config.navigationSelector
        ).forEach(link => {
            link.addEventListener(
                'click',
                event => {
                    const href =
                        link.getAttribute(
                            'href'
                        );

                    if (!href) {
                        return;
                    }

                    if (
                        href.startsWith(
                            '#'
                        )
                    ) {
                        return;
                    }

                    closeMobileSidebar();
                }
            );
        });
    }

    /* =========================================================
     * Sidebar / mobile navigation
     * ======================================================= */

    function openMobileSidebar() {
        const sidebar =
            getElement(
                '#sidebar'
            ) ||
            getElement(
                '.sidebar'
            );

        if (!sidebar) {
            return;
        }

        sidebar.classList.add(
            'open'
        );

        document.body.classList.add(
            'sidebar-open'
        );

        App.state.sidebarOpen =
            true;

        const toggle =
            getElement(
                '#sidebarToggle'
            );

        if (toggle) {
            toggle.setAttribute(
                'aria-expanded',
                'true'
            );
        }
    }

    function closeMobileSidebar() {
        const sidebar =
            getElement(
                '#sidebar'
            ) ||
            getElement(
                '.sidebar'
            );

        if (!sidebar) {
            return;
        }

        sidebar.classList.remove(
            'open'
        );

        document.body.classList.remove(
            'sidebar-open'
        );

        App.state.sidebarOpen =
            false;

        const toggle =
            getElement(
                '#sidebarToggle'
            );

        if (toggle) {
            toggle.setAttribute(
                'aria-expanded',
                'false'
            );
        }
    }

    function toggleSidebar() {
        if (
            App.state.sidebarOpen
        ) {
            closeMobileSidebar();
        } else {
            openMobileSidebar();
        }
    }

    function initializeSidebar() {
        const toggle =
            getElement(
                '#sidebarToggle'
            ) ||
            getElement(
                '[data-sidebar-toggle]'
            );

        if (toggle) {
            toggle.addEventListener(
                'click',
                event => {
                    event.preventDefault();
                    toggleSidebar();
                }
            );
        }

        const overlay =
            getElement(
                '#sidebarOverlay'
            ) ||
            getElement(
                '[data-sidebar-overlay]'
            );

        if (overlay) {
            overlay.addEventListener(
                'click',
                closeMobileSidebar
            );
        }

        document.addEventListener(
            'keydown',
            event => {
                if (
                    event.key ===
                    'Escape' &&
                    App.state.sidebarOpen
                ) {
                    closeMobileSidebar();
                }
            }
        );

        window.addEventListener(
            'resize',
            debounce(() => {
                if (
                    window.innerWidth >
                    991
                ) {
                    closeMobileSidebar();
                }
            }, 150)
        );
    }

    /* =========================================================
     * Dropdowns
     * ======================================================= */

    function closeAllDropdowns(
        except = null
    ) {
        getElements(
            '[data-dropdown-menu]'
        ).forEach(menu => {
            if (
                except &&
                menu === except
            ) {
                return;
            }

            menu.classList.remove(
                'open'
            );
        });

        getElements(
            '[data-dropdown-toggle]'
        ).forEach(button => {
            const target =
                button.getAttribute(
                    'aria-controls'
                );

            if (
                !target ||
                !except ||
                target !==
                    except.id
            ) {
                button.setAttribute(
                    'aria-expanded',
                    'false'
                );
            }
        });
    }

    function toggleDropdown(
        toggle
    ) {
        const targetId =
            toggle.getAttribute(
                'aria-controls'
            );

        let menu = null;

        if (targetId) {
            menu =
                document.getElementById(
                    targetId
                );
        }

        if (!menu) {
            menu =
                toggle
                    .closest(
                        '[data-dropdown]'
                    )
                    ?.querySelector(
                        '[data-dropdown-menu]'
                    );
        }

        if (!menu) {
            return;
        }

        const isOpen =
            menu.classList.contains(
                'open'
            );

        closeAllDropdowns(
            isOpen
                ? null
                : menu
        );

        menu.classList.toggle(
            'open',
            !isOpen
        );

        toggle.setAttribute(
            'aria-expanded',
            String(!isOpen)
        );
    }

    function initializeDropdowns() {
        getElements(
            '[data-dropdown-toggle]'
        ).forEach(toggle => {
            toggle.addEventListener(
                'click',
                event => {
                    event.preventDefault();
                    event.stopPropagation();

                    toggleDropdown(
                        toggle
                    );
                }
            );
        });

        document.addEventListener(
            'click',
            event => {
                if (
                    !event.target.closest(
                        '[data-dropdown]'
                    )
                ) {
                    closeAllDropdowns();
                }
            }
        );
    }

    /* =========================================================
     * Modals
     * ======================================================= */

    function openModal(
        modalOrId
    ) {
        let modal =
            typeof modalOrId ===
            'string'
                ? getElement(
                    modalOrId.startsWith(
                        '#'
                    )
                        ? modalOrId
                        : `#${modalOrId}`
                )
                : modalOrId;

        if (!modal) {
            return;
        }

        modal.hidden = false;

        modal.classList.add(
            'open'
        );

        document.body.classList.add(
            'modal-open'
        );

        modal.setAttribute(
            'aria-hidden',
            'false'
        );

        const focusable =
            modal.querySelector(
                'input, select, textarea, button, [tabindex]:not([tabindex="-1"])'
            );

        if (focusable) {
            setTimeout(
                () => focusable.focus(),
                0
            );
        }
    }

    function closeModal(
        modalOrId
    ) {
        let modal =
            typeof modalOrId ===
            'string'
                ? getElement(
                    modalOrId.startsWith(
                        '#'
                    )
                        ? modalOrId
                        : `#${modalOrId}`
                )
                : modalOrId;

        if (!modal) {
            return;
        }

        modal.classList.remove(
            'open'
        );

        modal.hidden = true;

        modal.setAttribute(
            'aria-hidden',
            'true'
        );

        if (
            !document.querySelector(
                '[data-modal].open'
            )
        ) {
            document.body.classList.remove(
                'modal-open'
            );
        }
    }

    function initializeModals() {
        getElements(
            '[data-modal-close]'
        ).forEach(button => {
            button.addEventListener(
                'click',
                event => {
                    event.preventDefault();

                    const modal =
                        button.closest(
                            '[data-modal]'
                        );

                    closeModal(
                        modal
                    );
                }
            );
        });

        getElements(
            '[data-modal-open]'
        ).forEach(button => {
            button.addEventListener(
                'click',
                event => {
                    event.preventDefault();

                    const target =
                        button.dataset
                            .modalOpen;

                    openModal(
                        target
                    );
                }
            );
        });

        getElements(
            '[data-modal]'
        ).forEach(modal => {
            modal.addEventListener(
                'click',
                event => {
                    if (
                        event.target ===
                        modal &&
                        modal.dataset
                            .closeOnOverlay !==
                            'false'
                    ) {
                        closeModal(
                            modal
                        );
                    }
                }
            );
        });

        document.addEventListener(
            'keydown',
            event => {
                if (
                    event.key !==
                    'Escape'
                ) {
                    return;
                }

                const openModals =
                    getElements(
                        '[data-modal].open'
                    );

                if (
                    openModals.length
                ) {
                    closeModal(
                        openModals[
                            openModals.length -
                                1
                        ]
                    );
                }
            }
        );
    }

    /* =========================================================
     * Notifications
     * ======================================================= */

    function showNotification(
        message,
        type = 'info',
        options = {}
    ) {
        if (!message) {
            return null;
        }

        const id =
            `notification-${Date.now()}-${Math.random()
                .toString(36)
                .slice(2)}`;

        const duration =
            Number(
                options.duration ??
                4000
            );

        const container =
            getElement(
                '#notificationContainer'
            ) ||
            getElement(
                '[data-notification-container]'
            ) ||
            createNotificationContainer();

        const notification =
            document.createElement(
                'div'
            );

        notification.className =
            `notification notification-${type}`;

        notification.dataset.id =
            id;

        notification.setAttribute(
            'role',
            type === 'error'
                ? 'alert'
                : 'status'
        );

        notification.innerHTML = `
            <div class="notification-content">
                <span class="notification-message">
                    ${escapeHtml(message)}
                </span>
            </div>

            <button
                type="button"
                class="notification-close"
                aria-label="Close notification"
            >
                &times;
            </button>
        `;

        container.appendChild(
            notification
        );

        const entry = {
            id,
            message,
            type,
            element: notification
        };

        App.state.notifications.push(
            entry
        );

        const close =
            () => {
                notification.classList.add(
                    'closing'
                );

                setTimeout(
                    () => {
                        notification.remove();

                        App.state.notifications =
                            App.state.notifications.filter(
                                item =>
                                    item.id !==
                                    id
                            );
                    },
                    200
                );
            };

        notification
            .querySelector(
                '.notification-close'
            )
            ?.addEventListener(
                'click',
                close
            );

        if (
            duration > 0
        ) {
            setTimeout(
                close,
                duration
            );
        }

        return id;
    }

    function createNotificationContainer() {
        const container =
            document.createElement(
                'div'
            );

        container.id =
            'notificationContainer';

        container.className =
            'notification-container';

        container.setAttribute(
            'aria-live',
            'polite'
        );

        document.body.appendChild(
            container
        );

        return container;
    }

    function closeNotification(
        id
    ) {
        const notification =
            App.state.notifications.find(
                item =>
                    item.id === id
            );

        if (!notification) {
            return;
        }

        notification.element.remove();

        App.state.notifications =
            App.state.notifications.filter(
                item =>
                    item.id !== id
            );
    }

    function clearNotifications() {
        App.state.notifications.forEach(
            notification => {
                notification.element.remove();
            }
        );

        App.state.notifications = [];
    }

    /* =========================================================
     * Theme
     * ======================================================= */

    function getPreferredTheme() {
        const stored =
            localStorage.getItem(
                App.config.themeKey
            );

        if (
            stored === 'light' ||
            stored === 'dark'
        ) {
            return stored;
        }

        if (
            window.matchMedia &&
            window.matchMedia(
                '(prefers-color-scheme: dark)'
            ).matches
        ) {
            return 'dark';
        }

        return 'light';
    }

    function applyTheme(theme) {
        const normalized =
            theme === 'dark'
                ? 'dark'
                : 'light';

        document.documentElement.dataset
            .theme = normalized;

        document.documentElement.classList.toggle(
            'dark-theme',
            normalized === 'dark'
        );

        document.documentElement.classList.toggle(
            'light-theme',
            normalized === 'light'
        );

        document.body.classList.toggle(
            'dark-theme',
            normalized === 'dark'
        );

        document.body.classList.toggle(
            'light-theme',
            normalized === 'light'
        );

        App.state.theme =
            normalized;

        localStorage.setItem(
            App.config.themeKey,
            normalized
        );

        getElements(
            '[data-theme-toggle]'
        ).forEach(button => {
            button.setAttribute(
                'aria-pressed',
                String(
                    normalized ===
                        'dark'
                )
            );

            const label =
                normalized === 'dark'
                    ? 'Switch to light mode'
                    : 'Switch to dark mode';

            button.setAttribute(
                'aria-label',
                label
            );
        });
    }

    function toggleTheme() {
        applyTheme(
            App.state.theme ===
                'dark'
                ? 'light'
                : 'dark'
        );
    }

    function initializeTheme() {
        applyTheme(
            getPreferredTheme()
        );

        getElements(
            '[data-theme-toggle]'
        ).forEach(button => {
            button.addEventListener(
                'click',
                event => {
                    event.preventDefault();
                    toggleTheme();
                }
            );
        });

        if (
            window.matchMedia
        ) {
            const mediaQuery =
                window.matchMedia(
                    '(prefers-color-scheme: dark)'
                );

            mediaQuery.addEventListener(
                'change',
                event => {
                    if (
                        !localStorage.getItem(
                            App.config.themeKey
                        )
                    ) {
                        applyTheme(
                            event.matches
                                ? 'dark'
                                : 'light'
                        );
                    }
                }
            );
        }
    }

    /* =========================================================
     * Logout controls
     * ======================================================= */

    function initializeLogout() {
        getElements(
            '[data-logout]'
        ).forEach(button => {
            button.addEventListener(
                'click',
                async event => {
                    event.preventDefault();

                    const requireConfirmation =
                        button.dataset
                            .confirmLogout !==
                        'false';

                    if (
                        requireConfirmation
                    ) {
                        const confirmed =
                            window.confirm(
                                'Are you sure you want to log out?'
                            );

                        if (!confirmed) {
                            return;
                        }
                    }

                    await logout();
                }
            );
        });
    }

    /* =========================================================
     * Global forms
     * ======================================================= */

    function initializeGlobalForms() {
        document.addEventListener(
            'submit',
            event => {
                const form =
                    event.target;

                if (
                    !form.matches(
                        '[data-confirm-submit]'
                    )
                ) {
                    return;
                }

                const message =
                    form.dataset
                        .confirmSubmit ||
                    'Are you sure you want to continue?';

                if (
                    !window.confirm(
                        message
                    )
                ) {
                    event.preventDefault();
                }
            }
        );
    }

    /* =========================================================
     * Accessibility
     * ======================================================= */

    function initializeAccessibility() {
        document.addEventListener(
            'keydown',
            event => {
                if (
                    event.key !==
                    'Tab'
                ) {
                    return;
                }

                document.body.classList.add(
                    'keyboard-navigation'
                );
            }
        );

        document.addEventListener(
            'mousedown',
            () => {
                document.body.classList.remove(
                    'keyboard-navigation'
                );
            }
        );

        getElements(
            '[data-tooltip]'
        ).forEach(element => {
            const text =
                element.dataset.tooltip;

            if (!text) {
                return;
            }

            element.setAttribute(
                'title',
                text
            );
        });
    }

    /* =========================================================
     * Page-specific module initialization
     * ======================================================= */

    async function initializePageModule() {
        const page =
            getCurrentPage();

        const moduleMap = {
            'patients.html': {
                name: 'Patients',
                object: () =>
                    window.Patients
            },

            'doctors.html': {
                name: 'Doctors',
                object: () =>
                    window.Doctors
            },

            'appointments.html': {
                name: 'Appointments',
                object: () =>
                    window.Appointments
            },

            'medical-records.html': {
                name: 'MedicalRecords',
                object: () =>
                    window.MedicalRecords
            },

            'prescriptions.html': {
                name: 'Prescriptions',
                object: () =>
                    window.Prescriptions
            },

            'pharmacy.html': {
                name: 'Pharmacy',
                object: () =>
                    window.Pharmacy
            },

            'inventory.html': {
                name: 'Inventory',
                object: () =>
                    window.Inventory
            },

            'laboratory.html': {
                name: 'Laboratory',
                object: () =>
                    window.Laboratory
            },

            'labboratory.html': {
                name: 'Laboratory',
                object: () =>
                    window.Laboratory
            },

            'billing.html': {
                name: 'Billing',
                object: () =>
                    window.Billing
            },

            'reports.html': {
                name: 'Reports',
                object: () =>
                    window.Reports
            }
        };

        const definition =
            moduleMap[page];

        if (!definition) {
            return null;
        }

        const module =
            definition.object();

        if (!module) {
            console.warn(
                `${definition.name} module is not loaded.`
            );

            return null;
        }

        if (
            typeof module.init !==
            'function'
        ) {
            return null;
        }

        /*
         * Page modules may already auto-initialize
         * themselves. The module's init method should
         * therefore remain idempotent.
         */
        try {
            await module.init({
                autoLoad: true
            });

            App.state.initializedModules[
                definition.name
            ] = true;

            return module;
        } catch (error) {
            console.error(
                `${definition.name} initialization error:`,
                error
            );

            showNotification(
                `Unable to initialize ${definition.name}.`,
                'error'
            );

            throw error;
        }
    }

    /* =========================================================
     * Automatic API/session error handling
     * ======================================================= */

    function initializeApiErrorHandling() {
        window.addEventListener(
            'unhandledrejection',
            event => {
                const error =
                    event.reason;

                if (!error) {
                    return;
                }

                const message =
                    String(
                        error.message ||
                        ''
                    ).toLowerCase();

                const unauthorized =
                    message.includes(
                        '401'
                    ) ||
                    message.includes(
                        'unauthorized'
                    ) ||
                    message.includes(
                        'authentication'
                    ) ||
                    message.includes(
                        'token expired'
                    );

                if (
                    unauthorized &&
                    !isPublicPage()
                ) {
                    showNotification(
                        'Your session has expired. Please log in again.',
                        'warning'
                    );

                    setTimeout(
                        redirectToLogin,
                        1000
                    );
                }
            }
        );
    }

    /* =========================================================
     * Browser/page state
     * ======================================================= */

    function initializePageState() {
        document.body.dataset.page =
            getCurrentPage();

        document.body.dataset.app =
            'medical-management-system';

        const pageTitle =
            document.title;

        if (
            pageTitle &&
            !pageTitle
                .toLowerCase()
                .includes(
                    'medical management system'
                )
        ) {
            document.title =
                `${pageTitle} - ${App.config.appName}`;
        }
    }

    /* =========================================================
     * Global keyboard shortcuts
     * ======================================================= */

    function initializeKeyboardShortcuts() {
        document.addEventListener(
            'keydown',
            event => {
                if (
                    event.ctrlKey ||
                    event.metaKey
                ) {
                    /*
                     * Do not override browser/application
                     * shortcuts while typing.
                     */
                    const target =
                        event.target;

                    if (
                        target &&
                        (
                            target.matches(
                                'input'
                            ) ||
                            target.matches(
                                'textarea'
                            ) ||
                            target.matches(
                                'select'
                            ) ||
                            target.isContentEditable
                        )
                    ) {
                        return;
                    }

                    /*
                     * Ctrl/Cmd + K opens the
                     * application search if available.
                     */
                    if (
                        event.key
                            .toLowerCase() ===
                        'k'
                    ) {
                        const search =
                            getElement(
                                '#globalSearch'
                            ) ||
                            getElement(
                                '[data-global-search]'
                            );

                        if (search) {
                            event.preventDefault();
                            search.focus();
                        }
                    }
                }
            }
        );
    }

    /* =========================================================
     * Initialization
     * ======================================================= */

    async function init() {
        if (App.initialized) {
            return App;
        }

        initializePageState();
        initializeTheme();
        initializeNavigation();
        initializeNavigationEvents();
        initializeSidebar();
        initializeDropdowns();
        initializeModals();
        initializeLogout();
        initializeGlobalForms();
        initializeAccessibility();
        initializeKeyboardShortcuts();
        initializeApiErrorHandling();

        const authenticated =
            await requireAuthentication();

        if (
            authenticated
        ) {
            await getCurrentUser();
            updateUserInterface();

            /*
             * Do not initialize page-specific modules
             * on public/authentication pages.
             */
            if (
                !isPublicPage()
            ) {
                await initializePageModule();
            }
        }

        App.initialized =
            true;

        return App;
    }

    /* =========================================================
     * Public API
     * ======================================================= */

    App.init = init;

    App.getCurrentPage =
        getCurrentPage;

    App.isAuthenticated =
        isAuthenticated;

    App.getCurrentUser =
        getCurrentUser;

    App.requireAuthentication =
        requireAuthentication;

    App.redirectToLogin =
        redirectToLogin;

    App.redirectToDashboard =
        redirectToDashboard;

    App.logout =
        logout;

    App.navigate =
        navigate;

    App.openMobileSidebar =
        openMobileSidebar;

    App.closeMobileSidebar =
        closeMobileSidebar;

    App.toggleSidebar =
        toggleSidebar;

    App.openModal =
        openModal;

    App.closeModal =
        closeModal;

    App.showNotification =
        showNotification;

    App.closeNotification =
        closeNotification;

    App.clearNotifications =
        clearNotifications;

    App.applyTheme =
        applyTheme;

    App.toggleTheme =
        toggleTheme;

    App.updateUserInterface =
        updateUserInterface;

    App.refreshPageModule =
        initializePageModule;

    window.App =
        App;

    /* =========================================================
     * Automatic startup
     * ======================================================= */

    if (
        document.readyState ===
        'loading'
    ) {
        document.addEventListener(
            'DOMContentLoaded',
            () => {
                init().catch(
                    error => {
                        console.error(
                            'Application initialization error:',
                            error
                        );
                    }
                );
            }
        );
    } else {
        init().catch(
            error => {
                console.error(
                    'Application initialization error:',
                    error
                );
            }
        );
    }
})();

Authentication
    │
    ├── Session detection
    ├── Protected page handling
    ├── Login redirect
    └── Logout

Navigation
    │
    ├── Active menu
    ├── Page title
    ├── Sidebar
    └── Mobile navigation

UI
    │
    ├── User information
    ├── Dropdowns
    ├── Modals
    ├── Notifications
    └── Theme

Application
    │
    ├── Global errors
    ├── Accessibility
    ├── Keyboard shortcuts
    └── Page-module initialization