/**
 * Frontend/js/reports.js
 * Medical Management System
 *
 * Reporting, dashboard analytics, exports, and report generation.
 *
 * Expected API endpoints:
 * GET  /reports/list.php
 * GET  /reports/get.php?id=123
 * POST /reports/create.php
 * POST /reports/update.php
 * POST /reports/delete.php
 * GET  /reports/generate.php
 * GET  /reports/export.php
 */

(function () {
    'use strict';

    const state = {
        reports: [],
        currentReport: null,

        currentPage: 1,
        perPage: 10,
        total: 0,

        search: '',
        reportType: '',
        category: '',
        status: '',
        dateFrom: '',
        dateTo: '',

        loading: false,

        generatedReport: null,
        reportResults: null
    };

    const endpoints = {
        list: '/reports/list.php',
        get: '/reports/get.php',
        create: '/reports/create.php',
        update: '/reports/update.php',
        delete: '/reports/delete.php',
        generate: '/reports/generate.php',
        export: '/reports/export.php'
    };

    /* =========================================================
     * Utility functions
     * ======================================================= */

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

    function getElement(selector) {
        return document.querySelector(selector);
    }

    function getValue(element) {
        if (!element) {
            return '';
        }

        return element.value !== undefined
            ? element.value.trim()
            : '';
    }

    function showMessage(
        message,
        type = 'info',
        selector = '#reportsMessage'
    ) {
        const element = getElement(selector);

        if (!element) {
            return;
        }

        element.textContent = message || '';
        element.className = `message message-${type}`;
        element.hidden = !message;
    }

    function clearMessage(selector = '#reportsMessage') {
        const element = getElement(selector);

        if (!element) {
            return;
        }

        element.textContent = '';
        element.hidden = true;
    }

    function setLoading(isLoading) {
        state.loading = Boolean(isLoading);

        document
            .querySelectorAll('[data-reports-loading]')
            .forEach(element => {
                element.hidden = !state.loading;
            });

        document
            .querySelectorAll('[data-reports-submit]')
            .forEach(button => {
                button.disabled = state.loading;
            });
    }

    function capitalize(value) {
        if (!value) {
            return '';
        }

        return String(value)
            .replace(/[_-]+/g, ' ')
            .replace(/\s+/g, ' ')
            .replace(/\b\w/g, char => char.toUpperCase());
    }

    function formatDate(value) {
        if (!value) {
            return '';
        }

        const date = new Date(value);

        if (Number.isNaN(date.getTime())) {
            return escapeHtml(value);
        }

        return date.toLocaleDateString();
    }

    function formatDateTime(value) {
        if (!value) {
            return '';
        }

        const date = new Date(value);

        if (Number.isNaN(date.getTime())) {
            return escapeHtml(value);
        }

        return date.toLocaleString();
    }

    function formatNumber(value, decimals = 0) {
        const number = Number(value);

        if (!Number.isFinite(number)) {
            return '0';
        }

        return number.toLocaleString(undefined, {
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals
        });
    }

    function formatCurrency(
        value,
        currency = 'USD'
    ) {
        const amount = Number(value);

        if (!Number.isFinite(amount)) {
            return '$0.00';
        }

        try {
            return new Intl.NumberFormat(undefined, {
                style: 'currency',
                currency
            }).format(amount);
        } catch (error) {
            return `$${amount.toFixed(2)}`;
        }
    }

    function getResponseData(response) {
        if (!response) {
            return {};
        }

        return response.data ?? response;
    }

    function getReportId(report) {
        if (!report) {
            return null;
        }

        return (
            report.id ??
            report.report_id ??
            report.reportId ??
            null
        );
    }

    function getReportName(report) {
        if (!report) {
            return '—';
        }

        return (
            report.name ??
            report.report_name ??
            report.title ??
            `Report #${getReportId(report) || '—'}`
        );
    }

    function getReportStatus(report) {
        if (!report) {
            return '';
        }

        return (
            report.status ??
            report.report_status ??
            ''
        );
    }

    function getStatusClass(status) {
        const normalized = String(status || '')
            .toLowerCase()
            .replace(/\s+/g, '-');

        return `status-${normalized || 'unknown'}`;
    }

    /* =========================================================
     * Report CRUD operations
     * ======================================================= */

    async function list(options = {}) {
        const page = Number(
            options.page ?? state.currentPage
        );

        const limit = Number(
            options.limit ?? state.perPage
        );

        const params = new URLSearchParams();

        params.set('page', page);
        params.set('limit', limit);

        const filters = {
            search: options.search ?? state.search,
            report_type:
                options.report_type ??
                options.reportType ??
                state.reportType,
            category:
                options.category ??
                state.category,
            status:
                options.status ??
                state.status,
            date_from:
                options.date_from ??
                options.dateFrom ??
                state.dateFrom,
            date_to:
                options.date_to ??
                options.dateTo ??
                state.dateTo
        };

        Object.entries(filters).forEach(
            ([key, value]) => {
                if (
                    value !== undefined &&
                    value !== null &&
                    value !== ''
                ) {
                    params.set(key, value);
                }
            }
        );

        setLoading(true);

        try {
            const response = await API.get(
                `${endpoints.list}?${params.toString()}`
            );

            const data = getResponseData(response);

            let reports = [];

            if (Array.isArray(data)) {
                reports = data;
            } else if (
                Array.isArray(data.reports)
            ) {
                reports = data.reports;
            } else if (
                Array.isArray(data.items)
            ) {
                reports = data.items;
            } else if (
                Array.isArray(response.reports)
            ) {
                reports = response.reports;
            }

            state.reports = reports;

            state.currentPage = Number(
                data.page ??
                response.page ??
                page
            );

            state.perPage = Number(
                data.limit ??
                data.per_page ??
                response.limit ??
                limit
            );

            state.total = Number(
                data.total ??
                response.total ??
                reports.length
            );

            renderReportTable();
            renderPagination();

            return response;
        } catch (error) {
            console.error(
                'Reports list error:',
                error
            );

            state.reports = [];
            state.total = 0;

            renderReportTable();
            renderPagination();

            showMessage(
                error.message ||
                    'Unable to load reports.',
                'error'
            );

            throw error;
        } finally {
            setLoading(false);
        }
    }

    async function get(id) {
        if (!id) {
            throw new Error(
                'Report ID is required.'
            );
        }

        const response = await API.get(
            `${endpoints.get}?id=${encodeURIComponent(id)}`
        );

        const data = getResponseData(response);

        const report =
            data.report ??
            data;

        state.currentReport = report;

        return report;
    }

    async function create(reportData) {
        const validation =
            validateReport(reportData);

        if (!validation.valid) {
            throw new Error(
                validation.errors.join(' ')
            );
        }

        setLoading(true);

        try {
            const response = await API.post(
                endpoints.create,
                normalizeReportData(reportData)
            );

            showMessage(
                'Report created successfully.',
                'success'
            );

            await list();

            return response;
        } catch (error) {
            console.error(
                'Report create error:',
                error
            );

            showMessage(
                error.message ||
                    'Unable to create report.',
                'error'
            );

            throw error;
        } finally {
            setLoading(false);
        }
    }

    async function update(
        id,
        reportData
    ) {
        if (!id) {
            throw new Error(
                'Report ID is required.'
            );
        }

        const validation =
            validateReport(
                reportData,
                true
            );

        if (!validation.valid) {
            throw new Error(
                validation.errors.join(' ')
            );
        }

        const payload =
            normalizeReportData(
                reportData
            );

        payload.id = id;
        payload.report_id = id;

        setLoading(true);

        try {
            const response = await API.post(
                endpoints.update,
                payload
            );

            showMessage(
                'Report updated successfully.',
                'success'
            );

            await list();

            return response;
        } catch (error) {
            console.error(
                'Report update error:',
                error
            );

            showMessage(
                error.message ||
                    'Unable to update report.',
                'error'
            );

            throw error;
        } finally {
            setLoading(false);
        }
    }

    async function remove(id) {
        if (!id) {
            throw new Error(
                'Report ID is required.'
            );
        }

        setLoading(true);

        try {
            const response = await API.post(
                endpoints.delete,
                {
                    id,
                    report_id: id
                }
            );

            showMessage(
                'Report deleted successfully.',
                'success'
            );

            await list();

            return response;
        } catch (error) {
            console.error(
                'Report delete error:',
                error
            );

            showMessage(
                error.message ||
                    'Unable to delete report.',
                'error'
            );

            throw error;
        } finally {
            setLoading(false);
        }
    }

    /* =========================================================
     * Generate reports
     * ======================================================= */

    async function generate(reportData = {}) {
        const validation =
            validateReportGeneration(
                reportData
            );

        if (!validation.valid) {
            throw new Error(
                validation.errors.join(' ')
            );
        }

        const params = new URLSearchParams();

        Object.entries(
            normalizeReportGenerationData(
                reportData
            )
        ).forEach(
            ([key, value]) => {
                if (
                    value !== undefined &&
                    value !== null &&
                    value !== ''
                ) {
                    if (
                        Array.isArray(value) ||
                        typeof value === 'object'
                    ) {
                        params.set(
                            key,
                            JSON.stringify(value)
                        );
                    } else {
                        params.set(
                            key,
                            value
                        );
                    }
                }
            }
        );

        setLoading(true);

        try {
            const response = await API.get(
                `${endpoints.generate}?${params.toString()}`
            );

            const data =
                getResponseData(response);

            state.generatedReport =
                data.report ??
                data;

            state.reportResults =
                data.results ??
                data.data ??
                state.generatedReport;

            renderGeneratedReport(
                state.reportResults
            );

            showMessage(
                'Report generated successfully.',
                'success'
            );

            return response;
        } catch (error) {
            console.error(
                'Report generation error:',
                error
            );

            showMessage(
                error.message ||
                    'Unable to generate report.',
                'error'
            );

            throw error;
        } finally {
            setLoading(false);
        }
    }

    /* =========================================================
     * Export reports
     * ======================================================= */

    async function exportReport(
        reportData = {}
    ) {
        const normalized =
            normalizeReportGenerationData(
                reportData
            );

        const params = new URLSearchParams();

        Object.entries(normalized).forEach(
            ([key, value]) => {
                if (
                    value !== undefined &&
                    value !== null &&
                    value !== ''
                ) {
                    if (
                        Array.isArray(value) ||
                        typeof value === 'object'
                    ) {
                        params.set(
                            key,
                            JSON.stringify(value)
                        );
                    } else {
                        params.set(
                            key,
                            value
                        );
                    }
                }
            }
        );

        const url =
            `${endpoints.export}?${params.toString()}`;

        /*
         * The export endpoint is intentionally opened
         * through the browser so the server can return
         * a CSV, XLSX, PDF, or other downloadable file.
         *
         * API authentication should be handled by the
         * application's normal authentication mechanism.
         */

        window.open(
            url,
            '_blank',
            'noopener,noreferrer'
        );

        return url;
    }

    /* =========================================================
     * Search and filtering
     * ======================================================= */

    async function search(term) {
        state.search =
            String(term || '').trim();

        state.currentPage = 1;

        return list({
            page: 1,
            search: state.search
        });
    }

    async function filter(filters = {}) {
        state.currentPage = 1;

        state.reportType =
            filters.report_type ??
            filters.reportType ??
            '';

        state.category =
            filters.category ??
            '';

        state.status =
            filters.status ??
            '';

        state.dateFrom =
            filters.date_from ??
            filters.dateFrom ??
            '';

        state.dateTo =
            filters.date_to ??
            filters.dateTo ??
            '';

        return list({
            page: 1
        });
    }

    async function clearFilters() {
        state.search = '';
        state.reportType = '';
        state.category = '';
        state.status = '';
        state.dateFrom = '';
        state.dateTo = '';
        state.currentPage = 1;

        clearFilterForm();

        return list({
            page: 1
        });
    }

    function clearFilterForm() {
        const selectors = [
            '#reportsSearch',
            '#reportTypeFilter',
            '#reportCategoryFilter',
            '#reportStatusFilter',
            '#reportDateFrom',
            '#reportDateTo'
        ];

        selectors.forEach(selector => {
            const element =
                getElement(selector);

            if (element) {
                element.value = '';
            }
        });
    }

    /* =========================================================
     * Pagination
     * ======================================================= */

    async function goToPage(page) {
        const totalPages =
            Math.max(
                1,
                Math.ceil(
                    state.total /
                    state.perPage
                )
            );

        const targetPage =
            Number(page);

        if (
            !Number.isInteger(
                targetPage
            ) ||
            targetPage < 1 ||
            targetPage > totalPages
        ) {
            return;
        }

        state.currentPage =
            targetPage;

        return list({
            page: targetPage
        });
    }

    async function nextPage() {
        return goToPage(
            state.currentPage + 1
        );
    }

    async function previousPage() {
        return goToPage(
            state.currentPage - 1
        );
    }

    /* =========================================================
     * Validation
     * ======================================================= */

    function validateReport(
        data = {},
        isUpdate = false
    ) {
        const errors = [];

        if (
            !isUpdate &&
            !data.name &&
            !data.report_name &&
            !data.title
        ) {
            errors.push(
                'Report name is required.'
            );
        }

        if (
            data.report_type !== undefined &&
            data.report_type !== '' &&
            typeof data.report_type !== 'string'
        ) {
            errors.push(
                'Report type is invalid.'
            );
        }

        if (
            data.date_from &&
            Number.isNaN(
                new Date(
                    data.date_from
                ).getTime()
            )
        ) {
            errors.push(
                'Start date is invalid.'
            );
        }

        if (
            data.date_to &&
            Number.isNaN(
                new Date(
                    data.date_to
                ).getTime()
            )
        ) {
            errors.push(
                'End date is invalid.'
            );
        }

        if (
            data.date_from &&
            data.date_to &&
            new Date(data.date_from) >
                new Date(data.date_to)
        ) {
            errors.push(
                'Start date cannot be later than end date.'
            );
        }

        return {
            valid:
                errors.length === 0,
            errors
        };
    }

    function validateReportGeneration(
        data = {}
    ) {
        const errors = [];

        if (
            !data.report_type &&
            !data.type &&
            !data.reportType
        ) {
            errors.push(
                'Report type is required.'
            );
        }

        const dateFrom =
            data.date_from ??
            data.dateFrom ??
            '';

        const dateTo =
            data.date_to ??
            data.dateTo ??
            '';

        if (
            dateFrom &&
            Number.isNaN(
                new Date(
                    dateFrom
                ).getTime()
            )
        ) {
            errors.push(
                'Start date is invalid.'
            );
        }

        if (
            dateTo &&
            Number.isNaN(
                new Date(
                    dateTo
                ).getTime()
            )
        ) {
            errors.push(
                'End date is invalid.'
            );
        }

        if (
            dateFrom &&
            dateTo &&
            new Date(dateFrom) >
                new Date(dateTo)
        ) {
            errors.push(
                'Start date cannot be later than end date.'
            );
        }

        return {
            valid:
                errors.length === 0,
            errors
        };
    }

    /* =========================================================
     * Normalization
     * ======================================================= */

    function normalizeReportData(
        data = {}
    ) {
        return {
            name:
                data.name ??
                data.report_name ??
                data.title ??
                '',

            report_type:
                data.report_type ??
                data.type ??
                '',

            category:
                data.category ??
                '',

            description:
                data.description ??
                '',

            status:
                data.status ??
                'active',

            parameters:
                data.parameters ??
                {},

            filters:
                data.filters ??
                {},

            date_from:
                data.date_from ??
                data.dateFrom ??
                '',

            date_to:
                data.date_to ??
                data.dateTo ??
                '',

            notes:
                data.notes ??
                ''
        };
    }

    function normalizeReportGenerationData(
        data = {}
    ) {
        return {
            report_type:
                data.report_type ??
                data.type ??
                data.reportType ??
                '',

            category:
                data.category ??
                '',

            date_from:
                data.date_from ??
                data.dateFrom ??
                '',

            date_to:
                data.date_to ??
                data.dateTo ??
                '',

            patient_id:
                data.patient_id ??
                data.patientId ??
                '',

            doctor_id:
                data.doctor_id ??
                data.doctorId ??
                '',

            appointment_id:
                data.appointment_id ??
                data.appointmentId ??
                '',

            status:
                data.status ??
                '',

            payment_status:
                data.payment_status ??
                data.paymentStatus ??
                '',

            department:
                data.department ??
                '',

            format:
                data.format ??
                '',

            parameters:
                data.parameters ??
                {},

            filters:
                data.filters ??
                {}
        };
    }

    /* =========================================================
     * Form operations
     * ======================================================= */

    function formToObject(form) {
        if (!form) {
            throw new Error(
                'Report form was not found.'
            );
        }

        const formData =
            new FormData(form);

        const data = {};

        formData.forEach(
            (value, key) => {
                data[key] =
                    typeof value === 'string'
                        ? value.trim()
                        : value;
            }
        );

        const jsonFields = [
            'parameters',
            'filters'
        ];

        jsonFields.forEach(
            field => {
                if (
                    data[field] &&
                    typeof data[field] === 'string'
                ) {
                    try {
                        data[field] =
                            JSON.parse(
                                data[field]
                            );
                    } catch (error) {
                        throw new Error(
                            `${capitalize(field)} must contain valid JSON.`
                        );
                    }
                }
            }
        );

        return data;
    }

    async function submitCreateForm(
        form
    ) {
        const targetForm =
            form ||
            getElement(
                '#createReportForm'
            ) ||
            getElement(
                '#reportForm'
            );

        if (!targetForm) {
            throw new Error(
                'Create report form was not found.'
            );
        }

        const data =
            formToObject(
                targetForm
            );

        return create(data);
    }

    async function submitUpdateForm(
        form
    ) {
        const targetForm =
            form ||
            getElement(
                '#editReportForm'
            );

        if (!targetForm) {
            throw new Error(
                'Edit report form was not found.'
            );
        }

        const data =
            formToObject(
                targetForm
            );

        const id =
            data.id ??
            data.report_id ??
            targetForm.dataset.id;

        if (!id) {
            throw new Error(
                'Report ID is required.'
            );
        }

        return update(
            id,
            data
        );
    }

    async function submitGenerateForm(
        form
    ) {
        const targetForm =
            form ||
            getElement(
                '#generateReportForm'
            ) ||
            getElement(
                '#reportGenerationForm'
            );

        if (!targetForm) {
            throw new Error(
                'Report generation form was not found.'
            );
        }

        const data =
            formToObject(
                targetForm
            );

        return generate(data);
    }

    /* =========================================================
     * Confirmation operations
     * ======================================================= */

    async function deleteWithConfirmation(
        id
    ) {
        if (!id) {
            return false;
        }

        const confirmed =
            window.confirm(
                'Are you sure you want to delete this report?'
            );

        if (!confirmed) {
            return false;
        }

        await remove(id);

        return true;
    }

    /* =========================================================
     * Report rendering
     * ======================================================= */

    function renderReportTable(
        reports = state.reports,
        selector = '#reportsTableBody'
    ) {
        const tbody =
            getElement(selector);

        if (!tbody) {
            return;
        }

        if (
            !Array.isArray(reports) ||
            reports.length === 0
        ) {
            tbody.innerHTML = `
                <tr>
                    <td
                        colspan="8"
                        class="empty-state"
                    >
                        No reports found.
                    </td>
                </tr>
            `;

            return;
        }

        tbody.innerHTML =
            reports
                .map(report => {
                    const id =
                        getReportId(
                            report
                        );

                    const status =
                        getReportStatus(
                            report
                        );

                    return `
                        <tr
                            data-report-id="${escapeHtml(id)}"
                        >
                            <td>
                                ${escapeHtml(id)}
                            </td>

                            <td>
                                ${escapeHtml(
                                    getReportName(
                                        report
                                    )
                                )}
                            </td>

                            <td>
                                ${escapeHtml(
                                    capitalize(
                                        report.report_type ??
                                        report.type ??
                                        '—'
                                    )
                                )}
                            </td>

                            <td>
                                ${escapeHtml(
                                    capitalize(
                                        report.category ??
                                        '—'
                                    )
                                )}
                            </td>

                            <td>
                                ${escapeHtml(
                                    report.date_from
                                        ? formatDate(
                                            report.date_from
                                        )
                                        : '—'
                                )}
                            </td>

                            <td>
                                ${escapeHtml(
                                    report.date_to
                                        ? formatDate(
                                            report.date_to
                                        )
                                        : '—'
                                )}
                            </td>

                            <td>
                                <span
                                    class="status-badge ${getStatusClass(
                                        status
                                    )}"
                                >
                                    ${escapeHtml(
                                        capitalize(
                                            status ||
                                            'Active'
                                        )
                                    )}
                                </span>
                            </td>

                            <td class="table-actions">
                                <button
                                    type="button"
                                    class="btn btn-sm"
                                    data-action="view-report"
                                    data-id="${escapeHtml(id)}"
                                >
                                    View
                                </button>

                                <button
                                    type="button"
                                    class="btn btn-sm"
                                    data-action="generate-report"
                                    data-id="${escapeHtml(id)}"
                                >
                                    Generate
                                </button>

                                <button
                                    type="button"
                                    class="btn btn-sm"
                                    data-action="edit-report"
                                    data-id="${escapeHtml(id)}"
                                >
                                    Edit
                                </button>

                                <button
                                    type="button"
                                    class="btn btn-sm"
                                    data-action="export-report"
                                    data-id="${escapeHtml(id)}"
                                >
                                    Export
                                </button>

                                <button
                                    type="button"
                                    class="btn btn-sm btn-danger"
                                    data-action="delete-report"
                                    data-id="${escapeHtml(id)}"
                                >
                                    Delete
                                </button>
                            </td>
                        </tr>
                    `;
                })
                .join('');
    }

    function renderPagination(
        total = state.total,
        page = state.currentPage,
        limit = state.perPage,
        selector = '#reportsPagination'
    ) {
        const container =
            getElement(selector);

        if (!container) {
            return;
        }

        const totalPages =
            Math.max(
                1,
                Math.ceil(
                    Number(total) /
                    Number(limit)
                )
            );

        if (totalPages <= 1) {
            container.innerHTML = '';
            return;
        }

        const buttons = [];

        buttons.push(`
            <button
                type="button"
                class="pagination-btn"
                data-page="${page - 1}"
                ${page <= 1 ? 'disabled' : ''}
            >
                Previous
            </button>
        `);

        const maxVisiblePages = 7;

        let startPage =
            Math.max(
                1,
                page -
                    Math.floor(
                        maxVisiblePages / 2
                    )
            );

        let endPage =
            Math.min(
                totalPages,
                startPage +
                    maxVisiblePages -
                    1
            );

        if (
            endPage -
                startPage +
                1 <
            maxVisiblePages
        ) {
            startPage =
                Math.max(
                    1,
                    endPage -
                        maxVisiblePages +
                        1
                );
        }

        if (startPage > 1) {
            buttons.push(`
                <button
                    type="button"
                    class="pagination-btn"
                    data-page="1"
                >
                    1
                </button>
            `);

            if (startPage > 2) {
                buttons.push(`
                    <span class="pagination-ellipsis">
                        …
                    </span>
                `);
            }
        }

        for (
            let i = startPage;
            i <= endPage;
            i += 1
        ) {
            buttons.push(`
                <button
                    type="button"
                    class="pagination-btn ${
                        i === page
                            ? 'active'
                            : ''
                    }"
                    data-page="${i}"
                    ${
                        i === page
                            ? 'aria-current="page"'
                            : ''
                    }
                >
                    ${i}
                </button>
            `);
        }

        if (endPage < totalPages) {
            if (
                endPage <
                totalPages - 1
            ) {
                buttons.push(`
                    <span class="pagination-ellipsis">
                        …
                    </span>
                `);
            }

            buttons.push(`
                <button
                    type="button"
                    class="pagination-btn"
                    data-page="${totalPages}"
                >
                    ${totalPages}
                </button>
            `);
        }

        buttons.push(`
            <button
                type="button"
                class="pagination-btn"
                data-page="${page + 1}"
                ${
                    page >= totalPages
                        ? 'disabled'
                        : ''
                }
            >
                Next
            </button>
        `);

        container.innerHTML =
            buttons.join('');
    }

    /* =========================================================
     * Report details
     * ======================================================= */

    async function showDetails(
        id,
        containerSelector = '#reportDetails'
    ) {
        const container =
            getElement(
                containerSelector
            );

        if (!container) {
            return null;
        }

        try {
            const report =
                await get(id);

            container.innerHTML = `
                <div class="report-details">

                    <div class="detail-row">
                        <strong>ID:</strong>
                        <span>
                            ${escapeHtml(
                                getReportId(
                                    report
                                )
                            )}
                        </span>
                    </div>

                    <div class="detail-row">
                        <strong>Name:</strong>
                        <span>
                            ${escapeHtml(
                                getReportName(
                                    report
                                )
                            )}
                        </span>
                    </div>

                    <div class="detail-row">
                        <strong>Type:</strong>
                        <span>
                            ${escapeHtml(
                                capitalize(
                                    report.report_type ??
                                    report.type ??
                                    '—'
                                )
                            )}
                        </span>
                    </div>

                    <div class="detail-row">
                        <strong>Category:</strong>
                        <span>
                            ${escapeHtml(
                                capitalize(
                                    report.category ??
                                    '—'
                                )
                            )}
                        </span>
                    </div>

                    <div class="detail-row">
                        <strong>Description:</strong>
                        <span>
                            ${escapeHtml(
                                report.description ??
                                '—'
                            )}
                        </span>
                    </div>

                    <div class="detail-row">
                        <strong>Start Date:</strong>
                        <span>
                            ${formatDate(
                                report.date_from
                            )}
                        </span>
                    </div>

                    <div class="detail-row">
                        <strong>End Date:</strong>
                        <span>
                            ${formatDate(
                                report.date_to
                            )}
                        </span>
                    </div>

                    <div class="detail-row">
                        <strong>Status:</strong>
                        <span
                            class="status-badge ${getStatusClass(
                                getReportStatus(
                                    report
                                )
                            )}"
                        >
                            ${escapeHtml(
                                capitalize(
                                    getReportStatus(
                                        report
                                    ) ||
                                    'Active'
                                )
                            )}
                        </span>
                    </div>

                    <div class="detail-row">
                        <strong>Created:</strong>
                        <span>
                            ${formatDateTime(
                                report.created_at
                            )}
                        </span>
                    </div>

                    <div class="detail-row">
                        <strong>Updated:</strong>
                        <span>
                            ${formatDateTime(
                                report.updated_at
                            )}
                        </span>
                    </div>

                    ${
                        report.notes
                            ? `
                                <div class="detail-row">
                                    <strong>Notes:</strong>
                                    <span>
                                        ${escapeHtml(
                                            report.notes
                                        )}
                                    </span>
                                </div>
                            `
                            : ''
                    }

                </div>
            `;

            container.hidden = false;

            return report;
        } catch (error) {
            console.error(
                'Report details error:',
                error
            );

            showMessage(
                error.message ||
                    'Unable to load report details.',
                'error'
            );

            throw error;
        }
    }

    async function loadReportIntoForm(
        id,
        formSelector = '#editReportForm'
    ) {
        const form =
            getElement(
                formSelector
            );

        if (!form) {
            throw new Error(
                'Report edit form was not found.'
            );
        }

        const report =
            await get(id);

        const values = {
            id:
                getReportId(report),

            report_id:
                getReportId(report),

            name:
                report.name ??
                report.report_name ??
                report.title ??
                '',

            report_name:
                report.report_name ??
                report.name ??
                '',

            title:
                report.title ??
                report.name ??
                '',

            report_type:
                report.report_type ??
                report.type ??
                '',

            category:
                report.category ??
                '',

            description:
                report.description ??
                '',

            status:
                report.status ??
                '',

            date_from:
                report.date_from ??
                '',

            date_to:
                report.date_to ??
                '',

            notes:
                report.notes ??
                ''
        };

        Object.entries(values)
            .forEach(
                ([field, value]) => {
                    const input =
                        form.querySelector(
                            `[name="${field}"]`
                        );

                    if (!input) {
                        return;
                    }

                    input.value =
                        value ?? '';
                }
            );

        const parameters =
            form.querySelector(
                '[name="parameters"]'
            );

        if (parameters) {
            parameters.value =
                report.parameters
                    ? JSON.stringify(
                        report.parameters
                    )
                    : '';
        }

        const filters =
            form.querySelector(
                '[name="filters"]'
            );

        if (filters) {
            filters.value =
                report.filters
                    ? JSON.stringify(
                        report.filters
                    )
                    : '';
        }

        form.dataset.id =
            getReportId(report) || '';

        return report;
    }

    /* =========================================================
     * Generated report rendering
     * ======================================================= */

    function renderGeneratedReport(
        results,
        selector = '#generatedReport'
    ) {
        const container =
            getElement(selector);

        if (!container) {
            return;
        }

        if (
            results === null ||
            results === undefined
        ) {
            container.innerHTML = `
                <div class="empty-state">
                    No report results returned.
                </div>
            `;

            return;
        }

        if (
            Array.isArray(results)
        ) {
            renderArrayResults(
                results,
                container
            );

            return;
        }

        if (
            typeof results === 'object'
        ) {
            renderObjectResults(
                results,
                container
            );

            return;
        }

        container.innerHTML = `
            <div class="report-result-value">
                ${escapeHtml(results)}
            </div>
        `;
    }

    function renderArrayResults(
        results,
        container
    ) {
        if (results.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    No report results found.
                </div>
            `;

            return;
        }

        const columns =
            Object.keys(
                results[0]
            );

        container.innerHTML = `
            <div class="report-results-table-wrapper">
                <table class="table report-results-table">

                    <thead>
                        <tr>
                            ${columns
                                .map(
                                    column => `
                                        <th>
                                            ${escapeHtml(
                                                capitalize(
                                                    column
                                                )
                                            )}
                                        </th>
                                    `
                                )
                                .join('')}
                        </tr>
                    </thead>

                    <tbody>
                        ${results
                            .map(
                                row => `
                                    <tr>
                                        ${columns
                                            .map(
                                                column => `
                                                    <td>
                                                        ${formatReportValue(
                                                            row[column]
                                                        )}
                                                    </td>
                                                `
                                            )
                                            .join('')}
                                    </tr>
                                `
                            )
                            .join('')}
                    </tbody>

                </table>
            </div>
        `;
    }

    function renderObjectResults(
        results,
        container
    ) {
        const entries =
            Object.entries(
                results
            );

        if (entries.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    No report results found.
                </div>
            `;

            return;
        }

        container.innerHTML = `
            <div class="report-result-grid">

                ${entries
                    .map(
                        ([key, value]) => `
                            <div class="report-result-card">

                                <div class="report-result-label">
                                    ${escapeHtml(
                                        capitalize(
                                            key
                                        )
                                    )}
                                </div>

                                <div class="report-result-value">
                                    ${formatReportValue(
                                        value
                                    )}
                                </div>

                            </div>
                        `
                    )
                    .join('')}

            </div>
        `;
    }

    function formatReportValue(
        value
    ) {
        if (
            value === null ||
            value === undefined
        ) {
            return '—';
        }

        if (
            typeof value === 'object'
        ) {
            return `
                <pre class="report-json">${escapeHtml(
                    JSON.stringify(
                        value,
                        null,
                        2
                    )
                )}</pre>
            `;
        }

        if (
            typeof value === 'number'
        ) {
            return escapeHtml(
                formatNumber(
                    value
                )
            );
        }

        return escapeHtml(
            value
        );
    }

    /* =========================================================
     * Event handling
     * ======================================================= */

    function handleTableAction(
        action,
        id
    ) {
        if (!id) {
            return;
        }

        switch (action) {
            case 'view-report':
                showDetails(id)
                    .catch(console.error);
                break;

            case 'edit-report':
                loadReportIntoForm(
                    id,
                    '#editReportForm'
                ).catch(console.error);
                break;

            case 'generate-report':
                get(id)
                    .then(report => {
                        return generate({
                            report_type:
                                report.report_type ??
                                report.type,

                            category:
                                report.category,

                            date_from:
                                report.date_from,

                            date_to:
                                report.date_to,

                            parameters:
                                report.parameters,

                            filters:
                                report.filters
                        });
                    })
                    .catch(console.error);
                break;

            case 'export-report':
                get(id)
                    .then(report => {
                        return exportReport({
                            report_type:
                                report.report_type ??
                                report.type,

                            category:
                                report.category,

                            date_from:
                                report.date_from,

                            date_to:
                                report.date_to,

                            parameters:
                                report.parameters,

                            filters:
                                report.filters,

                            format:
                                report.format ||
                                ''
                        });
                    })
                    .catch(console.error);
                break;

            case 'delete-report':
                deleteWithConfirmation(id)
                    .catch(console.error);
                break;

            default:
                break;
        }
    }

    function bindEvents() {
        const tableBody =
            getElement(
                '#reportsTableBody'
            );

        if (tableBody) {
            tableBody.addEventListener(
                'click',
                event => {
                    const button =
                        event.target.closest(
                            '[data-action]'
                        );

                    if (!button) {
                        return;
                    }

                    handleTableAction(
                        button.dataset.action,
                        button.dataset.id
                    );
                }
            );
        }

        const pagination =
            getElement(
                '#reportsPagination'
            );

        if (pagination) {
            pagination.addEventListener(
                'click',
                event => {
                    const button =
                        event.target.closest(
                            '[data-page]'
                        );

                    if (
                        !button ||
                        button.disabled
                    ) {
                        return;
                    }

                    const page =
                        Number(
                            button.dataset.page
                        );

                    if (page) {
                        goToPage(page)
                            .catch(
                                console.error
                            );
                    }
                }
            );
        }

        const searchInput =
            getElement(
                '#reportsSearch'
            );

        const searchButton =
            getElement(
                '#searchReports'
            );

        if (searchButton) {
            searchButton.addEventListener(
                'click',
                () => {
                    search(
                        getValue(
                            searchInput
                        )
                    ).catch(
                        console.error
                    );
                }
            );
        }

        if (searchInput) {
            searchInput.addEventListener(
                'keydown',
                event => {
                    if (
                        event.key ===
                        'Enter'
                    ) {
                        event.preventDefault();

                        search(
                            getValue(
                                searchInput
                            )
                        ).catch(
                            console.error
                        );
                    }
                }
            );
        }

        const applyFilters =
            getElement(
                '#applyReportFilters'
            );

        if (applyFilters) {
            applyFilters.addEventListener(
                'click',
                () => {
                    filter({
                        report_type:
                            getValue(
                                getElement(
                                    '#reportTypeFilter'
                                )
                            ),

                        category:
                            getValue(
                                getElement(
                                    '#reportCategoryFilter'
                                )
                            ),

                        status:
                            getValue(
                                getElement(
                                    '#reportStatusFilter'
                                )
                            ),

                        date_from:
                            getValue(
                                getElement(
                                    '#reportDateFrom'
                                )
                            ),

                        date_to:
                            getValue(
                                getElement(
                                    '#reportDateTo'
                                )
                            )
                    }).catch(
                        console.error
                    );
                }
            );
        }

        const clearFiltersButton =
            getElement(
                '#clearReportFilters'
            );

        if (clearFiltersButton) {
            clearFiltersButton.addEventListener(
                'click',
                () => {
                    clearFilters()
                        .catch(
                            console.error
                        );
                }
            );
        }

        const perPage =
            getElement(
                '#reportsPerPage'
            );

        if (perPage) {
            perPage.addEventListener(
                'change',
                () => {
                    const value =
                        Number(
                            perPage.value
                        );

                    if (
                        Number.isInteger(
                            value
                        ) &&
                        value > 0
                    ) {
                        state.perPage =
                            value;

                        state.currentPage =
                            1;

                        list({
                            page: 1,
                            limit: value
                        }).catch(
                            console.error
                        );
                    }
                }
            );
        }

        const createForms = [
            '#reportForm',
            '#createReportForm'
        ];

        createForms.forEach(
            selector => {
                const form =
                    getElement(
                        selector
                    );

                if (!form) {
                    return;
                }

                form.addEventListener(
                    'submit',
                    event => {
                        event.preventDefault();

                        submitCreateForm(
                            form
                        )
                            .then(
                                () => {
                                    form.reset();
                                }
                            )
                            .catch(
                                console.error
                            );
                    }
                );
            }
        );

        const updateForm =
            getElement(
                '#editReportForm'
            );

        if (updateForm) {
            updateForm.addEventListener(
                'submit',
                event => {
                    event.preventDefault();

                    submitUpdateForm(
                        updateForm
                    ).catch(
                        console.error
                    );
                }
            );
        }

        const generateForms = [
            '#generateReportForm',
            '#reportGenerationForm'
        ];

        generateForms.forEach(
            selector => {
                const form =
                    getElement(
                        selector
                    );

                if (!form) {
                    return;
                }

                form.addEventListener(
                    'submit',
                    event => {
                        event.preventDefault();

                        submitGenerateForm(
                            form
                        ).catch(
                            console.error
                        );
                    }
                );
            }
        );

        const exportButton =
            getElement(
                '#exportReport'
            );

        if (exportButton) {
            exportButton.addEventListener(
                'click',
                () => {
                    const form =
                        getElement(
                            '#generateReportForm'
                        ) ||
                        getElement(
                            '#reportGenerationForm'
                        );

                    let data = {};

                    if (form) {
                        try {
                            data =
                                formToObject(
                                    form
                                );
                        } catch (error) {
                            showMessage(
                                error.message,
                                'error'
                            );

                            return;
                        }
                    }

                    exportReport(
                        data
                    ).catch(
                        console.error
                    );
                }
            );
        }
    }

    /* =========================================================
     * Initialization
     * ======================================================= */

    async function init(
        options = {}
    ) {
        bindEvents();

        if (
            options.autoLoad === false ||
            document.body?.dataset
                ?.reportsAutoLoad ===
                'false'
        ) {
            return;
        }

        return list();
    }

    /* =========================================================
     * Public API
     * ======================================================= */

    const Reports = {
        state,
        endpoints,

        list,
        get,
        create,
        update,
        remove,

        generate,
        exportReport,

        search,
        filter,
        clearFilters,

        goToPage,
        nextPage,
        previousPage,

        validateReport,
        validateReportGeneration,

        normalizeReportData,
        normalizeReportGenerationData,

        formToObject,

        submitCreateForm,
        submitUpdateForm,
        submitGenerateForm,

        deleteWithConfirmation,

        renderReportTable,
        renderPagination,
        renderGeneratedReport,

        showDetails,
        loadReportIntoForm,

        refreshList: list,

        init
    };

    window.Reports = Reports;

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
                            'Reports initialization error:',
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
                    'Reports initialization error:',
                    error
                );
            }
        );
    }
})();
| Operation | JavaScript | PHP endpoint |
|---|---|---|
| List reports | `Reports.list()` | `/reports/list.php` |
| Get report | `Reports.get(id)` | `/reports/get.php` |
| Create report | `Reports.create(data)` | `/reports/create.php` |
| Update report | `Reports.update(id, data)` | `/reports/update.php` |
| Delete report | `Reports.remove(id)` | `/reports/delete.php` |
| Generate report | `Reports.generate(data)` | `/reports/generate.php` |
| Export report | `Reports.exportReport(data)` | `/reports/export.php` |
| Search | `Reports.search(term)` | `/reports/list.php` |
| Filter | `Reports.filter(filters)` | `/reports/list.php` |
| Pagination | `Reports.goToPage(page)` | `/reports/list.php` |