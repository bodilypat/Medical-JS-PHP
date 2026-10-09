/**
 * Frontend/js/billing.js
 * Medical Management System
 *
 * Billing / invoice operations and UI handling.
 *
 * Expected API endpoints:
 * GET  /billing/list.php
 * GET  /billing/get.php?id=123
 * POST /billing/create.php
 * POST /billing/update.php
 * POST /billing/delete.php
 * POST /billing/issue.php
 * POST /billing/pay.php
 * POST /billing/void.php
 * POST /billing/refund.php
 */

(function () {
    'use strict';

    const state = {
        invoices: [],
        currentInvoice: null,

        currentPage: 1,
        perPage: 10,
        total: 0,

        search: '',
        patientId: '',
        appointmentId: '',
        invoiceType: '',
        status: '',
        paymentStatus: '',
        paymentMethod: '',
        dateFrom: '',
        dateTo: '',

        loading: false
    };

    const endpoints = {
        list: '/billing/list.php',
        get: '/billing/get.php',
        create: '/billing/create.php',
        update: '/billing/update.php',
        delete: '/billing/delete.php',

        issue: '/billing/issue.php',
        pay: '/billing/pay.php',
        void: '/billing/void.php',
        refund: '/billing/refund.php'
    };

    /* -----------------------------------------------------------
     * Utility functions
     * --------------------------------------------------------- */

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

    function showMessage(message, type = 'info', selector = '#billingMessage') {
        const element = getElement(selector);

        if (!element) {
            return;
        }

        element.textContent = message || '';
        element.className = `message message-${type}`;
        element.hidden = !message;
    }

    function clearMessage(selector = '#billingMessage') {
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
            .querySelectorAll('[data-billing-loading]')
            .forEach((element) => {
                element.hidden = !state.loading;
            });

        document
            .querySelectorAll('[data-billing-submit]')
            .forEach((button) => {
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

    function formatCurrency(value, currency = 'USD') {
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

    function getInvoiceId(invoice) {
        if (!invoice) {
            return null;
        }

        return (
            invoice.id ??
            invoice.invoice_id ??
            invoice.billing_id ??
            invoice.invoiceId ??
            null
        );
    }

    function getPatientName(invoice) {
        if (!invoice) {
            return '—';
        }

        if (invoice.patient_name) {
            return invoice.patient_name;
        }

        if (invoice.patient) {
            if (typeof invoice.patient === 'string') {
                return invoice.patient;
            }

            if (invoice.patient.name) {
                return invoice.patient.name;
            }

            return [
                invoice.patient.first_name,
                invoice.patient.last_name
            ]
                .filter(Boolean)
                .join(' ');
        }

        return [
            invoice.patient_first_name,
            invoice.patient_last_name
        ]
            .filter(Boolean)
            .join(' ') || '—';
    }

    function getPatientId(invoice) {
        if (!invoice) {
            return '';
        }

        return (
            invoice.patient_id ??
            invoice.patientId ??
            invoice.patient?.id ??
            ''
        );
    }

    function getInvoiceNumber(invoice) {
        if (!invoice) {
            return '—';
        }

        return (
            invoice.invoice_number ??
            invoice.invoice_no ??
            invoice.number ??
            invoice.reference_number ??
            `#${getInvoiceId(invoice) || '—'}`
        );
    }

    function getInvoiceTotal(invoice) {
        if (!invoice) {
            return 0;
        }

        return Number(
            invoice.total ??
            invoice.total_amount ??
            invoice.grand_total ??
            invoice.amount ??
            0
        );
    }

    function getInvoiceBalance(invoice) {
        if (!invoice) {
            return 0;
        }

        if (
            invoice.balance !== undefined &&
            invoice.balance !== null
        ) {
            return Number(invoice.balance);
        }

        const total = getInvoiceTotal(invoice);

        const paid = Number(
            invoice.amount_paid ??
            invoice.paid_amount ??
            invoice.paid ??
            0
        );

        return Math.max(0, total - paid);
    }

    function getInvoiceStatus(invoice) {
        if (!invoice) {
            return '';
        }

        return (
            invoice.status ??
            invoice.invoice_status ??
            ''
        );
    }

    function getPaymentStatus(invoice) {
        if (!invoice) {
            return '';
        }

        return (
            invoice.payment_status ??
            invoice.paymentStatus ??
            ''
        );
    }

    function getStatusClass(status) {
        const normalized = String(status || '')
            .toLowerCase()
            .replace(/\s+/g, '-');

        return `status-${normalized || 'unknown'}`;
    }

    function getPaymentStatusClass(status) {
        const normalized = String(status || '')
            .toLowerCase()
            .replace(/\s+/g, '-');

        return `payment-${normalized || 'unknown'}`;
    }

    function getResponseData(response) {
        if (!response) {
            return {};
        }

        return response.data ?? response;
    }

    /* -----------------------------------------------------------
     * API operations
     * --------------------------------------------------------- */

    async function list(options = {}) {
        const page = Number(options.page ?? state.currentPage);
        const limit = Number(options.limit ?? state.perPage);

        const params = new URLSearchParams();

        params.set('page', page);
        params.set('limit', limit);

        const filters = {
            search: options.search ?? state.search,
            patient_id: options.patient_id ?? state.patientId,
            appointment_id: options.appointment_id ?? state.appointmentId,
            invoice_type: options.invoice_type ?? state.invoiceType,
            status: options.status ?? state.status,
            payment_status: options.payment_status ?? state.paymentStatus,
            payment_method: options.payment_method ?? state.paymentMethod,
            date_from: options.date_from ?? state.dateFrom,
            date_to: options.date_to ?? state.dateTo
        };

        Object.entries(filters).forEach(([key, value]) => {
            if (value !== undefined && value !== null && value !== '') {
                params.set(key, value);
            }
        });

        setLoading(true);

        try {
            const response = await API.get(
                `${endpoints.list}?${params.toString()}`
            );

            const data = getResponseData(response);

            let invoices = [];

            if (Array.isArray(data)) {
                invoices = data;
            } else if (Array.isArray(data.invoices)) {
                invoices = data.invoices;
            } else if (Array.isArray(data.billing)) {
                invoices = data.billing;
            } else if (Array.isArray(response.invoices)) {
                invoices = response.invoices;
            } else if (Array.isArray(response.billing)) {
                invoices = response.billing;
            }

            state.invoices = invoices;

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
                invoices.length
            );

            renderInvoiceTable();
            renderPagination();

            return response;
        } catch (error) {
            console.error('Billing list error:', error);

            showMessage(
                error.message || 'Unable to load billing records.',
                'error'
            );

            state.invoices = [];
            state.total = 0;

            renderInvoiceTable();
            renderPagination();

            throw error;
        } finally {
            setLoading(false);
        }
    }

    async function get(id) {
        if (!id) {
            throw new Error('Invoice ID is required.');
        }

        const response = await API.get(
            `${endpoints.get}?id=${encodeURIComponent(id)}`
        );

        const data = getResponseData(response);

        const invoice =
            data.invoice ??
            data.billing ??
            data;

        state.currentInvoice = invoice;

        return invoice;
    }

    async function create(invoiceData) {
        const validation = validateInvoice(invoiceData);

        if (!validation.valid) {
            throw new Error(validation.errors.join(' '));
        }

        setLoading(true);

        try {
            const response = await API.post(
                endpoints.create,
                normalizeInvoiceData(invoiceData)
            );

            showMessage(
                'Invoice created successfully.',
                'success'
            );

            await list();

            return response;
        } catch (error) {
            console.error('Billing create error:', error);

            showMessage(
                error.message || 'Unable to create invoice.',
                'error'
            );

            throw error;
        } finally {
            setLoading(false);
        }
    }

    async function update(id, invoiceData) {
        if (!id) {
            throw new Error('Invoice ID is required.');
        }

        const validation = validateInvoice(
            invoiceData,
            true
        );

        if (!validation.valid) {
            throw new Error(validation.errors.join(' '));
        }

        const payload = normalizeInvoiceData(invoiceData);

        payload.id = id;
        payload.invoice_id = id;

        setLoading(true);

        try {
            const response = await API.post(
                endpoints.update,
                payload
            );

            showMessage(
                'Invoice updated successfully.',
                'success'
            );

            await list();

            return response;
        } catch (error) {
            console.error('Billing update error:', error);

            showMessage(
                error.message || 'Unable to update invoice.',
                'error'
            );

            throw error;
        } finally {
            setLoading(false);
        }
    }

    async function remove(id) {
        if (!id) {
            throw new Error('Invoice ID is required.');
        }

        setLoading(true);

        try {
            const response = await API.post(
                endpoints.delete,
                {
                    id,
                    invoice_id: id
                }
            );

            showMessage(
                'Invoice deleted successfully.',
                'success'
            );

            await list();

            return response;
        } catch (error) {
            console.error('Billing delete error:', error);

            showMessage(
                error.message || 'Unable to delete invoice.',
                'error'
            );

            throw error;
        } finally {
            setLoading(false);
        }
    }

    /* -----------------------------------------------------------
     * Billing workflow operations
     * --------------------------------------------------------- */

    async function issue(data) {
        const id = typeof data === 'object'
            ? (data.id ?? data.invoice_id)
            : data;

        if (!id) {
            throw new Error('Invoice ID is required.');
        }

        setLoading(true);

        try {
            const payload = typeof data === 'object'
                ? { ...data, id, invoice_id: id }
                : { id, invoice_id: id };

            const response = await API.post(
                endpoints.issue,
                payload
            );

            showMessage(
                'Invoice issued successfully.',
                'success'
            );

            await list();

            return response;
        } catch (error) {
            console.error('Billing issue error:', error);

            showMessage(
                error.message || 'Unable to issue invoice.',
                'error'
            );

            throw error;
        } finally {
            setLoading(false);
        }
    }

    async function pay(data) {
        let payload;

        if (typeof data === 'object') {
            payload = { ...data };
        } else {
            payload = {
                id: data,
                invoice_id: data
            };
        }

        const id = payload.id ?? payload.invoice_id;

        if (!id) {
            throw new Error('Invoice ID is required.');
        }

        payload.id = id;
        payload.invoice_id = id;

        const amount = Number(
            payload.amount ??
            payload.payment_amount ??
            0
        );

        if (!Number.isFinite(amount) || amount <= 0) {
            throw new Error(
                'A valid payment amount greater than zero is required.'
            );
        }

        setLoading(true);

        try {
            const response = await API.post(
                endpoints.pay,
                payload
            );

            showMessage(
                'Payment recorded successfully.',
                'success'
            );

            await list();

            return response;
        } catch (error) {
            console.error('Billing payment error:', error);

            showMessage(
                error.message || 'Unable to record payment.',
                'error'
            );

            throw error;
        } finally {
            setLoading(false);
        }
    }

    async function voidInvoice(data) {
        const id = typeof data === 'object'
            ? (data.id ?? data.invoice_id)
            : data;

        if (!id) {
            throw new Error('Invoice ID is required.');
        }

        setLoading(true);

        try {
            const payload = typeof data === 'object'
                ? { ...data, id, invoice_id: id }
                : { id, invoice_id: id };

            const response = await API.post(
                endpoints.void,
                payload
            );

            showMessage(
                'Invoice voided successfully.',
                'success'
            );

            await list();

            return response;
        } catch (error) {
            console.error('Billing void error:', error);

            showMessage(
                error.message || 'Unable to void invoice.',
                'error'
            );

            throw error;
        } finally {
            setLoading(false);
        }
    }

    async function refund(data) {
        let payload;

        if (typeof data === 'object') {
            payload = { ...data };
        } else {
            payload = {
                id: data,
                invoice_id: data
            };
        }

        const id = payload.id ?? payload.invoice_id;

        if (!id) {
            throw new Error('Invoice ID is required.');
        }

        payload.id = id;
        payload.invoice_id = id;

        const amount = Number(
            payload.amount ??
            payload.refund_amount ??
            0
        );

        if (!Number.isFinite(amount) || amount <= 0) {
            throw new Error(
                'A valid refund amount greater than zero is required.'
            );
        }

        setLoading(true);

        try {
            const response = await API.post(
                endpoints.refund,
                payload
            );

            showMessage(
                'Refund processed successfully.',
                'success'
            );

            await list();

            return response;
        } catch (error) {
            console.error('Billing refund error:', error);

            showMessage(
                error.message || 'Unable to process refund.',
                'error'
            );

            throw error;
        } finally {
            setLoading(false);
        }
    }

    /* -----------------------------------------------------------
     * Search and filters
     * --------------------------------------------------------- */

    async function search(term) {
        state.search = String(term || '').trim();
        state.currentPage = 1;

        return list({
            page: 1,
            search: state.search
        });
    }

    async function filter(filters = {}) {
        state.currentPage = 1;

        state.patientId =
            filters.patient_id ??
            filters.patientId ??
            '';

        state.appointmentId =
            filters.appointment_id ??
            filters.appointmentId ??
            '';

        state.invoiceType =
            filters.invoice_type ??
            filters.invoiceType ??
            '';

        state.status =
            filters.status ??
            '';

        state.paymentStatus =
            filters.payment_status ??
            filters.paymentStatus ??
            '';

        state.paymentMethod =
            filters.payment_method ??
            filters.paymentMethod ??
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
        state.patientId = '';
        state.appointmentId = '';
        state.invoiceType = '';
        state.status = '';
        state.paymentStatus = '';
        state.paymentMethod = '';
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
            '#billingSearch',
            '#billingPatientFilter',
            '#billingAppointmentFilter',
            '#billingInvoiceTypeFilter',
            '#billingStatusFilter',
            '#billingPaymentStatusFilter',
            '#billingPaymentMethodFilter',
            '#billingDateFrom',
            '#billingDateTo'
        ];

        selectors.forEach(selector => {
            const element = getElement(selector);

            if (element) {
                element.value = '';
            }
        });
    }

    /* -----------------------------------------------------------
     * Pagination
     * --------------------------------------------------------- */

    async function goToPage(page) {
        const totalPages = Math.max(
            1,
            Math.ceil(state.total / state.perPage)
        );

        const targetPage = Number(page);

        if (
            !Number.isInteger(targetPage) ||
            targetPage < 1 ||
            targetPage > totalPages
        ) {
            return;
        }

        state.currentPage = targetPage;

        return list({
            page: targetPage
        });
    }

    async function nextPage() {
        return goToPage(state.currentPage + 1);
    }

    async function previousPage() {
        return goToPage(state.currentPage - 1);
    }

    /* -----------------------------------------------------------
     * Validation
     * --------------------------------------------------------- */

    function validateInvoice(data = {}, isUpdate = false) {
        const errors = [];

        if (!isUpdate && !data.patient_id) {
            errors.push('Patient is required.');
        }

        if (
            data.patient_id !== undefined &&
            data.patient_id !== '' &&
            (
                !Number.isInteger(Number(data.patient_id)) ||
                Number(data.patient_id) <= 0
            )
        ) {
            errors.push('Patient ID must be a valid positive number.');
        }

        if (
            data.appointment_id !== undefined &&
            data.appointment_id !== '' &&
            (
                !Number.isInteger(Number(data.appointment_id)) ||
                Number(data.appointment_id) <= 0
            )
        ) {
            errors.push(
                'Appointment ID must be a valid positive number.'
            );
        }

        if (
            data.invoice_date &&
            Number.isNaN(new Date(data.invoice_date).getTime())
        ) {
            errors.push('Invoice date is invalid.');
        }

        if (
            data.due_date &&
            Number.isNaN(new Date(data.due_date).getTime())
        ) {
            errors.push('Due date is invalid.');
        }

        const subtotal = data.subtotal;
        const tax = data.tax_amount ?? data.tax;
        const discount =
            data.discount_amount ??
            data.discount;

        if (
            subtotal !== undefined &&
            subtotal !== '' &&
            (
                !Number.isFinite(Number(subtotal)) ||
                Number(subtotal) < 0
            )
        ) {
            errors.push('Subtotal must be a valid non-negative amount.');
        }

        if (
            tax !== undefined &&
            tax !== '' &&
            (
                !Number.isFinite(Number(tax)) ||
                Number(tax) < 0
            )
        ) {
            errors.push('Tax must be a valid non-negative amount.');
        }

        if (
            discount !== undefined &&
            discount !== '' &&
            (
                !Number.isFinite(Number(discount)) ||
                Number(discount) < 0
            )
        ) {
            errors.push(
                'Discount must be a valid non-negative amount.'
            );
        }

        return {
            valid: errors.length === 0,
            errors
        };
    }

    function normalizeInvoiceData(data = {}) {
        const normalized = {
            patient_id: data.patient_id ?? '',
            appointment_id: data.appointment_id ?? '',
            medical_record_id: data.medical_record_id ?? '',

            invoice_number: data.invoice_number ?? '',
            invoice_type: data.invoice_type ?? 'standard',

            invoice_date: data.invoice_date ?? '',
            due_date: data.due_date ?? '',

            description: data.description ?? '',
            notes: data.notes ?? '',

            subtotal: data.subtotal ?? 0,

            discount_amount:
                data.discount_amount ??
                data.discount ??
                0,

            tax_amount:
                data.tax_amount ??
                data.tax ??
                0,

            total:
                data.total ??
                data.total_amount ??
                '',

            amount_paid:
                data.amount_paid ??
                data.paid_amount ??
                0,

            balance:
                data.balance ??
                '',

            currency:
                data.currency ??
                'USD',

            status:
                data.status ??
                'draft',

            payment_status:
                data.payment_status ??
                'unpaid',

            payment_method:
                data.payment_method ??
                '',

            billing_address:
                data.billing_address ??
                '',

            insurance_provider:
                data.insurance_provider ??
                '',

            insurance_member_id:
                data.insurance_member_id ??
                '',

            insurance_claim_number:
                data.insurance_claim_number ??
                '',

            items:
                Array.isArray(data.items)
                    ? data.items
                    : []
        };

        return normalized;
    }

    /* -----------------------------------------------------------
     * Form handling
     * --------------------------------------------------------- */

    function formToObject(form) {
        if (!form) {
            throw new Error('Billing form was not found.');
        }

        const formData = new FormData(form);
        const data = {};

        formData.forEach((value, key) => {
            data[key] = typeof value === 'string'
                ? value.trim()
                : value;
        });

        const numericFields = [
            'patient_id',
            'appointment_id',
            'medical_record_id',
            'subtotal',
            'discount_amount',
            'discount',
            'tax_amount',
            'tax',
            'total',
            'total_amount',
            'amount_paid',
            'paid_amount',
            'balance'
        ];

        numericFields.forEach(field => {
            if (
                data[field] !== undefined &&
                data[field] !== ''
            ) {
                data[field] = Number(data[field]);
            }
        });

        const itemsField = form.querySelector(
            '[name="items"]'
        );

        if (itemsField && itemsField.value.trim()) {
            try {
                data.items = JSON.parse(itemsField.value);
            } catch (error) {
                throw new Error(
                    'Invoice items must contain valid JSON.'
                );
            }
        }

        return data;
    }

    async function submitCreateForm(form) {
        const targetForm =
            form ||
            getElement('#createBillingForm') ||
            getElement('#createInvoiceForm') ||
            getElement('#billingForm');

        if (!targetForm) {
            throw new Error('Create billing form was not found.');
        }

        const data = formToObject(targetForm);

        return create(data);
    }

    async function submitUpdateForm(form) {
        const targetForm =
            form ||
            getElement('#editBillingForm') ||
            getElement('#editInvoiceForm');

        if (!targetForm) {
            throw new Error('Edit billing form was not found.');
        }

        const data = formToObject(targetForm);

        const id =
            data.id ??
            data.invoice_id ??
            targetForm.dataset.id;

        if (!id) {
            throw new Error('Invoice ID is required.');
        }

        return update(id, data);
    }

    /* -----------------------------------------------------------
     * Confirmation helpers
     * --------------------------------------------------------- */

    async function deleteWithConfirmation(id) {
        if (!id) {
            return false;
        }

        const confirmed = window.confirm(
            'Are you sure you want to delete this invoice?'
        );

        if (!confirmed) {
            return false;
        }

        await remove(id);

        return true;
    }

    async function issueWithConfirmation(id) {
        if (!id) {
            return false;
        }

        const confirmed = window.confirm(
            'Issue this invoice? Once issued, it may no longer be editable depending on your billing rules.'
        );

        if (!confirmed) {
            return false;
        }

        await issue(id);

        return true;
    }

    async function voidWithConfirmation(id) {
        if (!id) {
            return false;
        }

        const reason = window.prompt(
            'Enter the reason for voiding this invoice:'
        );

        if (reason === null) {
            return false;
        }

        await voidInvoice({
            id,
            invoice_id: id,
            reason: reason.trim()
        });

        return true;
    }

    async function refundWithConfirmation(id) {
        if (!id) {
            return false;
        }

        const invoice = await get(id);

        const balancePaid = Number(
            invoice?.amount_paid ??
            invoice?.paid_amount ??
            0
        );

        const amount = window.prompt(
            `Enter refund amount. Maximum paid amount: ${formatCurrency(
                balancePaid,
                invoice?.currency || 'USD'
            )}`
        );

        if (amount === null) {
            return false;
        }

        const refundAmount = Number(amount);

        if (
            !Number.isFinite(refundAmount) ||
            refundAmount <= 0
        ) {
            showMessage(
                'Enter a valid refund amount.',
                'error'
            );

            return false;
        }

        if (
            balancePaid > 0 &&
            refundAmount > balancePaid
        ) {
            showMessage(
                'Refund amount cannot exceed the amount paid.',
                'error'
            );

            return false;
        }

        await refund({
            id,
            invoice_id: id,
            amount: refundAmount
        });

        return true;
    }

    async function paymentWithPrompt(id) {
        if (!id) {
            return false;
        }

        const invoice = await get(id);

        const balance = getInvoiceBalance(invoice);

        if (balance <= 0) {
            showMessage(
                'This invoice has no outstanding balance.',
                'info'
            );

            return false;
        }

        const amount = window.prompt(
            `Enter payment amount. Outstanding balance: ${formatCurrency(
                balance,
                invoice?.currency || 'USD'
            )}`
        );

        if (amount === null) {
            return false;
        }

        const paymentAmount = Number(amount);

        if (
            !Number.isFinite(paymentAmount) ||
            paymentAmount <= 0
        ) {
            showMessage(
                'Enter a valid payment amount.',
                'error'
            );

            return false;
        }

        if (paymentAmount > balance) {
            showMessage(
                'Payment amount cannot exceed the outstanding balance.',
                'error'
            );

            return false;
        }

        const method = window.prompt(
            'Enter payment method (cash, card, insurance, check, transfer, etc.):',
            'cash'
        );

        if (method === null) {
            return false;
        }

        await pay({
            id,
            invoice_id: id,
            amount: paymentAmount,
            payment_method: method.trim()
        });

        return true;
    }

    /* -----------------------------------------------------------
     * Rendering
     * --------------------------------------------------------- */

    function renderInvoiceTable(
        invoices = state.invoices,
        selector = '#billingTableBody'
    ) {
        const tbody = getElement(selector);

        if (!tbody) {
            return;
        }

        if (!Array.isArray(invoices) || invoices.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="12" class="empty-state">
                        No billing records found.
                    </td>
                </tr>
            `;

            return;
        }

        tbody.innerHTML = invoices
            .map(invoice => {
                const id = getInvoiceId(invoice);
                const invoiceStatus = getInvoiceStatus(invoice);
                const paymentStatus = getPaymentStatus(invoice);
                const total = getInvoiceTotal(invoice);
                const balance = getInvoiceBalance(invoice);

                const isPaid =
                    String(paymentStatus).toLowerCase() === 'paid' ||
                    balance <= 0;

                const statusActions = [];

                statusActions.push(`
                    <button
                        type="button"
                        class="btn btn-sm"
                        data-action="view-invoice"
                        data-id="${escapeHtml(id)}"
                    >
                        View
                    </button>
                `);

                if (
                    invoiceStatus === 'draft' ||
                    !invoiceStatus
                ) {
                    statusActions.push(`
                        <button
                            type="button"
                            class="btn btn-sm"
                            data-action="edit-invoice"
                            data-id="${escapeHtml(id)}"
                        >
                            Edit
                        </button>

                        <button
                            type="button"
                            class="btn btn-sm"
                            data-action="issue-invoice"
                            data-id="${escapeHtml(id)}"
                        >
                            Issue
                        </button>
                    `);
                }

                if (
                    !isPaid &&
                    invoiceStatus !== 'void' &&
                    invoiceStatus !== 'cancelled'
                ) {
                    statusActions.push(`
                        <button
                            type="button"
                            class="btn btn-sm"
                            data-action="pay-invoice"
                            data-id="${escapeHtml(id)}"
                        >
                            Pay
                        </button>
                    `);
                }

                if (
                    invoiceStatus !== 'void' &&
                    invoiceStatus !== 'cancelled' &&
                    invoiceStatus !== 'paid'
                ) {
                    statusActions.push(`
                        <button
                            type="button"
                            class="btn btn-sm"
                            data-action="void-invoice"
                            data-id="${escapeHtml(id)}"
                        >
                            Void
                        </button>
                    `);
                }

                if (
                    Number(
                        invoice.amount_paid ??
                        invoice.paid_amount ??
                        0
                    ) > 0
                ) {
                    statusActions.push(`
                        <button
                            type="button"
                            class="btn btn-sm"
                            data-action="refund-invoice"
                            data-id="${escapeHtml(id)}"
                        >
                            Refund
                        </button>
                    `);
                }

                statusActions.push(`
                    <button
                        type="button"
                        class="btn btn-sm btn-danger"
                        data-action="delete-invoice"
                        data-id="${escapeHtml(id)}"
                    >
                        Delete
                    </button>
                `);

                return `
                    <tr data-invoice-id="${escapeHtml(id)}">
                        <td>
                            ${escapeHtml(getInvoiceNumber(invoice))}
                        </td>

                        <td>
                            ${escapeHtml(getPatientName(invoice))}
                        </td>

                        <td>
                            ${escapeHtml(
                                invoice.invoice_type
                                    ? capitalize(invoice.invoice_type)
                                    : '—'
                            )}
                        </td>

                        <td>
                            ${formatDate(
                                invoice.invoice_date ??
                                invoice.date
                            )}
                        </td>

                        <td>
                            ${formatDate(invoice.due_date)}
                        </td>

                        <td>
                            ${formatCurrency(
                                total,
                                invoice.currency || 'USD'
                            )}
                        </td>

                        <td>
                            ${formatCurrency(
                                Number(
                                    invoice.amount_paid ??
                                    invoice.paid_amount ??
                                    0
                                ),
                                invoice.currency || 'USD'
                            )}
                        </td>

                        <td>
                            ${formatCurrency(
                                balance,
                                invoice.currency || 'USD'
                            )}
                        </td>

                        <td>
                            <span class="status-badge ${getStatusClass(invoiceStatus)}">
                                ${escapeHtml(
                                    capitalize(invoiceStatus || 'Unknown')
                                )}
                            </span>
                        </td>

                        <td>
                            <span class="status-badge ${getPaymentStatusClass(paymentStatus)}">
                                ${escapeHtml(
                                    capitalize(paymentStatus || 'Unpaid')
                                )}
                            </span>
                        </td>

                        <td>
                            ${escapeHtml(
                                capitalize(
                                    invoice.payment_method || '—'
                                )
                            )}
                        </td>

                        <td class="table-actions">
                            ${statusActions.join('')}
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
        selector = '#billingPagination'
    ) {
        const container = getElement(selector);

        if (!container) {
            return;
        }

        const totalPages = Math.max(
            1,
            Math.ceil(Number(total) / Number(limit))
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

        let startPage = Math.max(
            1,
            page - Math.floor(maxVisiblePages / 2)
        );

        let endPage = Math.min(
            totalPages,
            startPage + maxVisiblePages - 1
        );

        if (
            endPage - startPage + 1 <
            maxVisiblePages
        ) {
            startPage = Math.max(
                1,
                endPage - maxVisiblePages + 1
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

        for (let i = startPage; i <= endPage; i += 1) {
            buttons.push(`
                <button
                    type="button"
                    class="pagination-btn ${i === page ? 'active' : ''}"
                    data-page="${i}"
                    ${i === page ? 'aria-current="page"' : ''}
                >
                    ${i}
                </button>
            `);
        }

        if (endPage < totalPages) {
            if (endPage < totalPages - 1) {
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
                ${page >= totalPages ? 'disabled' : ''}
            >
                Next
            </button>
        `);

        container.innerHTML = buttons.join('');
    }

    /* -----------------------------------------------------------
     * Details
     * --------------------------------------------------------- */

    async function showDetails(
        id,
        containerSelector = '#billingDetails'
    ) {
        const container = getElement(containerSelector);

        if (!container) {
            return null;
        }

        try {
            const invoice = await get(id);

            const total = getInvoiceTotal(invoice);
            const paid = Number(
                invoice.amount_paid ??
                invoice.paid_amount ??
                0
            );
            const balance = getInvoiceBalance(invoice);

            container.innerHTML = `
                <div class="billing-details">

                    <div class="detail-row">
                        <strong>Invoice Number:</strong>
                        <span>
                            ${escapeHtml(
                                getInvoiceNumber(invoice)
                            )}
                        </span>
                    </div>

                    <div class="detail-row">
                        <strong>Patient:</strong>
                        <span>
                            ${escapeHtml(
                                getPatientName(invoice)
                            )}
                        </span>
                    </div>

                    <div class="detail-row">
                        <strong>Invoice Type:</strong>
                        <span>
                            ${escapeHtml(
                                capitalize(
                                    invoice.invoice_type || 'Standard'
                                )
                            )}
                        </span>
                    </div>

                    <div class="detail-row">
                        <strong>Invoice Date:</strong>
                        <span>
                            ${formatDate(
                                invoice.invoice_date ??
                                invoice.date
                            )}
                        </span>
                    </div>

                    <div class="detail-row">
                        <strong>Due Date:</strong>
                        <span>
                            ${formatDate(invoice.due_date)}
                        </span>
                    </div>

                    <div class="detail-row">
                        <strong>Subtotal:</strong>
                        <span>
                            ${formatCurrency(
                                Number(invoice.subtotal || 0),
                                invoice.currency || 'USD'
                            )}
                        </span>
                    </div>

                    <div class="detail-row">
                        <strong>Discount:</strong>
                        <span>
                            ${formatCurrency(
                                Number(
                                    invoice.discount_amount ??
                                    invoice.discount ??
                                    0
                                ),
                                invoice.currency || 'USD'
                            )}
                        </span>
                    </div>

                    <div class="detail-row">
                        <strong>Tax:</strong>
                        <span>
                            ${formatCurrency(
                                Number(
                                    invoice.tax_amount ??
                                    invoice.tax ??
                                    0
                                ),
                                invoice.currency || 'USD'
                            )}
                        </span>
                    </div>

                    <div class="detail-row">
                        <strong>Total:</strong>
                        <span>
                            ${formatCurrency(
                                total,
                                invoice.currency || 'USD'
                            )}
                        </span>
                    </div>

                    <div class="detail-row">
                        <strong>Paid:</strong>
                        <span>
                            ${formatCurrency(
                                paid,
                                invoice.currency || 'USD'
                            )}
                        </span>
                    </div>

                    <div class="detail-row">
                        <strong>Balance:</strong>
                        <span>
                            ${formatCurrency(
                                balance,
                                invoice.currency || 'USD'
                            )}
                        </span>
                    </div>

                    <div class="detail-row">
                        <strong>Status:</strong>
                        <span class="status-badge ${getStatusClass(
                            getInvoiceStatus(invoice)
                        )}">
                            ${escapeHtml(
                                capitalize(
                                    getInvoiceStatus(invoice) ||
                                    'Unknown'
                                )
                            )}
                        </span>
                    </div>

                    <div class="detail-row">
                        <strong>Payment Status:</strong>
                        <span class="status-badge ${getPaymentStatusClass(
                            getPaymentStatus(invoice)
                        )}">
                            ${escapeHtml(
                                capitalize(
                                    getPaymentStatus(invoice) ||
                                    'Unpaid'
                                )
                            )}
                        </span>
                    </div>

                    <div class="detail-row">
                        <strong>Payment Method:</strong>
                        <span>
                            ${escapeHtml(
                                capitalize(
                                    invoice.payment_method || '—'
                                )
                            )}
                        </span>
                    </div>

                    <div class="detail-row">
                        <strong>Insurance Provider:</strong>
                        <span>
                            ${escapeHtml(
                                invoice.insurance_provider || '—'
                            )}
                        </span>
                    </div>

                    <div class="detail-row">
                        <strong>Insurance Member ID:</strong>
                        <span>
                            ${escapeHtml(
                                invoice.insurance_member_id || '—'
                            )}
                        </span>
                    </div>

                    <div class="detail-row">
                        <strong>Insurance Claim Number:</strong>
                        <span>
                            ${escapeHtml(
                                invoice.insurance_claim_number || '—'
                            )}
                        </span>
                    </div>

                    <div class="detail-row">
                        <strong>Description:</strong>
                        <span>
                            ${escapeHtml(
                                invoice.description || '—'
                            )}
                        </span>
                    </div>

                    <div class="detail-row">
                        <strong>Notes:</strong>
                        <span>
                            ${escapeHtml(
                                invoice.notes || '—'
                            )}
                        </span>
                    </div>

                    <div class="detail-row">
                        <strong>Created:</strong>
                        <span>
                            ${formatDateTime(
                                invoice.created_at
                            )}
                        </span>
                    </div>

                    <div class="detail-row">
                        <strong>Updated:</strong>
                        <span>
                            ${formatDateTime(
                                invoice.updated_at
                            )}
                        </span>
                    </div>

                    ${
                        Array.isArray(invoice.items) &&
                        invoice.items.length
                            ? `
                                <div class="billing-items">
                                    <h4>Invoice Items</h4>

                                    <table class="table">
                                        <thead>
                                            <tr>
                                                <th>Description</th>
                                                <th>Quantity</th>
                                                <th>Unit Price</th>
                                                <th>Total</th>
                                            </tr>
                                        </thead>

                                        <tbody>
                                            ${invoice.items
                                                .map(item => {
                                                    const quantity =
                                                        Number(
                                                            item.quantity || 1
                                                        );

                                                    const unitPrice =
                                                        Number(
                                                            item.unit_price ??
                                                            item.price ??
                                                            0
                                                        );

                                                    const itemTotal =
                                                        Number(
                                                            item.total ??
                                                            item.amount ??
                                                            quantity *
                                                                unitPrice
                                                        );

                                                    return `
                                                        <tr>
                                                            <td>
                                                                ${escapeHtml(
                                                                    item.description ??
                                                                    item.name ??
                                                                    '—'
                                                                )}
                                                            </td>

                                                            <td>
                                                                ${escapeHtml(
                                                                    quantity
                                                                )}
                                                            </td>

                                                            <td>
                                                                ${formatCurrency(
                                                                    unitPrice,
                                                                    invoice.currency ||
                                                                        'USD'
                                                                )}
                                                            </td>

                                                            <td>
                                                                ${formatCurrency(
                                                                    itemTotal,
                                                                    invoice.currency ||
                                                                        'USD'
                                                                )}
                                                            </td>
                                                        </tr>
                                                    `;
                                                })
                                                .join('')}
                                        </tbody>
                                    </table>
                                </div>
                            `
                            : ''
                    }

                </div>
            `;

            container.hidden = false;

            return invoice;
        } catch (error) {
            console.error(
                'Billing details error:',
                error
            );

            showMessage(
                error.message ||
                    'Unable to load invoice details.',
                'error'
            );

            throw error;
        }
    }

    async function loadInvoiceIntoForm(
        id,
        formSelector = '#editBillingForm'
    ) {
        const form = getElement(formSelector);

        if (!form) {
            throw new Error('Billing edit form was not found.');
        }

        const invoice = await get(id);

        const fields = [
            'id',
            'invoice_id',
            'patient_id',
            'appointment_id',
            'medical_record_id',
            'invoice_number',
            'invoice_type',
            'invoice_date',
            'due_date',
            'description',
            'notes',
            'subtotal',
            'discount_amount',
            'tax_amount',
            'total',
            'amount_paid',
            'balance',
            'currency',
            'status',
            'payment_status',
            'payment_method',
            'billing_address',
            'insurance_provider',
            'insurance_member_id',
            'insurance_claim_number'
        ];

        fields.forEach(field => {
            const input = form.querySelector(
                `[name="${field}"]`
            );

            if (!input) {
                return;
            }

            let value = invoice[field];

            if (
                value === undefined &&
                field === 'id'
            ) {
                value = getInvoiceId(invoice);
            }

            if (
                value === undefined &&
                field === 'invoice_id'
            ) {
                value = getInvoiceId(invoice);
            }

            if (
                value === undefined ||
                value === null
            ) {
                value = '';
            }

            input.value = value;
        });

        const itemsInput = form.querySelector(
            '[name="items"]'
        );

        if (itemsInput) {
            itemsInput.value =
                Array.isArray(invoice.items)
                    ? JSON.stringify(invoice.items)
                    : '';
        }

        form.dataset.id = getInvoiceId(invoice) || '';

        return invoice;
    }

    /* -----------------------------------------------------------
     * Event handling
     * --------------------------------------------------------- */

    function handleTableAction(action, id) {
        if (!id) {
            return;
        }

        switch (action) {
            case 'view-invoice':
                showDetails(id);
                break;

            case 'edit-invoice':
                loadInvoiceIntoForm(
                    id,
                    '#editBillingForm'
                ).catch(console.error);
                break;

            case 'issue-invoice':
                issueWithConfirmation(id)
                    .catch(console.error);
                break;

            case 'pay-invoice':
                paymentWithPrompt(id)
                    .catch(console.error);
                break;

            case 'void-invoice':
                voidWithConfirmation(id)
                    .catch(console.error);
                break;

            case 'refund-invoice':
                refundWithConfirmation(id)
                    .catch(console.error);
                break;

            case 'delete-invoice':
                deleteWithConfirmation(id)
                    .catch(console.error);
                break;

            default:
                break;
        }
    }

    function bindEvents() {
        const tableBody =
            getElement('#billingTableBody');

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

                    const action =
                        button.dataset.action;

                    const id =
                        button.dataset.id;

                    handleTableAction(
                        action,
                        id
                    );
                }
            );
        }

        const pagination =
            getElement('#billingPagination');

        if (pagination) {
            pagination.addEventListener(
                'click',
                event => {
                    const button =
                        event.target.closest(
                            '[data-page]'
                        );

                    if (!button || button.disabled) {
                        return;
                    }

                    const page =
                        Number(button.dataset.page);

                    if (page) {
                        goToPage(page)
                            .catch(console.error);
                    }
                }
            );
        }

        const searchInput =
            getElement('#billingSearch');

        const searchButton =
            getElement('#searchBilling');

        if (searchButton) {
            searchButton.addEventListener(
                'click',
                () => {
                    search(
                        getValue(searchInput)
                    ).catch(console.error);
                }
            );
        }

        if (searchInput) {
            searchInput.addEventListener(
                'keydown',
                event => {
                    if (event.key === 'Enter') {
                        event.preventDefault();

                        search(
                            getValue(searchInput)
                        ).catch(console.error);
                    }
                }
            );
        }

        const filterButton =
            getElement('#applyBillingFilters');

        if (filterButton) {
            filterButton.addEventListener(
                'click',
                () => {
                    filter({
                        patient_id: getValue(
                            getElement(
                                '#billingPatientFilter'
                            )
                        ),

                        appointment_id: getValue(
                            getElement(
                                '#billingAppointmentFilter'
                            )
                        ),

                        invoice_type: getValue(
                            getElement(
                                '#billingInvoiceTypeFilter'
                            )
                        ),

                        status: getValue(
                            getElement(
                                '#billingStatusFilter'
                            )
                        ),

                        payment_status: getValue(
                            getElement(
                                '#billingPaymentStatusFilter'
                            )
                        ),

                        payment_method: getValue(
                            getElement(
                                '#billingPaymentMethodFilter'
                            )
                        ),

                        date_from: getValue(
                            getElement(
                                '#billingDateFrom'
                            )
                        ),

                        date_to: getValue(
                            getElement(
                                '#billingDateTo'
                            )
                        )
                    }).catch(console.error);
                }
            );
        }

        const clearButton =
            getElement('#clearBillingFilters');

        if (clearButton) {
            clearButton.addEventListener(
                'click',
                () => {
                    clearFilters()
                        .catch(console.error);
                }
            );
        }

        const perPage =
            getElement('#billingPerPage');

        if (perPage) {
            perPage.addEventListener(
                'change',
                () => {
                    const value =
                        Number(perPage.value);

                    if (
                        Number.isInteger(value) &&
                        value > 0
                    ) {
                        state.perPage = value;
                        state.currentPage = 1;

                        list({
                            page: 1,
                            limit: value
                        }).catch(console.error);
                    }
                }
            );
        }

        const createForms = [
            '#billingForm',
            '#createBillingForm',
            '#createInvoiceForm'
        ];

        createForms.forEach(selector => {
            const form = getElement(selector);

            if (!form) {
                return;
            }

            form.addEventListener(
                'submit',
                event => {
                    event.preventDefault();

                    submitCreateForm(form)
                        .then(() => {
                            form.reset();
                        })
                        .catch(error => {
                            console.error(error);
                        });
                }
            );
        });

        const updateForms = [
            '#editBillingForm',
            '#editInvoiceForm'
        ];

        updateForms.forEach(selector => {
            const form = getElement(selector);

            if (!form) {
                return;
            }

            form.addEventListener(
                'submit',
                event => {
                    event.preventDefault();

                    submitUpdateForm(form)
                        .catch(error => {
                            console.error(error);
                        });
                }
            );
        });
    }

    /* -----------------------------------------------------------
     * Initialization
     * --------------------------------------------------------- */

    async function init(options = {}) {
        bindEvents();

        if (
            options.autoLoad === false ||
            document.body?.dataset.billingAutoLoad === 'false'
        ) {
            return;
        }

        return list();
    }

    /* -----------------------------------------------------------
     * Public API
     * --------------------------------------------------------- */

    const Billing = {
        state,
        endpoints,

        list,
        get,
        create,
        update,
        remove,

        issue,
        pay,
        voidInvoice,
        refund,

        search,
        filter,
        clearFilters,

        goToPage,
        nextPage,
        previousPage,

        validateInvoice,
        normalizeInvoiceData,
        formToObject,

        submitCreateForm,
        submitUpdateForm,

        deleteWithConfirmation,
        issueWithConfirmation,
        paymentWithPrompt,
        voidWithConfirmation,
        refundWithConfirmation,

        refreshList: list,

        renderInvoiceTable,
        renderPagination,

        showDetails,
        loadInvoiceIntoForm,

        init
    };

    window.Billing = Billing;

    if (
        document.readyState === 'loading'
    ) {
        document.addEventListener(
            'DOMContentLoaded',
            () => {
                init().catch(error => {
                    console.error(
                        'Billing initialization error:',
                        error
                    );
                });
            }
        );
    } else {
        init().catch(error => {
            console.error(
                'Billing initialization error:',
                error
            );
        });
    }
})();
| Operation | Frontend method | PHP endpoint |
|---|---|---|
| List invoices | `Billing.list()` | `/billing/list.php` |
| Get invoice | `Billing.get(id)` | `/billing/get.php` |
| Create | `Billing.create(data)` | `/billing/create.php` |
| Update | `Billing.update(id, data)` | `/billing/update.php` |
| Delete | `Billing.remove(id)` | `/billing/delete.php` |
| Issue invoice | `Billing.issue(id)` | `/billing/issue.php` |
| Record payment | `Billing.pay(data)` | `/billing/pay.php` |
| Void invoice | `Billing.voidInvoice(data)` | `/billing/void.php` |
| Refund | `Billing.refund(data)` | `/billing/refund.php` |
| Search | `Billing.search(term)` | `/billing/list.php` |
| Filter | `Billing.filter(filters)` | `/billing/list.php` |


