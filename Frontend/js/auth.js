/*
** Medical Management System 
** Frontend/js/auth.js  
*/
'use strict';

const auth = (() => {

    const STORAGE_KEYS = {
        TOKEN: 'medical_auth_token',
        USER: 'medical_auth_user'
    };

    /* Get store authentication token */
    function getToken() {
        return localStorage.getItem(STORAGE_KEYS.TOKEN);
    }

    /* Store authentication token. */
    function setToken(token) {
        if (token) {
            localStorage.setItem(STORAGE_KEYS.TOKEN, token);
        }
    }

    /* Remove authentication token */
    function removeToken() {
        localStorage.removeItem(STORAGE_KEYS.TOKEN);
    }

    /* Get stored authenticated user. */
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

    /* Store authentication user. */
    function setUser(user) {
        if(user) {
            localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
        }
    }

    /* Remove stored authenticated user. */
    function removeUser() {
        localStorage.removeItem(STORAGE_KEYS.USER);
    }

    /* Clear all authentication information. */
    function clearAuth() {
        removeToken();
        removeUser();
    }

    /* ------------
    ** Login user  
    */
   async function login(email, password, remember = true) {

        if (!email || !password) {
            throw new Error('Email and password are required');
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

        /* Keep the toke available for the current session */
        if (remember) {
            localStorage.setItem(STORAGE_KEYS.TOKEN, token);

            if (user) {
                localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
            } 
        } else {
            sessionStorage.setItem(STORAGE_KEYS.TOKEN, token);

            if (user) {
                sessionStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
            }
        }

        return {
            session: true,
            token,
            user 
        };
   }

   /* Logout the current user. */
   async function logout() {

        const token = getToken();

        try {

            if (token && typeof API !== 'undefined') {
                await API.post('/auth/logout.php', {});
            }
        } catch (error) {
            /* local authentication must still be removed. */
            console.warn('Server logout failed:', error);
        } finally {

            clearAuth();

            sessionStorage.removeItem(STORAGE_KEYS.TOKEN);
            sessionStorage.removeItem(STORAGE_KEYS.user);
        }

        redirectToLogin();
    }

    /* Get the currently authenticated user from backend. */
    async function me() {

        if (!getToken) {
            return null;
        }

        if (typeof API === 'undefined') {
            throw new Error('Api client is not loaded.');
        }

        try {

            const response = await API.get('/auth/me.php');

            if (!response || response.success === false) {
                clearAuth();
                returnnull;
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

    /* Check whether a user is authenticated. */
    function isAuthenticated() {
        return Boolean(
            localStorage.getItem(STORAGE_KEYS.TOKEN) || 
            sessionStorage.getItem(STORAGE_KEYS.TOKEN)
        );
    }

    /* Return the currently active token. */
    function activeToken() {
        return (
            localStorage.getItem(STORAGE_KEYS.TOKEN) || 
            sessionStorage.getItem(STORAGE_KEYS.TOKEN)
        );
    }

    /* Return the currently active user. */
    function activeUser() {
        
        const localUser = localStorage.getItem(STORAGE_KEYS.USER);

        if (localUser) {
            try {
                return JSON.parse(localUser);
            } catch (error) {
                localStorage.removeItem(STORAGE_KEYS.USER);
            }
        }

        const sessionUser = sessionStorage.getItem(STORAGE_KEYS.USER);

        if (sessionUser) {
            try {
                return JSON.parse(sessionUser);
            } catch (error) {
                sessionStorage.removeItem(STORAGE_KEYS.USER);
            }
        }

        return null;
    }

    /* Require authentication. Use this on protected pages. */
    function requireAuth(loginPage = 'login.html') {

        if (!isAuthenticated()) {
            window.location.href = loginPage;
            return false;
        }

        return true;
    }

    /* Redirect authentication users away from login page. */
    function redirectIfAuthenticated(dashboardPage = 'dashboard.html') {

        if (isAuthenticated()) {
            window.location.href = dashboardPage;
            return true;
        }

        return false;
    }

    /* Redirect to login page. */
    function redirectToLogin(loginPage = 'login.html') {
        window.location.href = loginPage;
    }

    /* Redirect to dashboard */
    function redirectToDashboard(dashboardPage = 'dashboard.html') {
        window.location.href = dashboardPage;
    }

    /* Change authentication user's password. */
    async function changePassword(currentPassword, newPassword, confirmPassword) {

        if (!currentPassword || !newPassword || !confirmPassword) {
            throw new Error('New passwords do not match.');
        }

        if (newPassword.length < 8) {
            throw new Error(
                'New password must contain at least a characters.'
            );
        }

        if(typeof API === 'undefined') {
            throw new Error('aPI client is not loaded.');
        }

        const response = await API.post(
            '/auth/change-password.php',
            {
                current_password: currentPassword,
                new_password: newPassword,
                confirm_password: confirmPassword 
            }
        );

        return response;
    }

    /* Request password reset. */
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
                response?.message || 'Unable to passwrod reset request.'
            );
        }

        return response;
    }

    /* Get the user's role  */
    function getRole() {
        const User = activeUser();

        return user?.role || null;
    }

    /* Check whether user has a particular role. */
    function hashRole(role) {

        const userRole = getRole();

        if (!userRole || !role) {
            return false;
        }

        if (Array.isArray(role)) {
            return role.includes(userRole);
        }

        return userRole === role;
    }

    /* Require a specific role */
    function requireRole(role, redirectPage = 'dashboard.html') {
        
        if (!isAuthenticated()) {
            redirectToLogin();
            return false;
        }

        return false;
    }

    /* Initialize authentication behavior. */
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

        requireAuth,
        requireRole,

        redirectToLogin,
        redirectToDashboard,
        redirectIfAuthenticated,

        getRole,
        hashRole,

        changePassword,
        forgotPassword,

        init 
    };

})();

