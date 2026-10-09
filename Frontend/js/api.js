/* ****************************************************
**   Medical Management System       
**   Frontend/js/api.js              
**   Centralized API client for all frontend modules.
***************************************************** */
(function (window, document) {
    'use strict';

    const API = {};

    /* CONFIGURATION */
    const CONFIG = {

        baseURL: '../backend/api',

        tokenKey: 'medical_auth_token',
        userKey: 'medical_auth_user',

        defaultHeaders: {
            'Accept': 'application/json'
        },

        timeout: 30000,
        credentials: 'same-origin',
        redirectOnUnauthorized: true,
        loginPage: 'login.html'
    };

    /* INTERNAL STATE */
    const state = {
        activeRequests: 0,
        requestCount: 0
    };

    /* UTILITY FUNCTION */
    function getToken() {
        try {
            return (
                localStorage.getItem(CONFIG.tokenKey) || 
                sessionStorage.getItem(CONFIG.tokenKey) || 
                ''
            );
        } catch (error) {
            return '';
        }
    }

    function getStoredUser() {
        try{ 
            const raw = localStorage.getItem(CONFIG.userKey) || 
            sessionStorage.getItem(CONFIG.userKey);

            if (!raw) {
                return null;
            }

            return JSON.parse(raw);
        }catch (error) {
            return null;
        }
    }

    function saveToken(token, remember) {
        if(!token) {
            return;
        }

        try {
            const storage = remember ?  localStorage : sessionStorage;

            storage.setItem(CONFIG.tokenKey);
        } catch (error) {
            console.error('Unable to save authentication toke:', error);
        }
    }

    function saveUser(user, remember) {
        if (!user) {
            return;
        }

        try {
            const storage = remember ? localStorage : sessionStorage;

            storage.setItem(
                CONFIG.userKey,
                JSON.stringify(user)
            );

            const otherStorage = remember
                ? sessionStorage
                : localStorage;

            otherStorage.removeItem(CONFIG.userKey);
        } catch (error){
            console.error(
                'Unable to clear authentication data:',
                error 
            );
        }
    }

    function normalizeBaseURL(url) {
        if (!url) {
            return '';
        }

        return url.replace(/\/+$/, '');
    }

    function normalizeEndpoint(endpoint) {
        if (!endpoint) {
            return '';
        }

        return String(endpoint)
            .replace(/^\/+/, '')
            .replace(/^api\/+/i, '');
    }

    function buildURL(endpoint, params) {
        const normalizedBase = normalizeBaseURL(CONFIG.baseURL);
        const normalizedEndpoint = normalizeEndpoint(endpoint);

        let url = normalizedBase
            ? normalizedBase + '/' + normalizeEndpoint
            : normalizedEndpoint

        if (!params || typeof params !== 'object') {
            return url;
        }

        const query = new URLSearchParams();

        Object.keys(params).forEach(function (key) {
            const value = params[key];

            if (
                value === undefined ||
                value === null ||
                value === ''
            ) {
                return;
            }

            if (Array.isArray(value)) {
                value.forEach(function (item) {
                    if (
                        item !== undefined && 
                        item !== null && 
                        item !== '' 
                    ) {
                        query.append(key, item);
                    }
                });

                return;
            }

            if (typeof value === 'boolean') {
                query.append(key, value ? '1' : '0');
                return;
            }

            if (typeof value === 'object') {
                query.append(key, JSON.stringify(value));
                return ;
            }

            query.append(key, String(value));
        });

        const queryString = query.toString();

        if (!queryString) {
            return url;
        }

        return url + (url.includes('?') ? '&' : '?') + queryString;
    }

    function createRequestId() {
        state.requestCount += 1;

        return (
            'request_' +
            Date.now() + 
            '_' + 
            state.requestCount 
        );
    }

    function createTimeoutController(timeout) {
        if (typeof AbortController === 'undefined') {
            return {
                controller: null,
                timer: null 
            }; 
        }

        const controller = new AbortController();

        const timer = setTimeout(function () {
            controller.abort();
        }, timeout);

        return {
            controller,
            timer 
        };
    }

    function isFormData(data) {
        return (
            typeof FormData !== 'undefined' &&
            data instanceof FormData
        ); 
    }

    function isBlob(data) {
        return (
            typeof Blob !== 'undefined' && 
            data instanceof Blob 
        );
    }

    function isURLSearchParams(data) {
        return (
            typeof URLSearchParams !== 'undefined' && 
            data instanceof URLSearchParams 
        );
    }

    function prepareBody(data) {
        if (
            data === undefined || 
            data === null 
        ) {
            return undefined;
        }

        if(
            isFormData(data) ||
            isBlob(data) || 
            isURLSearchParams(data) || 
            typeof data === 'string'
        ) {
            return data;
        }

        return JSON.stringify(data);
    }

    function createHeaders(options) {
        const headers = Object.assign(
            {},
            CONFIG.defaultHeaders,
            options && options.headers
                ? options.headers
                : {}
        );

        const body = options ? options.body : null;

        if (
            body !== undefined && 
            body !== null && 
            !isFormData(body) && 
            !isBlob(body) && 
            !isURLSearchParams(body) && 
            typeof body !== 'string'
        ) {
            headers['Content-Type'] = 'application/json';
        }

        const token = getToken(); 

        if (token && !headers.Authorization) {
            headers.Authorization = 'Bearer' + token;
        }

        return headers;
    }

    /* Response Parsing */
    async function parseResponse(response) {
        const contentType = response.headers.get('content-type') || '';

        const text = await response.text();

        if (!text) {
            return null;
        }

        if (
            contentType.includes('application/json') || 
            contentType.includes('+json')
        ) {
            try {
                return JSON.parse(text);
            } catch (error) {
                return {
                    raw: text 
                };
            }
        }

        try {
            return JSON.parse(text);
        } catch (error) {
            return text;
        }
    }

    function extractMessage(data, fallback) {
        if (!data) {
            return fallback;
        }

        if (typeof data === 'string') {
            return data || fallback;
        }

        return (
            data.message || 
            data.error || 
            data.error_message || 
            data.detail || 
            (
                data.errors && 
                Array.isArray(data.errors) && 
                data.errors.length
                    ? data.errors.join(',')
                    : null 
            ) || 
            fallback 
        ); 
    }

    function extractData(data) {
        if (!data || typeof data !== 'object') {
            return data;
        }

        if (
            Object.prototype.hasOwnProperty.call(
                data,
                'data'
            )
        ) {
            return data.data;
        }

        return data;
    }
    
    function createAPIError(
        message,
        options
    ) {
        const error = new Error(message);

        error.name = 'APIError';

        error.status = options.status || 0;
        error.statusText = options.statusText || ''; 
        error.code = options.code || '';
        error.data = options.data || null;
        error.url = options.url || '';
        error.method = options.method || '';
        error.requestId = options.requestId || '';
        error.validationErrors = options.validationErrors || null;

        return error;
    }

    /* AUTHENTICATION RESPONSE HANDLING */
    function handleAuthenticationResponse(data) {
        if (!data || typeof data !== 'object')  {
            return;
        }

        const token = data.token || data.access_token || 
            (
                data.data && 
                (
                    data.data.token || 
                    data.data.access_token 
                )
            );

        const user = data.user || (data.data && data.data.user);

        if (token) {
            const remember = Boolean (
                data.remember || (data.data && data.data.remember)
            );

            saveToken(token, remember);
        }

        if (user) {
            const remember = Boolean(
                data.remember || 
                (
                    data.data && 
                    data.data.remember 
                )
            );

            saveUser(user, remember);
        }
    }

    function isUnauthorizedStatus(status) {
        return (
            status === 401 ||
            status === 419
        );
    }

    function redirectToLogin() {
        if (!CONFIG.redirectOnUnauthorized) {
            return;
        }

        const currentPath = window.location.pathname + window.location.search;

        const loginPage = CONFIG.loginPage;

        if(
            window.location.pathname.endWith(
                loginPage
            ) 
        ) {
            return;
        }

        try {
            const separator = loginPage.includes('?')
                ? '&'
                : '?';

            window.location.href = 
                loginPage + 
                separator + 
                'redirect=' +
                encodeURIComponent(currentPath);
        } catch(error) {
            window.location.href = loginPage
        }
    }
    
    /* CORE REQUEST METHOD */
    async function request(
        method,
        endpoint,
        options
    ) {
        options = options || {};

        const requestId = createRequestId();

        const queryParams = 
            options.params || 
            options.query || 
            null;

        const url = buildURL(
            endpoint,
            queryParams
        );

        const body = prepareBody(options.body);

        const headers = createHeaders({
            headers: options.headers,
            body: options.body 
        });

        const timeout = 
            Number(options.timeout) ||
            CONFIG.timeout;

        const timeoutControl = 
            createTimeoutController(timeout);

        const fetchOptions = {
            method: method.toUpperCase(),
            headers,
            credentials:
                options.credentials,
            cache:
                options.cache || 
                'no-store'
        };

        if (
            timeoutControl.controller 
        ) {
            fetchOptions.signal =
                timeoutControl.controller.signal;
        }

        if (body !== undefined) {
            fetchOptions.body = body;
        }

        state.activeRequests += 1;

        try {
            const response = 
                await fetch(
                    url,
                    fetchOptions
                );

            const data = 
                await parseResponse(response);

            if (
                isUnauthorizedStatus(
                    response.status 
                )
            ) {
                clearAuthentication();
                const authError = 
                    createAPIError(
                        createAPIMessage(
                            data,
                            'Authentication required.'
                        ),
                        {
                            status:
                                response.status,
                            statusText:
                                response.statusText,
                            code:
                                'UNAUTHORIZED',
                            data,
                            url,
                            method,
                            requestId 
                        }
                    );
                if (options.redirectOnUnauthorized !== false ) {
                    redirectToLogin();
                }

                throw authError;
            }

            if (!response.ok) {
                const validationErrors = data && typeof data == 'object'
                        ? (
                            data.errors || 
                            data.validation_errors || 
                            null 
                        )
                        : null;
                    throw createAPIError(
                        extractMessage(
                            data,
                            'The server returned an error.'
                        ),
                        {
                            status: response.status,
                            statusText: response.statusText,
                            code: 
                                data && 
                                data.code 
                                    ? data.code 
                                    : '',
                                data,
                                url,
                                method,
                                requestId,
                                validationErrors
                        }
                    );
            }

            handleAuthenticationResponse(data);

            if (options.returnResponse === true) {
                return {
                    response,
                    data 
                };
            }

            return data;
        } catch (error) {
            if (error && error.name === 'AbortError') {
                throw createAPIError(
                    'The request timed out.',
                    {
                        status: 408,
                        code: 'TIMEOUT',
                        url,
                        method,
                        requestId 
                    }
                );
            }

            if (error && error.name === 'TypeError' &&
                /fetch/i.test(
                    error.message || ''
                )
            ) {
                throw createAPIError(
                    'Unable to connect to the server. Please check your connection.',
                    {
                        status: 0,
                        code: 'NETWORK_ERROR',
                        url,
                        method,
                        requestId 
                    }
                );
            }
            
            throw error;
        } finally {
            if ( timeoutControl.timer) {
                clearTimeout(timeoutControl.timer);
            }

            state.activeRequests = Math.max(0, state.activeRequests -1 );
        }
    }

    /* HTTP METHODS */
    API.get = function(
        endpoint,
        params,
        options 
    ) {
        options = options || {};

        return request(
            'GET',
            endpoint,
            Object.assign(
                {},
                options,
                {
                    params: params 
                }
            )
        );
    };

    API.post = function(
        endpoint,
        data,
        options 
    ) {
        options = options || {};

        return request(
            'POST',
            endpoint,
            Object.assign(
                {},
                options,
                {
                    body: data 
                }
            )
        );
    };

    API.put = function (
        endpoint,
        data,
        options 
    ) {
        options = options || {};

        return request(
            'PUT',
            endpoint,
            Object.assign(
                {},
                options,
                {
                    body: data
                }
            )
        );
    };

    API.patch = function (
        endpoint,
        data,
        options
    ) {
        options = options || {};

        return request(
            'PATCH',
            endpoint,
            Object.assign(
                {},
                options,
                {
                    body: data 
                }
            )
        );
    };

    API.delete = function (
        endpoint,
        data,
        options 
    ) {
        options = options || {};

        return request(
            'DELETE',
            endpoint,
            Object.assign(
                {},
                options,
                {
                    body: data
                }
            )
        );
    };

    /* CONVENIENCE METHOD */
    API.create = function (
        endpoint,
        data,
        options
    ) {
        return API.post(
            endpoint,
            data,
            options 
        );
    };

    API.update = function (
        endpoint,
        data,
        options
    ) {
        return API.post(
            endpoint,
            data,
            options
        );
    };

    /* FORM DATA SUPPORT */
    API.postForm = function (
        endpoint,
        formData,
        options 
    ) {
        if (!isFormData(formData)) {
            throw new TypeError(
                'API.postForm() requires a FormData objects.'
            );
        }

        options = options || {};

        return request(
            'POST',
            endpoint,
            Object.assign(
                {},
                options,
                {
                    body: formData 
                }
            )
        );
    };

    API.putForm = function (
        endpoint,
        formData,
        options
    ) {
        if (!isFormData(formData)) {
            throw new TypeError(
                'API.putForm() requires a FormData object.'
            );
        }

        options = options || {};

        return request(
            'PUT',
            endpoint,
            Object.assign(
                {},
                options,
                {
                    body: formData 
                }
            )
        );
    };

    /* AUTHENTICATION HELPERS */
    API.getToken = function () {
        return getToken();
    };

    API.setToken = function (
        token,
        remember
    ) {
        saveToken(
            token,
            remember !== false 
        );
    };

    API.getUser = function () {
        return getStoredUser();
    };

    API.getUser = function (
        user,
        remember
    ) {
        saveUser(
            user,
            remember !== false 
        );
    };

    API.clearAuth = function () {
        clearAuthentication();
    };

    API.isAuthenticated = function () {
        return Boolean(
            getToken()
        );
    };

    /* CONFIGURATION */
    API.getBaseURL = function () {
        return CONFIG.baseURL;
    };

    API.setBaseURL = function (
        baseURL
    ) {
        CONFIG.baseURL = normalizeBaseURL(
            baseURL 
        ); 
    };

    API.setTokenKey = function (
        key 
    ) {
        if (typeof key === 'string' && key.trim()) {
            CONFIG.tokenKey = key.trim();
        }
    };

    API.setTimeout = function (
        timeout
    ) {
        const value = Number(timeout);

        if (Number.isFinite(value) && value> 0)
        {
            CONFIG.timeout = value;
        }
    };

    API.configure = function (options) {
        if (!options || typeof options !== 'object') {
            return API;
        }

        if (Object.prototype.hasOwnProperty.call(options, 'baseURL')) {
            API.setBaseURL(options.baseURL);
        }

        if (Object.prototype.hasOwnProperty.call(options, 'tokenKey')) {
            API.setTokenKey(options.tokenKey);
        }

        if (Object.prototype.hasOwnProperty.call(options, 'userKey')) {
            API.setUserKey(options.userKey);
        }

        if (Object.prototype.hasOwnProperty.call(options, 'timeout')) {
            API.setTimeout(options.timeout)
        }

        if (Object.prototype.hasOwnProperty.call(options,'redirectOnUnauthorized')) {
            CONFIG.redirectOnUnauthorized = Boolean(options.redirectOnUnauthorized);
        }

        if (Object.prototype.hasOwnProperty.call(options, 'loginPage')) {
            CONFIG.loginPage = options.loginPage;
        }

        if (options.defaultHeaders && typeof options.defaultHeaders === 'object') {
            Object.assign(CONFIG.defaultHeaders, options.defaultHeaders);
        }

        return API;
    };

    /* REQUEST STATE */
    API.getActiveRequestCount = function () {
        return state.activeRequests;
    };

    API.isLoading = function () {
        return (
            state.activeRequests > 0
        );
    };

    /* ERROR HELPERS */
    API.isAPIError = function (error) {
        return Boolean(error && error.name === 'APIError');
    };

    API.isUnauthorizedError = function (error) {
        return Boolean(
                error && (
                    error.status === 401 ||
                    error.status === 419 || 
                    error.code === 'UNAUTHORIZED'
                )
            );
        };

    API.isValidationError = function () {
        return Boolean (
            error && 
                (
                    error.status === 400 || 
                    error.status === 422 || 
                    error.code === 'VALIDATION_ERROR' || 
                    error.validationErrors
                )
            );
        };
    
    API.getErrorMessage = function (
        error,
        fallback
        ) {
            fallback = fallback || 'An unexpected error occurred.';

            if (!error) {
                return fallback;
            }

            return (
                error.message || 
                fallback
            );
        };
    
        API.getValidationErrors = function (error) {
            if (!error || !error.validationErrors) {
                return null;
            }
            return error.validationErrors;
        };

    /* EVENT SUPPORT */
    function dispatchAPIEvent(
        eventName,
        detail
    ) {
        try {
            document.dispatchEvent(
                new CustomEvent(
                    eventName,
                    {
                        detail: detail || {}
                    }
                )
            );
        } catch (error) {

        }
    }

    const originalRequest = API.request;

    API.request = async function (method, endpoint, options) {
        const requestId = createRequestId();

        dispatchAPIEvent(
            'api:request:start',
            {
                requestId,
                method,
                endpoint 
            }
        );

        try {
            const result = await originalRequest(
                    method,
                    endpoint,
                    options 
                );
            dispatchAPIEvent(
                'api:request:success',
                {
                    requestId,
                    method,
                    endpoint,
                    data: result
                }
            );

            return result;
        } catch (error) {
            dispatchAPIEvent(
                'api:request:error',
                {
                    requestId,
                    method,
                    endpoint
                }
            );
        }
    };

    /* Rebind HTTP helpers to the wrapped request function. */
    API.get = function (
        endpoint,
        params,
        options
    ) {
        return API.request(
            'GET',
            endpoint,
            Object.assign(
                {},
                options,
                {
                    params: params 
                }
            )
        );
    };

    API.post = function (
        endpoint,
        data,
        options
    ) {
        options = options || {};

        return API.request(
            'POST',
            endpoint,
            Object.assign(
                {},
                options,
                {
                    body: data  
                }
            )
        );
    };

    API.put = function (endpoint, data, options) {
        options = options || {};

        return API.request(
            'PUT',
            endpoint,
            Object.assign(
                {},
                options,
                {
                    body: data 
                }
            )
        );
    };

    API.patch = function (endpoint, data, options) {
        options = options || {};

        return API.request(
            'PATCH',
            endpoint,
            Object.assign(
                {},
                options,
                {
                    body: data 
                }
            )
        );
    };

    API.delete = function (endpoint, data, options) {
        options = options || {};

        return API.request(
            'DELETE',
            endpoint,
            Object.assign(
                {},
                options,
                {
                    body: data
                }
            )
        );
    };

    API.postForm = function (endpoint, formData, options) {
        options = options || {};

        return API.request(
            'POST',
            endpoint,
            Object.assign(
                {},
                options,
                {
                    body: formData
                }
            )
        );
    };

    API.putForm = function (endpoint, formData, options) {
        options = opttions || {};

        return API.request(
            'PUT',
            endpoint,
            Object.assign(
                {},
                options,
                {
                    body: formData 
                }
            )
        );
    };

    /* PUBLIC CONFIGURATION */
    API.config = CONFIG;

    /* GLOBAL EXPORT */
    window.API = API;
}) (window, document);

