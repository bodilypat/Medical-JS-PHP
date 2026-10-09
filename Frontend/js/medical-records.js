/**
 * Frontend/js/medical-records.js
 * Medical Management System
 *
 * Medical record CRUD operations and UI handling.
 *
 * Expected API endpoints:
 * GET  /medical-records/list.php
 * GET  /medical-records/get.php?id=123
 * POST /medical-records/create.php
 * POST /medical-records/update.php
 * POST /medical-records/delete.php
 */

(function (window, document) {
    'use strict';

    const API = window.API;

    if (!API) {
        console.error(
            'API module is not loaded. Load api.js before medical-records.js.'
        );
        return;
    }

    // ============================================================
    // State
    // ============================================================

    const state = {
        records: [],
        currentRecord: null,

        currentPage: 1,
        perPage: 10,
        total: 0,

        search: '',
        patientId: '',
        doctorId: '',
        recordType: '',
        status: '',
        dateFrom: '',
        dateTo: '',

        loading: false
    };

    // ============================================================
    // API endpoints
    // ============================================================

    const endpoints = {
        list: '/medical-records/list.php',
        get: '/medical-records/get.php',
        create: '/medical-records/create.php',
        update: '/medical-records/update.php',
        delete: '/medical-records/delete.php'
    };

    // ============================================================
    // Utility functions
    // ============================================================

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

    function getValue(selector) {
        const element =
            typeof selector === 'string'
                ? getElement(selector)
                : selector;

        return element ? element.value.trim() : '';
    }

    function showMessage(
        message,
        type = 'success',
        selector = '#medicalRecordMessage'
    ) {
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

    function clearMessage(
        selector = '#medicalRecordMessage'
    ) {
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
            .querySelectorAll('[data-medical-records-loading]')
            .forEach(element => {
                element.hidden = !loading;
            });

        document
            .querySelectorAll('[data-medical-records-content]')
            .forEach(element => {
                element.hidden = loading;
            });
    }

    function capitalize(value) {
        if (!value) {
            return '';
        }

        return String(value)
            .replace(/[_-]/g, ' ')
            .replace(/\b\w/g, character =>
                character.toUpperCase()
            );
    }

    function formatDate(value) {
        if (!value) {
            return '';
        }

        const date = new Date(`${value}T00:00:00`);

        if (Number.isNaN(date.getTime())) {
            return value;
        }

        return date.toLocaleDateString(undefined, {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    }

    function formatDateTime(value) {
        if (!value) {
            return '';
        }

        const date = new Date(value);

        if (Number.isNaN(date.getTime())) {
            return value;
        }

        return date.toLocaleString(undefined, {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit'
        });
    }

    function getRecordId(record) {
        return (
            record?.id ??
            record?.medical_record_id ??
            record?.record_id ??
            ''
        );
    }

    function getPatientName(record) {
        return (
            record?.patient_name ||
            record?.patient_full_name ||
            [
                record?.patient_first_name,
                record?.patient_last_name
            ]
                .filter(Boolean)
                .join(' ') ||
            record?.patient_id ||
            '—'
        );
    }

    function getDoctorName(record) {
        return (
            record?.doctor_name ||
            record?.doctor_full_name ||
            [
                record?.doctor_first_name,
                record?.doctor_last_name
            ]
                .filter(Boolean)
                .join(' ') ||
            record?.doctor_id ||
            '—'
        );
    }

    // ============================================================
    // List medical records
    // ============================================================

    async function list(options = {}) {
        const page = Number(
            options.page ||
            state.currentPage ||
            1
        );

        const limit = Number(
            options.limit ||
            state.perPage ||
            10
        );

        const params = new URLSearchParams();

        params.set('page', page);
        params.set('limit', limit);

        const search =
            options.search ??
            state.search;

        const patientId =
            options.patient_id ??
            state.patientId;

        const doctorId =
            options.doctor_id ??
            state.doctorId;

        const recordType =
            options.record_type ??
            state.recordType;

        const status =
            options.status ??
            state.status;

        const dateFrom =
            options.date_from ??
            state.dateFrom;

        const dateTo =
            options.date_to ??
            state.dateTo;

        if (search) {
            params.set('search', search);
        }

        if (patientId) {
            params.set('patient_id', patientId);
        }

        if (doctorId) {
            params.set('doctor_id', doctorId);
        }

        if (recordType) {
            params.set('record_type', recordType);
        }

        if (status) {
            params.set('status', status);
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

            const records =
                response?.data?.records ??
                response?.data?.medical_records ??
                response?.records ??
                response?.medical_records ??
                response?.data ??
                [];

            state.records = Array.isArray(records)
                ? records
                : [];

            state.total =
                Number(
                    response?.data?.total ??
                    response?.total ??
                    state.records.length
                ) || 0;

            state.currentPage = page;
            state.perPage = limit;

            renderMedicalRecordTable();
            renderPagination(
                state.total,
                state.currentPage,
                state.perPage
            );

            return response;
        } catch (error) {
            console.error(
                'Failed to load medical records:',
                error
            );

            state.records = [];
            state.total = 0;

            renderMedicalRecordTable();
            renderPagination(0, page, limit);

            showMessage(
                error?.message ||
                'Unable to load medical records.',
                'error'
            );

            throw error;
        } finally {
            setLoading(false);
        }
    }

    // ============================================================
    // Get medical record
    // ============================================================

    async function get(id) {
        if (!id) {
            throw new Error(
                'Medical record ID is required.'
            );
        }

        try {
            const response = await API.get(
                `${endpoints.get}?id=${encodeURIComponent(id)}`
            );

            const record =
                response?.data?.record ??
                response?.data?.medical_record ??
                response?.record ??
                response?.medical_record ??
                response?.data ??
                null;

            state.currentRecord = record;

            return record;
        } catch (error) {
            console.error(
                'Failed to get medical record:',
                error
            );

            showMessage(
                error?.message ||
                'Unable to load medical record.',
                'error'
            );

            throw error;
        }
    }

    // ============================================================
    // Create medical record
    // ============================================================

    async function create(recordData) {
        const data =
            normalizeMedicalRecordData(recordData);

        const validation =
            validateMedicalRecord(data);

        if (!validation.valid) {
            throw new Error(
                validation.errors.join(' ')
            );
        }

        setLoading(true);

        try {
            const response = await API.post(
                endpoints.create,
                data
            );

            showMessage(
                response?.message ||
                'Medical record created successfully.',
                'success'
            );

            state.currentPage = 1;

            await list({
                page: 1,
                limit: state.perPage
            });

            return response;
        } catch (error) {
            console.error(
                'Failed to create medical record:',
                error
            );

            showMessage(
                error?.message ||
                'Unable to create medical record.',
                'error'
            );

            throw error;
        } finally {
            setLoading(false);
        }
    }

    // ============================================================
    // Update medical record
    // ============================================================

    async function update(id, recordData) {
        if (!id) {
            throw new Error(
                'Medical record ID is required.'
            );
        }

        const data =
            normalizeMedicalRecordData(recordData);

        data.id = id;
        data.medical_record_id = id;
        data.record_id = id;

        const validation =
            validateMedicalRecord(data);

        if (!validation.valid) {
            throw new Error(
                validation.errors.join(' ')
            );
        }

        setLoading(true);

        try {
            const response = await API.post(
                endpoints.update,
                data
            );

            showMessage(
                response?.message ||
                'Medical record updated successfully.',
                'success'
            );

            await list({
                page: state.currentPage,
                limit: state.perPage
            });

            return response;
        } catch (error) {
            console.error(
                'Failed to update medical record:',
                error
            );

            showMessage(
                error?.message ||
                'Unable to update medical record.',
                'error'
            );

            throw error;
        } finally {
            setLoading(false);
        }
    }

    // ============================================================
    // Delete medical record
    // ============================================================

    async function remove(id) {
        if (!id) {
            throw new Error(
                'Medical record ID is required.'
            );
        }

        try {
            const response = await API.post(
                endpoints.delete,
                {
                    id: id,
                    medical_record_id: id,
                    record_id: id
                }
            );

            showMessage(
                response?.message ||
                'Medical record deleted successfully.',
                'success'
            );

            if (
                state.records.length === 1 &&
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
            console.error(
                'Failed to delete medical record:',
                error
            );

            showMessage(
                error?.message ||
                'Unable to delete medical record.',
                'error'
            );

            throw error;
        }
    }

    // ============================================================
    // Search
    // ============================================================

    async function search(term) {
        state.search =
            String(term || '').trim();

        state.currentPage = 1;

        return list({
            page: 1,
            limit: state.perPage,
            search: state.search
        });
    }

    // ============================================================
    // Filter
    // ============================================================

    async function filter(filters = {}) {
        state.patientId =
            filters.patient_id ??
            filters.patientId ??
            '';

        state.doctorId =
            filters.doctor_id ??
            filters.doctorId ??
            '';

        state.recordType =
            filters.record_type ??
            filters.recordType ??
            filters.type ??
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

        state.currentPage = 1;

        return list({
            page: 1,
            limit: state.perPage,

            search: state.search,
            patient_id: state.patientId,
            doctor_id: state.doctorId,
            record_type: state.recordType,
            status: state.status,
            date_from: state.dateFrom,
            date_to: state.dateTo
        });
    }

    // ============================================================
    // Pagination
    // ============================================================

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
            Math.min(
                Math.max(
                    Number(page) || 1,
                    1
                ),
                totalPages
            );

        if (
            targetPage === state.currentPage &&
            state.records.length
        ) {
            return;
        }

        return list({
            page: targetPage,
            limit: state.perPage
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

    // ============================================================
    // Validate medical record
    // ============================================================

    function validateMedicalRecord(record) {
        const errors = [];

        if (!record.patient_id) {
            errors.push(
                'Patient is required.'
            );
        }

        if (!record.doctor_id) {
            errors.push(
                'Doctor is required.'
            );
        }

        if (!record.record_date) {
            errors.push(
                'Record date is required.'
            );
        }

        if (!record.record_type) {
            errors.push(
                'Record type is required.'
            );
        }

        if (
            record.patient_id &&
            !/^\d+$/.test(
                String(record.patient_id)
            )
        ) {
            errors.push(
                'Patient ID must be valid.'
            );
        }

        if (
            record.doctor_id &&
            !/^\d+$/.test(
                String(record.doctor_id)
            )
        ) {
            errors.push(
                'Doctor ID must be valid.'
            );
        }

        if (record.record_date) {
            const date =
                new Date(
                    `${record.record_date}T00:00:00`
                );

            if (
                Number.isNaN(
                    date.getTime()
                )
            ) {
                errors.push(
                    'Record date is invalid.'
                );
            }
        }

        return {
            valid: errors.length === 0,
            errors
        };
    }

    // ============================================================
    // Normalize medical record data
    // ============================================================

    function normalizeMedicalRecordData(
        record = {}
    ) {
        return {
            patient_id:
                record.patient_id ?? '',

            doctor_id:
                record.doctor_id ?? '',

            appointment_id:
                record.appointment_id ?? '',

            record_date:
                record.record_date ??
                record.date ??
                '',

            record_type:
                record.record_type ??
                record.type ??
                '',

            chief_complaint:
                record.chief_complaint ??
                record.complaint ??
                '',

            symptoms:
                record.symptoms ??
                '',

            diagnosis:
                record.diagnosis ??
                '',

            diagnosis_code:
                record.diagnosis_code ??
                '',

            treatment:
                record.treatment ??
                '',

            treatment_plan:
                record.treatment_plan ??
                '',

            medications:
                record.medications ??
                '',

            allergies:
                record.allergies ??
                '',

            medical_history:
                record.medical_history ??
                '',

            surgical_history:
                record.surgical_history ??
                '',

            family_history:
                record.family_history ??
                '',

            social_history:
                record.social_history ??
                '',

            vital_signs:
                record.vital_signs ??
                '',

            blood_pressure:
                record.blood_pressure ??
                '',

            heart_rate:
                record.heart_rate ??
                '',

            respiratory_rate:
                record.respiratory_rate ??
                '',

            temperature:
                record.temperature ??
                '',

            oxygen_saturation:
                record.oxygen_saturation ??
                '',

            height:
                record.height ??
                '',

            weight:
                record.weight ??
                '',

            lab_results:
                record.lab_results ??
                '',

            imaging_results:
                record.imaging_results ??
                '',

            notes:
                record.notes ??
                '',

            status:
                record.status ??
                'active'
        };
    }

    // ============================================================
    // Convert form to object
    // ============================================================

    function formToObject(form) {
        const data = {};

        if (!form) {
            return data;
        }

        const formData =
            new FormData(form);

        formData.forEach((value, key) => {
            data[key] =
                typeof value === 'string'
                    ? value.trim()
                    : value;
        });

        return data;
    }

    // ============================================================
    // Create form submission
    // ============================================================

    async function submitCreateForm(form) {
        if (!form) {
            throw new Error(
                'Medical record form was not found.'
            );
        }

        clearMessage();

        const data =
            formToObject(form);

        try {
            const response =
                await create(data);

            form.reset();

            return response;
        } catch (error) {
            showMessage(
                error?.message ||
                'Unable to create medical record.',
                'error'
            );

            throw error;
        }
    }

    // ============================================================
    // Update form submission
    // ============================================================

    async function submitUpdateForm(
        form,
        recordId
    ) {
        if (!form) {
            throw new Error(
                'Medical record form was not found.'
            );
        }

        if (!recordId) {
            throw new Error(
                'Medical record ID is required.'
            );
        }

        clearMessage();

        const data =
            formToObject(form);

        try {
            return await update(
                recordId,
                data
            );
        } catch (error) {
            showMessage(
                error?.message ||
                'Unable to update medical record.',
                'error'
            );

            throw error;
        }
    }

    // ============================================================
    // Delete confirmation
    // ============================================================

    async function deleteWithConfirmation(id) {
        if (!id) {
            return;
        }

        const record =
            state.records.find(
                item =>
                    String(
                        getRecordId(item)
                    ) === String(id)
            );

        const patientName =
            record
                ? getPatientName(record)
                : 'this patient';

        const confirmed =
            window.confirm(
                `Are you sure you want to permanently delete the medical record for ${patientName}?`
            );

        if (!confirmed) {
            return;
        }

        return remove(id);
    }

    // ============================================================
    // Refresh list
    // ============================================================

    async function refreshList() {
        return list({
            page: state.currentPage,
            limit: state.perPage
        });
    }

    // ============================================================
    // Render medical record table
    // ============================================================

    function renderMedicalRecordTable(
        records = state.records,
        selector = '#medicalRecordsTableBody'
    ) {
        const tbody =
            getElement(selector);

        if (!tbody) {
            return;
        }

        if (!records.length) {
            tbody.innerHTML = `
                <tr>
                    <td
                        colspan="10"
                        class="empty-state"
                    >
                        No medical records found.
                    </td>
                </tr>
            `;

            return;
        }

        tbody.innerHTML =
            records.map(record => {
                const id =
                    getRecordId(record);

                const patientName =
                    getPatientName(record);

                const doctorName =
                    getDoctorName(record);

                const recordDate =
                    record.record_date ??
                    record.date ??
                    '';

                const recordType =
                    record.record_type ??
                    record.type ??
                    '';

                const diagnosis =
                    record.diagnosis ??
                    '—';

                const status =
                    record.status ??
                    'active';

                return `
                    <tr
                        data-medical-record-id="${escapeHtml(id)}"
                    >
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
                            ${escapeHtml(
                                formatDate(recordDate)
                            )}
                        </td>

                        <td>
                            ${escapeHtml(
                                capitalize(recordType)
                            )}
                        </td>

                        <td>
                            ${escapeHtml(diagnosis)}
                        </td>

                        <td>
                            <span
                                class="status status-${escapeHtml(
                                    String(status)
                                        .toLowerCase()
                                        .replace(
                                            /\s+/g,
                                            '-'
                                        )
                                )}"
                            >
                                ${escapeHtml(
                                    capitalize(status)
                                )}
                            </span>
                        </td>

                        <td>
                            ${escapeHtml(
                                record.updated_at
                                    ? formatDateTime(
                                        record.updated_at
                                    )
                                    : '—'
                            )}
                        </td>

                        <td class="actions">
                            <button
                                type="button"
                                class="btn btn-sm"
                                data-action="view-medical-record"
                                data-id="${escapeHtml(id)}"
                            >
                                View
                            </button>

                            <button
                                type="button"
                                class="btn btn-sm"
                                data-action="edit-medical-record"
                                data-id="${escapeHtml(id)}"
                            >
                                Edit
                            </button>

                            <button
                                type="button"
                                class="btn btn-sm btn-danger"
                                data-action="delete-medical-record"
                                data-id="${escapeHtml(id)}"
                            >
                                Delete
                            </button>
                        </td>
                    </tr>
                `;
            }).join('');
    }

    // ============================================================
    // Render pagination
    // ============================================================

    function renderPagination(
        total = state.total,
        page = state.currentPage,
        limit = state.perPage,
        selector = '#medicalRecordsPagination'
    ) {
        const container =
            getElement(selector);

        if (!container) {
            return;
        }

        const totalPages =
            Math.ceil(total / limit);

        if (totalPages <= 1) {
            container.innerHTML = '';
            return;
        }

        const maxVisiblePages = 5;

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

        let html = `
            <div class="pagination">

                <button
                    type="button"
                    data-page="${page - 1}"
                    ${page <= 1 ? 'disabled' : ''}
                >
                    Previous
                </button>
        `;

        for (
            let current = startPage;
            current <= endPage;
            current++
        ) {
            html += `
                <button
                    type="button"
                    data-page="${current}"
                    class="${
                        current === page
                            ? 'active'
                            : ''
                    }"
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
                    data-page="${page + 1}"
                    ${page >= totalPages ? 'disabled' : ''}
                >
                    Next
                </button>

            </div>

            <div class="pagination-info">
                Page ${page} of ${totalPages}
                (${total}
                medical record${total === 1 ? '' : 's'})
            </div>
        `;

        container.innerHTML = html;
    }

    // ============================================================
    // Show medical record details
    // ============================================================

    async function showDetails(
        id,
        containerSelector =
            '#medicalRecordDetails'
    ) {
        const container =
            getElement(containerSelector);

        try {
            const record =
                await get(id);

            if (!container) {
                return record;
            }

            if (!record) {
                container.innerHTML = `
                    <div class="empty-state">
                        Medical record not found.
                    </div>
                `;

                return null;
            }

            const recordDate =
                record.record_date ??
                record.date ??
                '';

            const recordType =
                record.record_type ??
                record.type ??
                '';

            container.innerHTML = `
                <div class="medical-record-details">

                    <div class="detail-section">
                        <h3>Record Information</h3>

                        <div class="detail-row">
                            <strong>Record ID:</strong>
                            <span>
                                ${escapeHtml(
                                    getRecordId(record)
                                )}
                            </span>
                        </div>

                        <div class="detail-row">
                            <strong>Patient:</strong>
                            <span>
                                ${escapeHtml(
                                    getPatientName(record)
                                )}
                            </span>
                        </div>

                        <div class="detail-row">
                            <strong>Doctor:</strong>
                            <span>
                                ${escapeHtml(
                                    getDoctorName(record)
                                )}
                            </span>
                        </div>

                        <div class="detail-row">
                            <strong>Appointment ID:</strong>
                            <span>
                                ${escapeHtml(
                                    record.appointment_id ||
                                    '—'
                                )}
                            </span>
                        </div>

                        <div class="detail-row">
                            <strong>Record Date:</strong>
                            <span>
                                ${escapeHtml(
                                    formatDate(recordDate)
                                )}
                            </span>
                        </div>

                        <div class="detail-row">
                            <strong>Record Type:</strong>
                            <span>
                                ${escapeHtml(
                                    capitalize(recordType)
                                )}
                            </span>
                        </div>

                        <div class="detail-row">
                            <strong>Status:</strong>
                            <span>
                                ${escapeHtml(
                                    capitalize(
                                        record.status ||
                                        ''
                                    )
                                )}
                            </span>
                        </div>
                    </div>

                    <div class="detail-section">
                        <h3>Clinical Information</h3>

                        <div class="detail-row">
                            <strong>Chief Complaint:</strong>
                            <span>
                                ${escapeHtml(
                                    record.chief_complaint ||
                                    '—'
                                )}
                            </span>
                        </div>

                        <div class="detail-row">
                            <strong>Symptoms:</strong>
                            <span>
                                ${escapeHtml(
                                    record.symptoms ||
                                    '—'
                                )}
                            </span>
                        </div>

                        <div class="detail-row">
                            <strong>Diagnosis:</strong>
                            <span>
                                ${escapeHtml(
                                    record.diagnosis ||
                                    '—'
                                )}
                            </span>
                        </div>

                        <div class="detail-row">
                            <strong>Diagnosis Code:</strong>
                            <span>
                                ${escapeHtml(
                                    record.diagnosis_code ||
                                    '—'
                                )}
                            </span>
                        </div>

                        <div class="detail-row">
                            <strong>Treatment:</strong>
                            <span>
                                ${escapeHtml(
                                    record.treatment ||
                                    '—'
                                )}
                            </span>
                        </div>

                        <div class="detail-row">
                            <strong>Treatment Plan:</strong>
                            <span>
                                ${escapeHtml(
                                    record.treatment_plan ||
                                    '—'
                                )}
                            </span>
                        </div>

                        <div class="detail-row">
                            <strong>Medications:</strong>
                            <span>
                                ${escapeHtml(
                                    record.medications ||
                                    '—'
                                )}
                            </span>
                        </div>
                    </div>

                    <div class="detail-section">
                        <h3>Medical History</h3>

                        <div class="detail-row">
                            <strong>Allergies:</strong>
                            <span>
                                ${escapeHtml(
                                    record.allergies ||
                                    '—'
                                )}
                            </span>
                        </div>

                        <div class="detail-row">
                            <strong>Medical History:</strong>
                            <span>
                                ${escapeHtml(
                                    record.medical_history ||
                                    '—'
                                )}
                            </span>
                        </div>

                        <div class="detail-row">
                            <strong>Surgical History:</strong>
                            <span>
                                ${escapeHtml(
                                    record.surgical_history ||
                                    '—'
                                )}
                            </span>
                        </div>

                        <div class="detail-row">
                            <strong>Family History:</strong>
                            <span>
                                ${escapeHtml(
                                    record.family_history ||
                                    '—'
                                )}
                            </span>
                        </div>

                        <div class="detail-row">
                            <strong>Social History:</strong>
                            <span>
                                ${escapeHtml(
                                    record.social_history ||
                                    '—'
                                )}
                            </span>
                        </div>
                    </div>

                    <div class="detail-section">
                        <h3>Vital Signs</h3>

                        <div class="detail-row">
                            <strong>Blood Pressure:</strong>
                            <span>
                                ${escapeHtml(
                                    record.blood_pressure ||
                                    '—'
                                )}
                            </span>
                        </div>

                        <div class="detail-row">
                            <strong>Heart Rate:</strong>
                            <span>
                                ${escapeHtml(
                                    record.heart_rate ||
                                    '—'
                                )}
                            </span>
                        </div>

                        <div class="detail-row">
                            <strong>Respiratory Rate:</strong>
                            <span>
                                ${escapeHtml(
                                    record.respiratory_rate ||
                                    '—'
                                )}
                            </span>
                        </div>

                        <div class="detail-row">
                            <strong>Temperature:</strong>
                            <span>
                                ${escapeHtml(
                                    record.temperature ||
                                    '—'
                                )}
                            </span>
                        </div>

                        <div class="detail-row">
                            <strong>Oxygen Saturation:</strong>
                            <span>
                                ${escapeHtml(
                                    record.oxygen_saturation ||
                                    '—'
                                )}
                            </span>
                        </div>

                        <div class="detail-row">
                            <strong>Height:</strong>
                            <span>
                                ${escapeHtml(
                                    record.height ||
                                    '—'
                                )}
                            </span>
                        </div>

                        <div class="detail-row">
                            <strong>Weight:</strong>
                            <span>
                                ${escapeHtml(
                                    record.weight ||
                                    '—'
                                )}
                            </span>
                        </div>
                    </div>

                    <div class="detail-section">
                        <h3>Tests and Results</h3>

                        <div class="detail-row">
                            <strong>Laboratory Results:</strong>
                            <span>
                                ${escapeHtml(
                                    record.lab_results ||
                                    '—'
                                )}
                            </span>
                        </div>

                        <div class="detail-row">
                            <strong>Imaging Results:</strong>
                            <span>
                                ${escapeHtml(
                                    record.imaging_results ||
                                    '—'
                                )}
                            </span>
                        </div>
                    </div>

                    <div class="detail-section">
                        <h3>Notes</h3>

                        <div class="detail-row">
                            <strong>Notes:</strong>
                            <span>
                                ${escapeHtml(
                                    record.notes ||
                                    '—'
                                )}
                            </span>
                        </div>
                    </div>

                </div>
            `;

            return record;
        } catch (error) {
            if (container) {
                container.innerHTML = `
                    <div class="message error">
                        Unable to load medical record details.
                    </div>
                `;
            }

            throw error;
        }
    }

    // ============================================================
    // Load record into edit form
    // ============================================================

    async function loadRecordIntoForm(
        id,
        formSelector =
            '#editMedicalRecordForm'
    ) {
        const form =
            getElement(formSelector);

        if (!form) {
            throw new Error(
                'Edit medical record form was not found.'
            );
        }

        const record =
            await get(id);

        if (!record) {
            throw new Error(
                'Medical record was not found.'
            );
        }

        const values = {
            id: getRecordId(record),

            medical_record_id:
                getRecordId(record),

            record_id:
                getRecordId(record),

            patient_id:
                record.patient_id ?? '',

            doctor_id:
                record.doctor_id ?? '',

            appointment_id:
                record.appointment_id ?? '',

            record_date:
                record.record_date ??
                record.date ??
                '',

            record_type:
                record.record_type ??
                record.type ??
                '',

            chief_complaint:
                record.chief_complaint ??
                '',

            symptoms:
                record.symptoms ??
                '',

            diagnosis:
                record.diagnosis ??
                '',

            diagnosis_code:
                record.diagnosis_code ??
                '',

            treatment:
                record.treatment ??
                '',

            treatment_plan:
                record.treatment_plan ??
                '',

            medications:
                record.medications ??
                '',

            allergies:
                record.allergies ??
                '',

            medical_history:
                record.medical_history ??
                '',

            surgical_history:
                record.surgical_history ??
                '',

            family_history:
                record.family_history ??
                '',

            social_history:
                record.social_history ??
                '',

            vital_signs:
                record.vital_signs ??
                '',

            blood_pressure:
                record.blood_pressure ??
                '',

            heart_rate:
                record.heart_rate ??
                '',

            respiratory_rate:
                record.respiratory_rate ??
                '',

            temperature:
                record.temperature ??
                '',

            oxygen_saturation:
                record.oxygen_saturation ??
                '',

            height:
                record.height ??
                '',

            weight:
                record.weight ??
                '',

            lab_results:
                record.lab_results ??
                '',

            imaging_results:
                record.imaging_results ??
                '',

            notes:
                record.notes ??
                '',

            status:
                record.status ??
                ''
        };

        Object.keys(values).forEach(
            name => {
                const field =
                    form.elements[name];

                if (!field) {
                    return;
                }

                if (
                    field.type === 'checkbox'
                ) {
                    field.checked =
                        Boolean(values[name]);
                } else if (
                    field.type === 'radio'
                ) {
                    field.checked =
                        String(field.value) ===
                        String(values[name]);
                } else {
                    field.value =
                        values[name] ?? '';
                }
            }
        );

        form.dataset.medicalRecordId =
            getRecordId(record);

        return record;
    }

    // ============================================================
    // Form handlers
    // ============================================================

    function setupForms() {
        const createForms = [
            '#medicalRecordForm',
            '#createMedicalRecordForm'
        ];

        createForms.forEach(
            selector => {
                const form =
                    getElement(selector);

                if (!form) {
                    return;
                }

                form.addEventListener(
                    'submit',
                    async event => {
                        event.preventDefault();

                        const submitButton =
                            form.querySelector(
                                '[type="submit"]'
                            );

                        if (submitButton) {
                            submitButton.disabled =
                                true;
                        }

                        try {
                            await submitCreateForm(
                                form
                            );
                        } catch (error) {
                            console.error(error);
                        } finally {
                            if (submitButton) {
                                submitButton.disabled =
                                    false;
                            }
                        }
                    }
                );
            }
        );

        const editForm =
            getElement(
                '#editMedicalRecordForm'
            );

        if (editForm) {
            editForm.addEventListener(
                'submit',
                async event => {
                    event.preventDefault();

                    const recordId =
                        editForm.dataset
                            .medicalRecordId ||
                        editForm.elements.id
                            ?.value ||
                        editForm.elements
                            .medical_record_id
                            ?.value ||
                        editForm.elements
                            .record_id
                            ?.value;

                    const submitButton =
                        editForm.querySelector(
                            '[type="submit"]'
                        );

                    if (submitButton) {
                        submitButton.disabled =
                            true;
                    }

                    try {
                        await submitUpdateForm(
                            editForm,
                            recordId
                        );
                    } catch (error) {
                        console.error(error);
                    } finally {
                        if (submitButton) {
                            submitButton.disabled =
                                false;
                        }
                    }
                }
            );
        }
    }

    // ============================================================
    // Search and filters
    // ============================================================

    function setupSearchAndFilters() {
        const searchInput =
            getElement(
                '#medicalRecordSearch'
            );

        if (searchInput) {
            let timeout;

            searchInput.addEventListener(
                'input',
                event => {
                    clearTimeout(timeout);

                    timeout =
                        setTimeout(() => {
                            search(
                                event.target.value
                            );
                        }, 300);
                }
            );
        }

        const applyButton =
            getElement(
                '#applyMedicalRecordFilters'
            );

        if (applyButton) {
            applyButton.addEventListener(
                'click',
                () => {
                    filter({
                        patient_id:
                            getValue(
                                '#medicalRecordPatientFilter'
                            ),

                        doctor_id:
                            getValue(
                                '#medicalRecordDoctorFilter'
                            ),

                        record_type:
                            getValue(
                                '#medicalRecordTypeFilter'
                            ),

                        status:
                            getValue(
                                '#medicalRecordStatusFilter'
                            ),

                        date_from:
                            getValue(
                                '#medicalRecordDateFrom'
                            ),

                        date_to:
                            getValue(
                                '#medicalRecordDateTo'
                            )
                    });
                }
            );
        }

        const clearButton =
            getElement(
                '#clearMedicalRecordFilters'
            );

        if (clearButton) {
            clearButton.addEventListener(
                'click',
                async () => {
                    const fields = [
                        '#medicalRecordSearch',
                        '#medicalRecordPatientFilter',
                        '#medicalRecordDoctorFilter',
                        '#medicalRecordTypeFilter',
                        '#medicalRecordStatusFilter',
                        '#medicalRecordDateFrom',
                        '#medicalRecordDateTo'
                    ];

                    fields.forEach(
                        selector => {
                            const element =
                                getElement(
                                    selector
                                );

                            if (element) {
                                element.value = '';
                            }
                        }
                    );

                    state.search = '';
                    state.patientId = '';
                    state.doctorId = '';
                    state.recordType = '';
                    state.status = '';
                    state.dateFrom = '';
                    state.dateTo = '';
                    state.currentPage = 1;

                    await list({
                        page: 1,
                        limit: state.perPage
                    });
                }
            );
        }

        const perPageSelect =
            getElement(
                '#medicalRecordsPerPage'
            );

        if (perPageSelect) {
            perPageSelect.addEventListener(
                'change',
                () => {
                    const value =
                        Number(
                            perPageSelect.value
                        );

                    if (
                        !Number.isNaN(value) &&
                        value > 0
                    ) {
                        state.perPage = value;
                        state.currentPage = 1;

                        list({
                            page: 1,
                            limit: value
                        });
                    }
                }
            );
        }
    }

    // ============================================================
    // Table actions
    // ============================================================

    function setupTableActions() {
        document.addEventListener(
            'click',
            async event => {
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

                if (!id) {
                    return;
                }

                try {
                    switch (action) {
                        case 'view-medical-record':
                            await showDetails(id);
                            break;

                        case 'edit-medical-record':
                            await loadRecordIntoForm(
                                id
                            );

                            document.dispatchEvent(
                                new CustomEvent(
                                    'medical-record:edit',
                                    {
                                        detail: {
                                            id: id,
                                            record:
                                                state.currentRecord
                                        }
                                    }
                                )
                            );

                            break;

                        case 'delete-medical-record':
                            await deleteWithConfirmation(
                                id
                            );
                            break;

                        default:
                            break;
                    }
                } catch (error) {
                    console.error(
                        `Medical record action "${action}" failed:`,
                        error
                    );
                }
            }
        );
    }

    // ============================================================
    // Pagination actions
    // ============================================================

    function setupPagination() {
        document.addEventListener(
            'click',
            event => {
                const button =
                    event.target.closest(
                        '#medicalRecordsPagination [data-page]'
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

                if (!Number.isNaN(page)) {
                    goToPage(page);
                }
            }
        );
    }

    // ============================================================
    // Initialize
    // ============================================================

    async function init(options = {}) {
        if (options.perPage) {
            state.perPage =
                Number(options.perPage);
        }

        setupForms();
        setupSearchAndFilters();
        setupTableActions();
        setupPagination();

        const hasMedicalRecordUI =
            getElement(
                '#medicalRecordsTableBody'
            ) ||
            getElement(
                '#medicalRecordForm'
            ) ||
            getElement(
                '#createMedicalRecordForm'
            ) ||
            getElement(
                '#editMedicalRecordForm'
            );

        if (!hasMedicalRecordUI) {
            return;
        }

        try {
            await list({
                page: 1,
                limit: state.perPage
            });
        } catch (error) {
            console.error(
                'Medical records module initialization failed:',
                error
            );
        }
    }

    // ============================================================
    // Public API
    // ============================================================

    const MedicalRecords = {
        state,
        endpoints,

        list,
        get,
        create,
        update,
        remove,

        search,
        filter,

        goToPage,
        nextPage,
        previousPage,

        validateMedicalRecord,
        normalizeMedicalRecordData,
        formToObject,

        submitCreateForm,
        submitUpdateForm,

        deleteWithConfirmation,

        refreshList,

        renderMedicalRecordTable,
        renderPagination,

        showDetails,
        loadRecordIntoForm,

        init
    };

    window.MedicalRecords =
        MedicalRecords;

    // ============================================================
    // Auto initialization
    // ============================================================

    if (
        document.readyState ===
        'loading'
    ) {
        document.addEventListener(
            'DOMContentLoaded',
            () => init()
        );
    } else {
        init();
    }

})(window, document);

MedicalRecords.list()
MedicalRecords.get(id)

MedicalRecords.create(data)
MedicalRecords.update(id, data)
MedicalRecords.remove(id)

MedicalRecords.search(term)
MedicalRecords.filter(filters)

MedicalRecords.goToPage(page)
MedicalRecords.nextPage()
MedicalRecords.previousPage()

MedicalRecords.showDetails(id)
MedicalRecords.loadRecordIntoForm(id)

MedicalRecords.refreshList()

