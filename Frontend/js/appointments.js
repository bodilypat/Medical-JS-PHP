/**
 * Frontend/js/appointments.js
 * Medical Management System
 *
 * Appointment CRUD operations and UI handling.
 *
 * Expected API endpoints:
 * GET  /appointments/list.php
 * GET  /appointments/get.php?id=123
 * POST /appointments/create.php
 * POST /appointments/update.php
 * POST /appointments/cancel.php
 * POST /appointments/delete.php
 */

(function (window, document) {
    'use strict';

    const API = window.API;

    if (!API) {
        console.error('API module is not loaded. Load api.js before appointments.js.');
        return;
    }

    // ------------------------------------------------------------
    // State
    // ------------------------------------------------------------

    const state = {
        appointments: [],
        currentAppointment: null,

        currentPage: 1,
        perPage: 10,
        total: 0,

        search: '',
        status: '',
        appointmentType: '',
        doctorId: '',
        patientId: '',
        dateFrom: '',
        dateTo: '',

        loading: false
    };

    // ------------------------------------------------------------
    // API endpoints
    // ------------------------------------------------------------

    const endpoints = {
        list: '/appointments/list.php',
        get: '/appointments/get.php',
        create: '/appointments/create.php',
        update: '/appointments/update.php',
        cancel: '/appointments/cancel.php',
        delete: '/appointments/delete.php'
    };

    // ------------------------------------------------------------
    // Utilities
    // ------------------------------------------------------------

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
        return element ? element.value.trim() : '';
    }

    function showMessage(message, type = 'success', selector = '#appointmentMessage') {
        const element = getElement(selector);

        if (!element) {
            return;
        }

        element.textContent = message;
        element.className = `message ${type}`;
        element.hidden = false;

        clearTimeout(element._messageTimer);

        element._messageTimer = setTimeout(() => {
            element.hidden = true;
        }, 5000);
    }

    function clearMessage(selector = '#appointmentMessage') {
        const element = getElement(selector);

        if (!element) {
            return;
        }

        element.textContent = '';
        element.hidden = true;
        element.className = 'message';
    }

    function setLoading(loading) {
        state.loading = loading;

        document
            .querySelectorAll('[data-appointments-loading]')
            .forEach(element => {
                element.hidden = !loading;
            });

        document
            .querySelectorAll('[data-appointments-content]')
            .forEach(element => {
                element.hidden = loading;
            });
    }

    function formatDate(date) {
        if (!date) {
            return '';
        }

        const parsed = new Date(`${date}T00:00:00`);

        if (Number.isNaN(parsed.getTime())) {
            return date;
        }

        return parsed.toLocaleDateString(undefined, {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    }

    function formatDateTime(date, time) {
        if (!date) {
            return '';
        }

        const value = time ? `${date}T${time}` : `${date}T00:00:00`;
        const parsed = new Date(value);

        if (Number.isNaN(parsed.getTime())) {
            return `${formatDate(date)}${time ? ` ${time}` : ''}`;
        }

        return parsed.toLocaleString(undefined, {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: time ? 'numeric' : undefined,
            minute: time ? '2-digit' : undefined
        });
    }

    function formatCurrency(value) {
        if (value === null || value === undefined || value === '') {
            return '';
        }

        const number = Number(value);

        if (Number.isNaN(number)) {
            return value;
        }

        return number.toLocaleString(undefined, {
            style: 'currency',
            currency: 'USD'
        });
    }

    function capitalize(value) {
        if (!value) {
            return '';
        }

        return String(value)
            .replace(/[_-]/g, ' ')
            .replace(/\b\w/g, character => character.toUpperCase());
    }

    function getAppointmentId(appointment) {
        return (
            appointment?.id ??
            appointment?.appointment_id ??
            appointment?.appointmentId ??
            ''
        );
    }

    // ------------------------------------------------------------
    // List appointments
    // ------------------------------------------------------------

    async function list(options = {}) {
        const page = Number(options.page || state.currentPage || 1);
        const limit = Number(options.limit || state.perPage || 10);

        const params = new URLSearchParams();

        params.set('page', page);
        params.set('limit', limit);

        const search = options.search ?? state.search;
        const status = options.status ?? state.status;
        const appointmentType =
            options.appointment_type ?? state.appointmentType;
        const doctorId = options.doctor_id ?? state.doctorId;
        const patientId = options.patient_id ?? state.patientId;
        const dateFrom = options.date_from ?? state.dateFrom;
        const dateTo = options.date_to ?? state.dateTo;

        if (search) {
            params.set('search', search);
        }

        if (status) {
            params.set('status', status);
        }

        if (appointmentType) {
            params.set('appointment_type', appointmentType);
        }

        if (doctorId) {
            params.set('doctor_id', doctorId);
        }

        if (patientId) {
            params.set('patient_id', patientId);
        }

        if (dateFrom) {
            params.set('date_from', dateFrom);
        }

        if (dateTo) {
            params.set('date_to', dateTo);
        }

        setLoading(true);

        try {
            const response = await API.get(
                `${endpoints.list}?${params.toString()}`
            );

            const appointments =
                response?.data?.appointments ??
                response?.appointments ??
                response?.data ??
                [];

            state.appointments = Array.isArray(appointments)
                ? appointments
                : [];

            state.total =
                Number(
                    response?.data?.total ??
                    response?.total ??
                    state.appointments.length
                ) || 0;

            state.currentPage = page;
            state.perPage = limit;

            renderAppointmentTable();
            renderPagination(
                state.total,
                state.currentPage,
                state.perPage
            );

            return response;
        } catch (error) {
            console.error('Failed to load appointments:', error);

            state.appointments = [];
            state.total = 0;

            renderAppointmentTable();
            renderPagination(0, page, limit);

            showMessage(
                error?.message || 'Unable to load appointments.',
                'error'
            );

            throw error;
        } finally {
            setLoading(false);
        }
    }

    // ------------------------------------------------------------
    // Get appointment
    // ------------------------------------------------------------

    async function get(id) {
        if (!id) {
            throw new Error('Appointment ID is required.');
        }

        try {
            const response = await API.get(
                `${endpoints.get}?id=${encodeURIComponent(id)}`
            );

            const appointment =
                response?.data?.appointment ??
                response?.appointment ??
                response?.data ??
                null;

            state.currentAppointment = appointment;

            return appointment;
        } catch (error) {
            console.error('Failed to get appointment:', error);

            showMessage(
                error?.message || 'Unable to load appointment.',
                'error'
            );

            throw error;
        }
    }

    // ------------------------------------------------------------
    // Create appointment
    // ------------------------------------------------------------

    async function create(appointmentData) {
        const data = normalizeAppointmentData(appointmentData);
        const validation = validateAppointment(data);

        if (!validation.valid) {
            throw new Error(validation.errors.join(' '));
        }

        setLoading(true);

        try {
            const response = await API.post(
                endpoints.create,
                data
            );

            showMessage(
                response?.message || 'Appointment created successfully.',
                'success'
            );

            state.currentPage = 1;

            await list({
                page: 1,
                limit: state.perPage
            });

            return response;
        } catch (error) {
            console.error('Failed to create appointment:', error);

            showMessage(
                error?.message || 'Unable to create appointment.',
                'error'
            );

            throw error;
        } finally {
            setLoading(false);
        }
    }

    // ------------------------------------------------------------
    // Update appointment
    // ------------------------------------------------------------

    async function update(id, appointmentData) {
        if (!id) {
            throw new Error('Appointment ID is required.');
        }

        const data = normalizeAppointmentData(appointmentData);

        data.id = id;
        data.appointment_id = id;

        const validation = validateAppointment(data);

        if (!validation.valid) {
            throw new Error(validation.errors.join(' '));
        }

        setLoading(true);

        try {
            const response = await API.post(
                endpoints.update,
                data
            );

            showMessage(
                response?.message || 'Appointment updated successfully.',
                'success'
            );

            await list({
                page: state.currentPage,
                limit: state.perPage
            });

            return response;
        } catch (error) {
            console.error('Failed to update appointment:', error);

            showMessage(
                error?.message || 'Unable to update appointment.',
                'error'
            );

            throw error;
        } finally {
            setLoading(false);
        }
    }

    // ------------------------------------------------------------
    // Cancel appointment
    // ------------------------------------------------------------

    async function cancel(id, reason = '') {
        if (!id) {
            throw new Error('Appointment ID is required.');
        }

        const data = {
            id: id,
            appointment_id: id
        };

        if (reason) {
            data.cancellation_reason = reason;
            data.reason = reason;
        }

        try {
            const response = await API.post(
                endpoints.cancel,
                data
            );

            showMessage(
                response?.message || 'Appointment cancelled successfully.',
                'success'
            );

            await list({
                page: state.currentPage,
                limit: state.perPage
            });

            return response;
        } catch (error) {
            console.error('Failed to cancel appointment:', error);

            showMessage(
                error?.message || 'Unable to cancel appointment.',
                'error'
            );

            throw error;
        }
    }

    // ------------------------------------------------------------
    // Delete appointment
    // ------------------------------------------------------------

    async function remove(id) {
        if (!id) {
            throw new Error('Appointment ID is required.');
        }

        try {
            const response = await API.post(
                endpoints.delete,
                {
                    id: id,
                    appointment_id: id
                }
            );

            showMessage(
                response?.message || 'Appointment deleted successfully.',
                'success'
            );

            if (
                state.appointments.length === 1 &&
                state.currentPage > 1
            ) {
                state.currentPage--;
            }

            await list({
                page: state.currentPage,
                limit: state.perPage
            });

            return response;
        } catch (error) {
            console.error('Failed to delete appointment:', error);

            showMessage(
                error?.message || 'Unable to delete appointment.',
                'error'
            );

            throw error;
        }
    }

    // ------------------------------------------------------------
    // Search
    // ------------------------------------------------------------

    async function search(term) {
        state.search = String(term || '').trim();
        state.currentPage = 1;

        return list({
            page: 1,
            limit: state.perPage,
            search: state.search
        });
    }

    // ------------------------------------------------------------
    // Filter
    // ------------------------------------------------------------

    async function filter(filters = {}) {
        state.status = filters.status ?? '';
        state.appointmentType =
            filters.appointment_type ??
            filters.appointmentType ??
            '';

        state.doctorId =
            filters.doctor_id ??
            filters.doctorId ??
            '';

        state.patientId =
            filters.patient_id ??
            filters.patientId ??
            '';

        state.dateFrom =
            filters.date_from ??
            filters.dateFrom ??
            '';

        state.dateTo =
            filters.date_to ??
            filters.dateTo ??
            '';

        state.currentPage = 1;

        return list({
            page: 1,
            limit: state.perPage,
            search: state.search,
            status: state.status,
            appointment_type: state.appointmentType,
            doctor_id: state.doctorId,
            patient_id: state.patientId,
            date_from: state.dateFrom,
            date_to: state.dateTo
        });
    }

    // ------------------------------------------------------------
    // Pagination
    // ------------------------------------------------------------

    async function goToPage(page) {
        const totalPages = Math.max(
            1,
            Math.ceil(state.total / state.perPage)
        );

        const targetPage = Math.min(
            Math.max(Number(page) || 1, 1),
            totalPages
        );

        if (targetPage === state.currentPage && state.appointments.length) {
            return;
        }

        return list({
            page: targetPage,
            limit: state.perPage
        });
    }

    async function nextPage() {
        return goToPage(state.currentPage + 1);
    }

    async function previousPage() {
        return goToPage(state.currentPage - 1);
    }

    // ------------------------------------------------------------
    // Validation
    // ------------------------------------------------------------

    function validateAppointment(appointment) {
        const errors = [];

        if (!appointment.patient_id) {
            errors.push('Patient is required.');
        }

        if (!appointment.doctor_id) {
            errors.push('Doctor is required.');
        }

        if (!appointment.appointment_date) {
            errors.push('Appointment date is required.');
        }

        if (!appointment.appointment_time) {
            errors.push('Appointment time is required.');
        }

        if (
            appointment.patient_id &&
            !/^\d+$/.test(String(appointment.patient_id))
        ) {
            errors.push('Patient ID must be valid.');
        }

        if (
            appointment.doctor_id &&
            !/^\d+$/.test(String(appointment.doctor_id))
        ) {
            errors.push('Doctor ID must be valid.');
        }

        if (appointment.appointment_date) {
            const date = new Date(
                `${appointment.appointment_date}T00:00:00`
            );

            if (Number.isNaN(date.getTime())) {
                errors.push('Appointment date is invalid.');
            }
        }

        if (appointment.appointment_time) {
            const timePattern = /^([01]\d|2[0-3]):([0-5]\d)$/;

            if (!timePattern.test(appointment.appointment_time)) {
                errors.push(
                    'Appointment time must use HH:MM format.'
                );
            }
        }

        if (
            appointment.duration_minutes !== '' &&
            appointment.duration_minutes !== null &&
            appointment.duration_minutes !== undefined
        ) {
            const duration = Number(appointment.duration_minutes);

            if (
                Number.isNaN(duration) ||
                duration <= 0 ||
                !Number.isInteger(duration)
            ) {
                errors.push(
                    'Appointment duration must be a positive whole number.'
                );
            }
        }

        if (
            appointment.consultation_fee !== '' &&
            appointment.consultation_fee !== null &&
            appointment.consultation_fee !== undefined
        ) {
            const fee = Number(appointment.consultation_fee);

            if (Number.isNaN(fee) || fee < 0) {
                errors.push('Consultation fee must be a valid amount.');
            }
        }

        return {
            valid: errors.length === 0,
            errors
        };
    }

    // ------------------------------------------------------------
    // Normalize appointment data
    // ------------------------------------------------------------

    function normalizeAppointmentData(appointment = {}) {
        return {
            patient_id: appointment.patient_id ?? '',
            doctor_id: appointment.doctor_id ?? '',

            appointment_date:
                appointment.appointment_date ??
                appointment.date ??
                '',

            appointment_time:
                appointment.appointment_time ??
                appointment.time ??
                '',

            duration_minutes:
                appointment.duration_minutes ??
                appointment.duration ??
                '',

            appointment_type:
                appointment.appointment_type ??
                appointment.type ??
                '',

            reason:
                appointment.reason ??
                appointment.visit_reason ??
                '',

            symptoms:
                appointment.symptoms ?? '',

            notes:
                appointment.notes ??
                appointment.description ??
                '',

            consultation_fee:
                appointment.consultation_fee ??
                appointment.fee ??
                '',

            status:
                appointment.status ??
                'scheduled',

            priority:
                appointment.priority ??
                'normal',

            location:
                appointment.location ?? '',

            room_number:
                appointment.room_number ??
                appointment.room ??
                '',

            cancellation_reason:
                appointment.cancellation_reason ??
                '',

            reminder_sent:
                appointment.reminder_sent ??
                0
        };
    }

    // ------------------------------------------------------------
    // Form conversion
    // ------------------------------------------------------------

    function formToObject(form) {
        const data = {};

        if (!form) {
            return data;
        }

        const formData = new FormData(form);

        formData.forEach((value, key) => {
            data[key] = typeof value === 'string'
                ? value.trim()
                : value;
        });

        return data;
    }

    // ------------------------------------------------------------
    // Create form
    // ------------------------------------------------------------

    async function submitCreateForm(form) {
        if (!form) {
            throw new Error('Appointment form was not found.');
        }

        clearMessage();

        const data = formToObject(form);

        try {
            const response = await create(data);

            form.reset();

            if (typeof window.refreshAppointmentRelatedFields === 'function') {
                window.refreshAppointmentRelatedFields();
            }

            return response;
        } catch (error) {
            showMessage(
                error?.message || 'Unable to create appointment.',
                'error'
            );

            throw error;
        }
    }

    // ------------------------------------------------------------
    // Update form
    // ------------------------------------------------------------

    async function submitUpdateForm(form, appointmentId) {
        if (!form) {
            throw new Error('Appointment form was not found.');
        }

        if (!appointmentId) {
            throw new Error('Appointment ID is required.');
        }

        clearMessage();

        const data = formToObject(form);

        try {
            return await update(appointmentId, data);
        } catch (error) {
            showMessage(
                error?.message || 'Unable to update appointment.',
                'error'
            );

            throw error;
        }
    }

    // ------------------------------------------------------------
    // Delete confirmation
    // ------------------------------------------------------------

    async function deleteWithConfirmation(id) {
        if (!id) {
            return;
        }

        const appointment = state.appointments.find(
            item => String(getAppointmentId(item)) === String(id)
        );

        const label = appointment
            ? `${appointment.patient_name || appointment.patient || 'this appointment'}`
            : 'this appointment';

        const confirmed = window.confirm(
            `Are you sure you want to permanently delete ${label}?`
        );

        if (!confirmed) {
            return;
        }

        return remove(id);
    }

    // ------------------------------------------------------------
    // Cancel confirmation
    // ------------------------------------------------------------

    async function cancelWithConfirmation(id) {
        if (!id) {
            return;
        }

        const reason = window.prompt(
            'Enter a cancellation reason (optional):'
        );

        if (reason === null) {
            return;
        }

        return cancel(id, reason.trim());
    }

    // ------------------------------------------------------------
    // Refresh
    // ------------------------------------------------------------

    async function refreshList() {
        return list({
            page: state.currentPage,
            limit: state.perPage
        });
    }

    // ------------------------------------------------------------
    // Render appointment table
    // ------------------------------------------------------------

    function renderAppointmentTable(
        appointments = state.appointments,
        selector = '#appointmentsTableBody'
    ) {
        const tbody = getElement(selector);

        if (!tbody) {
            return;
        }

        if (!appointments.length) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="10" class="empty-state">
                        No appointments found.
                    </td>
                </tr>
            `;

            return;
        }

        tbody.innerHTML = appointments.map(appointment => {
            const id = getAppointmentId(appointment);

            const patientName =
                appointment.patient_name ||
                appointment.patient_full_name ||
                [
                    appointment.patient_first_name,
                    appointment.patient_last_name
                ].filter(Boolean).join(' ') ||
                appointment.patient_id ||
                '—';

            const doctorName =
                appointment.doctor_name ||
                appointment.doctor_full_name ||
                [
                    appointment.doctor_first_name,
                    appointment.doctor_last_name
                ].filter(Boolean).join(' ') ||
                appointment.doctor_id ||
                '—';

            const date =
                appointment.appointment_date ||
                appointment.date ||
                '';

            const time =
                appointment.appointment_time ||
                appointment.time ||
                '';

            const status =
                appointment.status ||
                'scheduled';

            const type =
                appointment.appointment_type ||
                appointment.type ||
                '—';

            const reason =
                appointment.reason ||
                appointment.visit_reason ||
                '—';

            return `
                <tr data-appointment-id="${escapeHtml(id)}">
                    <td>
                        ${escapeHtml(id)}
                    </td>

                    <td>
                        ${escapeHtml(patientName)}
                    </td>

                    <td>
                        ${escapeHtml(doctorName)}
                    </td>

                    <td>
                        ${escapeHtml(formatDate(date))}
                    </td>

                    <td>
                        ${escapeHtml(time)}
                    </td>

                    <td>
                        ${escapeHtml(capitalize(type))}
                    </td>

                    <td>
                        ${escapeHtml(reason)}
                    </td>

                    <td>
                        <span class="status status-${escapeHtml(
                            String(status).toLowerCase().replace(/\s+/g, '-')
                        )}">
                            ${escapeHtml(capitalize(status))}
                        </span>
                    </td>

                    <td>
                        ${formatCurrency(
                            appointment.consultation_fee ??
                            appointment.fee ??
                            ''
                        )}
                    </td>

                    <td class="actions">
                        <button
                            type="button"
                            class="btn btn-sm"
                            data-action="view-appointment"
                            data-id="${escapeHtml(id)}"
                        >
                            View
                        </button>

                        <button
                            type="button"
                            class="btn btn-sm"
                            data-action="edit-appointment"
                            data-id="${escapeHtml(id)}"
                        >
                            Edit
                        </button>

                        ${
                            String(status).toLowerCase() !== 'cancelled'
                                ? `
                                    <button
                                        type="button"
                                        class="btn btn-sm"
                                        data-action="cancel-appointment"
                                        data-id="${escapeHtml(id)}"
                                    >
                                        Cancel
                                    </button>
                                `
                                : ''
                        }

                        <button
                            type="button"
                            class="btn btn-sm btn-danger"
                            data-action="delete-appointment"
                            data-id="${escapeHtml(id)}"
                        >
                            Delete
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
    }

    // ------------------------------------------------------------
    // Render pagination
    // ------------------------------------------------------------

    function renderPagination(
        total = state.total,
        page = state.currentPage,
        limit = state.perPage,
        selector = '#appointmentsPagination'
    ) {
        const container = getElement(selector);

        if (!container) {
            return;
        }

        const totalPages = Math.ceil(total / limit);

        if (totalPages <= 1) {
            container.innerHTML = '';
            return;
        }

        let html = `
            <div class="pagination">
                <button
                    type="button"
                    class="pagination-prev"
                    data-page="${page - 1}"
                    ${page <= 1 ? 'disabled' : ''}
                >
                    Previous
                </button>
        `;

        const maxVisiblePages = 5;

        let startPage = Math.max(
            1,
            page - Math.floor(maxVisiblePages / 2)
        );

        let endPage = Math.min(
            totalPages,
            startPage + maxVisiblePages - 1
        );

        if (endPage - startPage + 1 < maxVisiblePages) {
            startPage = Math.max(
                1,
                endPage - maxVisiblePages + 1
            );
        }

        for (let current = startPage; current <= endPage; current++) {
            html += `
                <button
                    type="button"
                    class="pagination-page ${
                        current === page ? 'active' : ''
                    }"
                    data-page="${current}"
                    ${
                        current === page
                            ? 'aria-current="page"'
                            : ''
                    }
                >
                    ${current}
                </button>
            `;
        }

        html += `
                <button
                    type="button"
                    class="pagination-next"
                    data-page="${page + 1}"
                    ${page >= totalPages ? 'disabled' : ''}
                >
                    Next
                </button>
            </div>

            <div class="pagination-info">
                Page ${page} of ${totalPages}
                (${total} appointment${total === 1 ? '' : 's'})
            </div>
        `;

        container.innerHTML = html;
    }

    // ------------------------------------------------------------
    // Show appointment details
    // ------------------------------------------------------------

    async function showDetails(
        id,
        containerSelector = '#appointmentDetails'
    ) {
        const container = getElement(containerSelector);

        try {
            const appointment = await get(id);

            if (!container) {
                return appointment;
            }

            if (!appointment) {
                container.innerHTML = `
                    <div class="empty-state">
                        Appointment not found.
                    </div>
                `;

                return null;
            }

            const patientName =
                appointment.patient_name ||
                appointment.patient_full_name ||
                [
                    appointment.patient_first_name,
                    appointment.patient_last_name
                ].filter(Boolean).join(' ') ||
                appointment.patient_id ||
                '—';

            const doctorName =
                appointment.doctor_name ||
                appointment.doctor_full_name ||
                [
                    appointment.doctor_first_name,
                    appointment.doctor_last_name
                ].filter(Boolean).join(' ') ||
                appointment.doctor_id ||
                '—';

            const date =
                appointment.appointment_date ||
                appointment.date ||
                '';

            const time =
                appointment.appointment_time ||
                appointment.time ||
                '';

            container.innerHTML = `
                <div class="appointment-details">
                    <div class="detail-row">
                        <strong>Appointment ID:</strong>
                        <span>${escapeHtml(
                            getAppointmentId(appointment)
                        )}</span>
                    </div>

                    <div class="detail-row">
                        <strong>Patient:</strong>
                        <span>${escapeHtml(patientName)}</span>
                    </div>

                    <div class="detail-row">
                        <strong>Doctor:</strong>
                        <span>${escapeHtml(doctorName)}</span>
                    </div>

                    <div class="detail-row">
                        <strong>Date:</strong>
                        <span>${escapeHtml(
                            formatDate(date)
                        )}</span>
                    </div>

                    <div class="detail-row">
                        <strong>Time:</strong>
                        <span>${escapeHtml(time)}</span>
                    </div>

                    <div class="detail-row">
                        <strong>Type:</strong>
                        <span>${escapeHtml(
                            capitalize(
                                appointment.appointment_type ||
                                appointment.type ||
                                ''
                            )
                        )}</span>
                    </div>

                    <div class="detail-row">
                        <strong>Status:</strong>
                        <span>${escapeHtml(
                            capitalize(
                                appointment.status || ''
                            )
                        )}</span>
                    </div>

                    <div class="detail-row">
                        <strong>Priority:</strong>
                        <span>${escapeHtml(
                            capitalize(
                                appointment.priority || ''
                            )
                        )}</span>
                    </div>

                    <div class="detail-row">
                        <strong>Duration:</strong>
                        <span>
                            ${
                                appointment.duration_minutes
                                    ? `${escapeHtml(
                                        appointment.duration_minutes
                                    )} minutes`
                                    : '—'
                            }
                        </span>
                    </div>

                    <div class="detail-row">
                        <strong>Reason:</strong>
                        <span>${escapeHtml(
                            appointment.reason ||
                            appointment.visit_reason ||
                            '—'
                        )}</span>
                    </div>

                    <div class="detail-row">
                        <strong>Symptoms:</strong>
                        <span>${escapeHtml(
                            appointment.symptoms || '—'
                        )}</span>
                    </div>

                    <div class="detail-row">
                        <strong>Notes:</strong>
                        <span>${escapeHtml(
                            appointment.notes ||
                            appointment.description ||
                            '—'
                        )}</span>
                    </div>

                    <div class="detail-row">
                        <strong>Location:</strong>
                        <span>${escapeHtml(
                            appointment.location || '—'
                        )}</span>
                    </div>

                    <div class="detail-row">
                        <strong>Room:</strong>
                        <span>${escapeHtml(
                            appointment.room_number ||
                            appointment.room ||
                            '—'
                        )}</span>
                    </div>

                    <div class="detail-row">
                        <strong>Consultation Fee:</strong>
                        <span>${escapeHtml(
                            formatCurrency(
                                appointment.consultation_fee ??
                                appointment.fee ??
                                ''
                            )
                        )}</span>
                    </div>

                    ${
                        appointment.cancellation_reason
                            ? `
                                <div class="detail-row">
                                    <strong>Cancellation Reason:</strong>
                                    <span>${escapeHtml(
                                        appointment.cancellation_reason
                                    )}</span>
                                </div>
                            `
                            : ''
                    }
                </div>
            `;

            return appointment;
        } catch (error) {
            if (container) {
                container.innerHTML = `
                    <div class="message error">
                        Unable to load appointment details.
                    </div>
                `;
            }

            throw error;
        }
    }

    // ------------------------------------------------------------
    // Load appointment into edit form
    // ------------------------------------------------------------

    async function loadAppointmentIntoForm(
        id,
        formSelector = '#editAppointmentForm'
    ) {
        const form = getElement(formSelector);

        if (!form) {
            throw new Error('Edit appointment form was not found.');
        }

        const appointment = await get(id);

        if (!appointment) {
            throw new Error('Appointment was not found.');
        }

        const values = {
            id: getAppointmentId(appointment),

            appointment_id: getAppointmentId(appointment),

            patient_id:
                appointment.patient_id ?? '',

            doctor_id:
                appointment.doctor_id ?? '',

            appointment_date:
                appointment.appointment_date ??
                appointment.date ??
                '',

            appointment_time:
                appointment.appointment_time ??
                appointment.time ??
                '',

            duration_minutes:
                appointment.duration_minutes ??
                appointment.duration ??
                '',

            appointment_type:
                appointment.appointment_type ??
                appointment.type ??
                '',

            reason:
                appointment.reason ??
                appointment.visit_reason ??
                '',

            symptoms:
                appointment.symptoms ??
                '',

            notes:
                appointment.notes ??
                appointment.description ??
                '',

            consultation_fee:
                appointment.consultation_fee ??
                appointment.fee ??
                '',

            status:
                appointment.status ??
                '',

            priority:
                appointment.priority ??
                '',

            location:
                appointment.location ??
                '',

            room_number:
                appointment.room_number ??
                appointment.room ??
                '',

            cancellation_reason:
                appointment.cancellation_reason ??
                ''
        };

        Object.keys(values).forEach(name => {
            const field = form.elements[name];

            if (!field) {
                return;
            }

            if (
                field.type === 'checkbox' ||
                field.type === 'radio'
            ) {
                field.checked = String(field.value) === String(values[name]);
            } else {
                field.value = values[name] ?? '';
            }
        });

        return appointment;
    }

    // ------------------------------------------------------------
    // Form submission handlers
    // ------------------------------------------------------------

    function setupForms() {
        const createForms = [
            '#appointmentForm',
            '#createAppointmentForm'
        ];

        createForms.forEach(selector => {
            const form = getElement(selector);

            if (!form) {
                return;
            }

            form.addEventListener('submit', async event => {
                event.preventDefault();

                const submitButton =
                    form.querySelector('[type="submit"]');

                if (submitButton) {
                    submitButton.disabled = true;
                }

                try {
                    await submitCreateForm(form);
                } catch (error) {
                    console.error(error);
                } finally {
                    if (submitButton) {
                        submitButton.disabled = false;
                    }
                }
            });
        });

        const editForm = getElement('#editAppointmentForm');

        if (editForm) {
            editForm.addEventListener('submit', async event => {
                event.preventDefault();

                const appointmentId =
                    editForm.dataset.appointmentId ||
                    editForm.elements.id?.value ||
                    editForm.elements.appointment_id?.value;

                const submitButton =
                    editForm.querySelector('[type="submit"]');

                if (submitButton) {
                    submitButton.disabled = true;
                }

                try {
                    await submitUpdateForm(
                        editForm,
                        appointmentId
                    );
                } catch (error) {
                    console.error(error);
                } finally {
                    if (submitButton) {
                        submitButton.disabled = false;
                    }
                }
            });
        }
    }

    // ------------------------------------------------------------
    // Search/filter handlers
    // ------------------------------------------------------------

    function setupSearchAndFilters() {
        const searchInput = getElement('#appointmentSearch');

        if (searchInput) {
            let timeout;

            searchInput.addEventListener('input', event => {
                clearTimeout(timeout);

                timeout = setTimeout(() => {
                    search(event.target.value);
                }, 300);
            });
        }

        const applyButton =
            getElement('#applyAppointmentFilters');

        if (applyButton) {
            applyButton.addEventListener('click', () => {
                filter({
                    status: getValue(
                        getElement('#appointmentStatusFilter')
                    ),

                    appointment_type: getValue(
                        getElement('#appointmentTypeFilter')
                    ),

                    doctor_id: getValue(
                        getElement('#appointmentDoctorFilter')
                    ),

                    patient_id: getValue(
                        getElement('#appointmentPatientFilter')
                    ),

                    date_from: getValue(
                        getElement('#appointmentDateFrom')
                    ),

                    date_to: getValue(
                        getElement('#appointmentDateTo')
                    )
                });
            });
        }

        const clearButton =
            getElement('#clearAppointmentFilters');

        if (clearButton) {
            clearButton.addEventListener('click', async () => {
                const fields = [
                    '#appointmentSearch',
                    '#appointmentStatusFilter',
                    '#appointmentTypeFilter',
                    '#appointmentDoctorFilter',
                    '#appointmentPatientFilter',
                    '#appointmentDateFrom',
                    '#appointmentDateTo'
                ];

                fields.forEach(selector => {
                    const element = getElement(selector);

                    if (element) {
                        element.value = '';
                    }
                });

                state.search = '';
                state.status = '';
                state.appointmentType = '';
                state.doctorId = '';
                state.patientId = '';
                state.dateFrom = '';
                state.dateTo = '';
                state.currentPage = 1;

                await list({
                    page: 1,
                    limit: state.perPage
                });
            });
        }

        const perPageSelect =
            getElement('#appointmentsPerPage');

        if (perPageSelect) {
            perPageSelect.addEventListener('change', () => {
                const value = Number(perPageSelect.value);

                if (!Number.isNaN(value) && value > 0) {
                    state.perPage = value;
                    state.currentPage = 1;

                    list({
                        page: 1,
                        limit: value
                    });
                }
            });
        }
    }

    // ------------------------------------------------------------
    // Table actions
    // ------------------------------------------------------------

    function setupTableActions() {
        document.addEventListener('click', async event => {
            const button = event.target.closest(
                '[data-action]'
            );

            if (!button) {
                return;
            }

            const action = button.dataset.action;
            const id = button.dataset.id;

            if (!id) {
                return;
            }

            try {
                switch (action) {
                    case 'view-appointment':
                        await showDetails(id);
                        break;

                    case 'edit-appointment':
                        await loadAppointmentIntoForm(id);

                        document.dispatchEvent(
                            new CustomEvent(
                                'appointment:edit',
                                {
                                    detail: {
                                        id: id,
                                        appointment:
                                            state.currentAppointment
                                    }
                                }
                            )
                        );
                        break;

                    case 'cancel-appointment':
                        await cancelWithConfirmation(id);
                        break;

                    case 'delete-appointment':
                        await deleteWithConfirmation(id);
                        break;

                    default:
                        break;
                }
            } catch (error) {
                console.error(
                    `Appointment action "${action}" failed:`,
                    error
                );
            }
        });
    }

    // ------------------------------------------------------------
    // Pagination actions
    // ------------------------------------------------------------

    function setupPagination() {
        document.addEventListener('click', event => {
            const button = event.target.closest(
                '#appointmentsPagination [data-page]'
            );

            if (!button || button.disabled) {
                return;
            }

            const page = Number(button.dataset.page);

            if (!Number.isNaN(page)) {
                goToPage(page);
            }
        });
    }

    // ------------------------------------------------------------
    // Initialize
    // ------------------------------------------------------------

    async function init(options = {}) {
        if (options.perPage) {
            state.perPage = Number(options.perPage);
        }

        setupForms();
        setupSearchAndFilters();
        setupTableActions();
        setupPagination();

        const hasAppointmentUI =
            getElement('#appointmentsTableBody') ||
            getElement('#appointmentForm') ||
            getElement('#createAppointmentForm') ||
            getElement('#editAppointmentForm');

        if (!hasAppointmentUI) {
            return;
        }

        try {
            await list({
                page: 1,
                limit: state.perPage
            });
        } catch (error) {
            console.error(
                'Appointment module initialization failed:',
                error
            );
        }
    }

    // ------------------------------------------------------------
    // Public API
    // ------------------------------------------------------------

    const Appointments = {
        state,

        endpoints,

        list,
        get,
        create,
        update,
        cancel,
        remove,

        search,
        filter,

        goToPage,
        nextPage,
        previousPage,

        validateAppointment,
        normalizeAppointmentData,
        formToObject,

        submitCreateForm,
        submitUpdateForm,

        deleteWithConfirmation,
        cancelWithConfirmation,

        refreshList,

        renderAppointmentTable,
        renderPagination,

        showDetails,
        loadAppointmentIntoForm,

        init
    };

    window.Appointments = Appointments;

    // ------------------------------------------------------------
    // Auto initialization
    // ------------------------------------------------------------

    if (document.readyState === 'loading') {
        document.addEventListener(
            'DOMContentLoaded',
            () => init()
        );
    } else {
        init();
    }

})(window, document);

patient_id
doctor_id
appointment_date
appointment_time
duration_minutes
appointment_type
reason
symptoms
notes
consultation_fee
status
priority
location
room_number
cancellation_reason