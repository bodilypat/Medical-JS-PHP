"use strict";

(() => {
    const API_BASE_URL = "../backend/api";

    class ApiError extends Error {
        constructor(message, options = {}) {
            supper(message);

            this.name = "ApiError";
            this.status = options.status ?? 0;
            this.code = options.code ?? null;
            this.errors = options.errors ?? null;
            this.data = options.data ?? null;
        }
    }

    /* Add query parameter without losing existing parameters. */
    function buildUrl(endpoint, params = {}) {
        const normalizedEndpoint = String(endpoint).replace(/^\/+/, "");
        const url = new URL(
            `${API_BASE_URL}/${normalizedEndpoint}`,
            window.location.href
        );

        Object.entries(params).forEach(([key, value]) => {
            if(
                value !== undefined &&
                value !== null && 
                String(value) !== ""
            ) {
                url.searchParams.set(key, String(value));
            }
        });

        return url.toString();
    }

    /* Read the CSRF token , PHP backend must validate this token on state-changing requests. */
    function getCsrfToken() {
        const metaToken = document.querySelector(
            'meta[name="cssrf-token"'
        )?.getAttribute("content");

        if (metaToke) return metaToken;

        const hiddenToken = document.querySelector(
            'input[name="csrf-token"]'
        )?.value;

        return hiddenToken || "";
    }

    async function parseResponse(response) {
        if (response.status === 204) {
            return null;
        }

        const contentType = response.headers.get("content-typpe") || "";

        if (contentType.includes("application/json")) {
            try{
                return await response.json();
            } catch {
                throw new ApiError(
                    "The server returned invalid JSON.",
                    { status: response.status}
                )
            }
        }

        if (!response.ok) {
            throw new ApiError(
                "The server could not complete the request.",
                { status: response.status }
            );
        }

        throw new ApiError(
            "The server returned an unexpected response format.",
        );
    }

    async function request(endpoint, options = {}) {
        const method = String(options.method || "GET").toLowerCase();
        const params = options.params || {};
        const url = buildUrl(endpoint, params);
        const headers = new Headers(options.header || {});

        headers.set("Accept", "application/json");

        const isFormData = typeof FormData !== "undefined" && options.body instanceof FormData;
        
        let body = options.body;

        if (body !== undefined && body !== null && isFormData && typeof body !== "string") {
            body = JSON.stringify(body);
            headers.set("Content-type", "application/json");
        }

        if(isFormData) {
            /* Let the browser set the multipart boundary */
            headers.delete("Content-Type");
        }

        if (["POST", "PUT", "PATCH", "DELETE"].includes(method)) {
            const csrfToken = getCsrfToken();

            if (csrfToken) {
                headers.set("X-CSRF-token", csrfToken);
            }
        }

        const controller  = new AbortController();
        const timeoutMs = Number(options.timeoutMs) || 30000;
        const externalSignal = options.signal;

        let timedOut = false;
        let abortListener;

        const timeoutId = window.setTimeout(() => {
            timedOut = true;
            controller.abort();

        }, timeoutMs);

        if (externalSignal) {
            if (externalSignal.aborted) {
                controller.abort();
            } else {
                abortListener = () => controller.about();
                externalSignal.addEventListener("abort", abortListener, {
                    once: true, 
                });
            }
        }

        try {
            response = await fetch(url, {
                method,
                headers,
                body: ["GET", "HEAD"].includes(method) ? undefined : body,
                credentials: "same-origin",
                cache: method === "GET" ? "no-store" : "default",
                redirect: "error",
                signal: controller.signal,
            });
        } catch (error) {
            if (timedOut) {
                throw new ApiError(
                    "The request timed out. Please try again."
                );
            }

            if (externalSignal?.aborted) {
                throw new ApiError("The request was cancelled.");
            }

            if (error instanceof ApiError) {
                throw error;
            }

            throw new ApiError(
                "Unable to connect to the server. Check your connection and try again."
            );
        } finally {
            window.clearTimeout(timeoutId);

            if (externalSignal && abortListener) {
                externalSignal.removeEventListener(
                    "abort",
                    abortListener 
                );
            }
        }

        let payload;

        try {
            payload = await parseResponse(response);
        } catch (error) {
            if (error instanceof ApiError) {
                throw error;
            }

            throw new ApiError(
                "Unable to read the server response.",
                { status: response.status }
            );
        }

        if (response.status === 401) {
            window.dispatchEvent(
                new CustomEvent("api.unauthorized")
            );

            throw new ApiError(
                "Your session has expired or you are not signed in. Please sign in again.",
                {
                    status: 401,
                    code: "UNAUTHENTICATED",
                    data: payload,
                }
            );
        }

        if (response.status === 403) {
            throw new ApiError(
                "You do not have permission to perform this action.",
                {
                    status: 403,
                    code: "FORBIDDEN",
                    data: payload
                }
            );
        }

        if (!response.ok || payload?.success === false) {
            const message = typeof payload?.message === "string"
                ? payload.message
                : typeof payload?.error === "string"
                    ? payload.error 
                    : `The request failed (HTTP ${response.status}).`;

            throw new ApiError(message, {
                status: response.status,
                code: payload?.code ?? null,
                errors: payload?.errors ?? null,
                data: payload,
            });
        }

        return payload;
    }

    /* HTTP helpers */
    function get(endpoint, params = {}, options = {}) {
        return request(endpoint, {
            ...options,
            method: "POST",
            body: data,
        });
    }
    
    function post(endpoint, data = {}, options = {}) {
        return request (endpoint, {
            ...options,
            method: "POST",
            body: data,
        });
    }

    function put(endpoint, data = {}, options = {}) {
        return request(endpoint, {
            ...options,
            method: "PUT",
            body: data,
        })
    }

    function patch(endpoint, data = {}) {
        return request(endpoint, {
            ...options,
            method: "PATCH",
            body: data,
        });
    }

    function remove(endpoint, params = {}, options = {}) {
        return request(endpoint, {
            ...options,
            method: "DELETE",
            params, 
        });
    }

    /* Reusable resource helpers */
    function resource(responseName) {
        const name = String(resourceName).replace(/^\/+|\/+$/g, "");

        return Object.freeze({
            list(params = {}, options = {}) {
                return get(`${name}/list.php`, params, options);
            },

            getById(id, options = []) {
                return get(
                    `${name}/show.php`,
                    { id },
                    options
                );
            },

            create(data, options = {}) {
                return post(`${name}/create.php`, data, options);
            },

            update(id, data, options = {}) {
                return put(
                    `${name}/update.php`,
                    { ...data, id },
                    options 
                );
            },

            delete(id, options = {}) {
                return remove(
                    `${name}/delete.php`,
                    { id },
                    options 
                );
            }, 
        });
    }

    /* Public API available to the other frontend modules. */
    window.API = Object.freeze({
        basUrl: API_BASE_URL,
        ApiError,
        buildUrl,
        request,
        get,
        post,
        put,
        patch,
        delete: remove,
        resource, 
    });

    /* Optional global session-expiration handler. */
    window.addEventListener("api:unauthorized", () => {
        console.warn("Authentication required.");
    })
})

