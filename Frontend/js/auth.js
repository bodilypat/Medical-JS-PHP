/**
 * Medical Management System
 * Frontend/js/auth.js
 *
 * Authentication operations:
 * - Login
 * - Logout
 * - Get current authenticated user
 * - Check authentication
 * - Redirect authenticated/unauthenticated users
 * - Change password
 * - Forgot password
 */

'use strict';

const Auth = (() => {

    const STORAGE_KEYS = {
        TOKEN: 'medical_auth_token',
        USER: 'medical_auth_user'
    };

    /**
     * Get stored authentication token.
     */
    function getToken() {
        return localStorage.getItem(STORAGE_KEYS.TOKEN);
    }

    /**
     * Store authentication token.
     */
    function setToken(token) {
        if (token) {
            localStorage.setItem(STORAGE_KEYS.TOKEN, token);
        }
    }

    /**
     * Remove authentication token.
     */
    function removeToken() {
        localStorage.removeItem(STORAGE_KEYS.TOKEN);
    }

    /**
     * Get stored authenticated user.
     */
    function getUser() {
        const user = localStorage.getItem(STORAGE_KEYS.USER);

        if (!user) {
            return null;
        }

        try {
            return JSON.parse(user);
        } catch (error) {
            console.error('Unable to parse stored user:', error);
            removeUser();
            return null;
        }
    }

    /**
     * Store authenticated user.
     */
    function setUser(user) {
        if (user) {
            localStorage.setItem(
                STORAGE_KEYS.USER,
                JSON.stringify(user)
            );
        }
    }

    /**
     * Remove stored authenticated user.
     */
    function removeUser() {
        localStorage.removeItem(STORAGE_KEYS.USER);
    }

    /**
     * Clear all authentication information.
     */
    function clearAuth() {
        removeToken();
        removeUser();
    }

    /**
     * Login user.
     *
     * Expected backend response:
     * {
     *   success: true,
     *   message: "Login successful",
     *   data: {
     *      token: "...",
     *      user: {...}
     *   }
     * }
     */
    async function login(email, password, remember = true) {

        if (!email || !password) {
            throw new Error('Email and password are required.');
        }

        if (typeof API === 'undefined') {
            throw new Error('API client is not loaded.');
        }

        const response = await API.post(
            '/auth/login.php',
            {
                email: email.trim(),
                password: password
            }
        );

        if (!response || response.success === false) {
            throw new Error(
                response?.message || 'Invalid email or password.'
            );
        }

        const data = response.data || response;

        const token = data.token || data.access_token;
        const user = data.user || null;

        if (!token) {
            throw new Error('Authentication token was not returned by the server.');
        }

        /*
         * Always keep the token available for the current session.
         * If "remember" is false, sessionStorage can be used instead.
         */
        if (remember) {
            localStorage.setItem(STORAGE_KEYS.TOKEN, token);

            if (user) {
                localStorage.setItem(
                    STORAGE_KEYS.USER,
                    JSON.stringify(user)
                );
            }
        } else {
            sessionStorage.setItem(STORAGE_KEYS.TOKEN, token);

            if (user) {
                sessionStorage.setItem(
                    STORAGE_KEYS.USER,
                    JSON.stringify(user)
                );
            }
        }

        return {
            success: true,
            token,
            user
        };
    }

    /**
     * Logout the current user.
     */
    async function logout() {

        const token = getToken();

        try {

            if (token && typeof API !== 'undefined') {
                await API.post('/auth/logout.php', {});
            }

        } catch (error) {

            /*
             * Even if the server logout request fails,
             * local authentication must still be removed.
             */
            console.warn('Server logout failed:', error);

        } finally {

            clearAuth();

            sessionStorage.removeItem(STORAGE_KEYS.TOKEN);
            sessionStorage.removeItem(STORAGE_KEYS.USER);
        }

        redirectToLogin();
    }

    /**
     * Get the currently authenticated user from backend.
     */
    async function me() {

        if (!getToken()) {
            return null;
        }

        if (typeof API === 'undefined') {
            throw new Error('API client is not loaded.');
        }

        try {

            const response = await API.get('/auth/me.php');

            if (!response || response.success === false) {
                clearAuth();
                return null;
            }

            const user = response.data?.user || response.user || response.data;

            if (user) {
                setUser(user);
            }

            return user;

        } catch (error) {

            console.error('Authentication check failed:', error);

            clearAuth();

            return null;
        }
    }

    /**
     * Check whether a user is authenticated.
     */
    function isAuthenticated() {
        return Boolean(
            localStorage.getItem(STORAGE_KEYS.TOKEN) ||
            sessionStorage.getItem(STORAGE_KEYS.TOKEN)
        );
    }

    /**
     * Return the currently active token.
     */
    function activeToken() {
        return (
            localStorage.getItem(STORAGE_KEYS.TOKEN) ||
            sessionStorage.getItem(STORAGE_KEYS.TOKEN)
        );
    }

    /**
     * Return the currently active user.
     */
    function activeUser() {

        const localUser = localStorage.getItem(STORAGE_KEYS.USER);

        if (localUser) {
            try {
                return JSON.parse(localUser);
            } catch {
                localStorage.removeItem(STORAGE_KEYS.USER);
            }
        }

        const sessionUser = sessionStorage.getItem(STORAGE_KEYS.USER);

        if (sessionUser) {
            try {
                return JSON.parse(sessionUser);
            } catch {
                sessionStorage.removeItem(STORAGE_KEYS.USER);
            }
        }

        return null;
    }

    /**
     * Require authentication.
     *
     * Use this on protected pages.
     */
    function requireAuth(loginPage = 'login.html') {

        if (!isAuthenticated()) {
            window.location.href = loginPage;
            return false;
        }

        return true;
    }

    /**
     * Redirect authenticated users away from login page.
     */
    function redirectIfAuthenticated(
        dashboardPage = 'dashboard.html'
    ) {

        if (isAuthenticated()) {
            window.location.href = dashboardPage;
            return true;
        }

        return false;
    }

    /**
     * Redirect to login page.
     */
    function redirectToLogin(loginPage = 'login.html') {
        window.location.href = loginPage;
    }

    /**
     * Redirect to dashboard.
     */
    function redirectToDashboard(
        dashboardPage = 'dashboard.html'
    ) {
        window.location.href = dashboardPage;
    }

    /**
     * Change authenticated user's password.
     */
    async function changePassword(
        currentPassword,
        newPassword,
        confirmPassword
    ) {

        if (!currentPassword || !newPassword || !confirmPassword) {
            throw new Error('All password fields are required.');
        }

        if (newPassword !== confirmPassword) {
            throw new Error('New passwords do not match.');
        }

        if (newPassword.length < 8) {
            throw new Error(
                'New password must contain at least 8 characters.'
            );
        }

        if (typeof API === 'undefined') {
            throw new Error('API client is not loaded.');
        }

        const response = await API.post(
            '/auth/change-password.php',
            {
                current_password: currentPassword,
                new_password: newPassword,
                confirm_password: confirmPassword
            }
        );

        if (!response || response.success === false) {
            throw new Error(
                response?.message || 'Unable to change password.'
            );
        }

        return response;
    }

    /**
     * Request password reset.
     */
    async function forgotPassword(email) {

        if (!email) {
            throw new Error('Email address is required.');
        }

        if (typeof API === 'undefined') {
            throw new Error('API client is not loaded.');
        }

        const response = await API.post(
            '/auth/forgot-password.php',
            {
                email: email.trim()
            }
        );

        if (!response || response.success === false) {
            throw new Error(
                response?.message ||
                'Unable to process password reset request.'
            );
        }

        return response;
    }

    /**
     * Get the user's role.
     */
    function getRole() {
        const user = activeUser();

        return user?.role || null;
    }

    /**
     * Check whether user has a particular role.
     */
    function hasRole(role) {

        const userRole = getRole();

        if (!userRole || !role) {
            return false;
        }

        if (Array.isArray(role)) {
            return role.includes(userRole);
        }

        return userRole === role;
    }

    /**
     * Require a specific role.
     */
    function requireRole(
        roles,
        redirectPage = 'dashboard.html'
    ) {

        if (!isAuthenticated()) {
            redirectToLogin();
            return false;
        }

        if (!hasRole(roles)) {
            window.location.href = redirectPage;
            return false;
        }

        return true;
    }

    /**
     * Initialize authentication behavior.
     */
    async function init(options = {}) {

        const {
            protectedPage = false,
            loginPage = 'login.html',
            dashboardPage = 'dashboard.html'
        } = options;

        if (protectedPage) {

            if (!isAuthenticated()) {
                redirectToLogin(loginPage);
                return null;
            }

            return await me();
        }

        return null;
    }

    return {

        login,
        logout,
        me,

        getToken,
        activeToken,

        getUser,
        activeUser,

        setToken,
        setUser,

        clearAuth,

        isAuthenticated,

        requireAuth,
        requireRole,

        redirectToLogin,
        redirectToDashboard,
        redirectIfAuthenticated,

        getRole,
        hasRole,

        changePassword,
        forgotPassword,

        init
    };

})();

/*
 * Make Auth available globally.
 */
window.Auth = Auth;


/* ============================================================
   LOGIN FORM HANDLER
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {

    const loginForm = document.getElementById('loginForm');

    if (!loginForm) {
        return;
    }

    const emailInput =
        document.getElementById('email') ||
        document.getElementById('loginEmail');

    const passwordInput =
        document.getElementById('password') ||
        document.getElementById('loginPassword');

    const rememberInput =
        document.getElementById('remember') ||
        document.getElementById('rememberMe');

    const errorElement =
        document.getElementById('loginError');

    const submitButton =
        loginForm.querySelector(
            'button[type="submit"], input[type="submit"]'
        );

    loginForm.addEventListener('submit', async (event) => {

        event.preventDefault();

        if (!emailInput || !passwordInput) {
            return;
        }

        const email = emailInput.value.trim();
        const password = passwordInput.value;
        const remember = rememberInput
            ? rememberInput.checked
            : true;

        clearLoginError();

        if (!email) {
            showLoginError('Please enter your email address.');
            emailInput.focus();
            return;
        }

        if (!isValidEmail(email)) {
            showLoginError('Please enter a valid email address.');
            emailInput.focus();
            return;
        }

        if (!password) {
            showLoginError('Please enter your password.');
            passwordInput.focus();
            return;
        }

        setLoading(true);

        try {

            await Auth.login(
                email,
                password,
                remember
            );

            /*
             * Default destination after successful login.
             */
            const redirect =
                new URLSearchParams(
                    window.location.search
                ).get('redirect');

            if (redirect) {
                window.location.href = redirect;
            } else {
                Auth.redirectToDashboard();
            }

        } catch (error) {

            console.error('Login error:', error);

            showLoginError(
                error.message ||
                'Unable to login. Please check your credentials.'
            );

        } finally {

            setLoading(false);
        }
    });


    function showLoginError(message) {

        if (!errorElement) {
            alert(message);
            return;
        }

        errorElement.textContent = message;
        errorElement.hidden = false;
        errorElement.classList.add('active');
    }


    function clearLoginError() {

        if (!errorElement) {
            return;
        }

        errorElement.textContent = '';
        errorElement.hidden = true;
        errorElement.classList.remove('active');
    }


    function setLoading(loading) {

        if (!submitButton) {
            return;
        }

        submitButton.disabled = loading;

        if (loading) {

            submitButton.dataset.originalText =
                submitButton.textContent;

            submitButton.textContent = 'Signing in...';

        } else {

            submitButton.textContent =
                submitButton.dataset.originalText ||
                'Login';
        }
    }

});


/* ============================================================
   PASSWORD VISIBILITY
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {

    const toggleButtons =
        document.querySelectorAll(
            '[data-toggle-password]'
        );

    toggleButtons.forEach(button => {

        button.addEventListener('click', () => {

            const targetId =
                button.dataset.togglePassword;

            const input =
                document.getElementById(targetId);

            if (!input) {
                return;
            }

            const isPassword =
                input.type === 'password';

            input.type =
                isPassword ? 'text' : 'password';

            button.setAttribute(
                'aria-label',
                isPassword
                    ? 'Hide password'
                    : 'Show password'
            );

            button.classList.toggle(
                'active',
                isPassword
            );
        });

    });

});


/* ============================================================
   LOGOUT BUTTONS
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {

    const logoutButtons =
        document.querySelectorAll(
            '[data-action="logout"], #logoutButton'
        );

    logoutButtons.forEach(button => {

        button.addEventListener('click', async (event) => {

            event.preventDefault();

            await Auth.logout();

        });

    });

});


/* ============================================================
   HELPER FUNCTIONS
   ============================================================ */

function isValidEmail(email) {

    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}


/* ============================================================
   OPTIONAL PAGE PROTECTION
   ============================================================ */

/*
 * Add this attribute to protected pages:
 *
 * <body data-require-auth>
 *
 * The page will redirect to login.html if the user
 * does not have a valid local authentication token.
 */

document.addEventListener('DOMContentLoaded', async () => {

    const requiresAuth =
        document.body?.hasAttribute('data-require-auth');

    if (!requiresAuth) {
        return;
    }

    if (!Auth.isAuthenticated()) {

        const currentPage =
            window.location.pathname.split('/').pop();

        const redirect =
            encodeURIComponent(currentPage);

        window.location.href =
            `login.html?redirect=${redirect}`;

        return;
    }

    /*
     * Validate the token against the backend.
     */
    const user = await Auth.me();

    if (!user) {

        const currentPage =
            window.location.pathname.split('/').pop();

        const redirect =
            encodeURIComponent(currentPage);

        window.location.href =
            `login.html?redirect=${redirect}`;
    }

});