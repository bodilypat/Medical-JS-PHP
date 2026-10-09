/**
 * Frontend/js/prescriptions.js
 * Medical Management System
 *
 * Prescription CRUD operations and UI handling.
 *
 * Expected API endpoints:
 * GET  /prescriptions/list.php
 * GET  /prescriptions/get.php?id=123
 * POST /prescriptions/create.php
 * POST /prescriptions/update.php
 * POST /prescriptions/cancel.php
 * POST /prescriptions/delete.php
 */

(function (window, document) {
    'use strict';

    const API = window.API;

    if (!API) {
        console.error(
            'API module is not loaded. Load api.js before prescriptions.js.'
        );
        return;
    }

    // ============================================================
    // State
    // ============================================================

    const state = {
        prescriptions: [],
        currentPrescription: null,

        currentPage: 1,
        perPage: 10,
        total: 0,

        search: '',
        patientId: '',
        doctorId: '',
        medicalRecordId: '',
        status: '',
        prescriptionType: '',
        dateFrom: '',
        dateTo: '',

        loading: false
    };

    // ============================================================
    // API endpoints
    // ============================================================

    const endpoints = {
        list: '/prescriptions/list.php',
        get: '/prescriptions/get.php',
        create: '/prescriptions/create.php',
        update: '/prescriptions/update.php',
        cancel: '/prescriptions/cancel.php',
        delete: '/prescriptions/delete.php'
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
        selector = '#prescriptionMessage'
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
        selector = '#prescriptionMessage'
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
            .querySelectorAll('[data-prescriptions-loading]')
            .forEach(element => {
                element.hidden = !loading;
            });

        document
            .querySelectorAll('[data-prescriptions-content]')
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

    function getPrescriptionId(prescription) {
        return (
            prescription?.id ??
            prescription?.prescription_id ??
            ''
        );
    }

    function getPatientName(prescription) {
        return (
            prescription?.patient_name ||
            prescription?.patient_full_name ||
            [
                prescription?.patient_first_name,
                prescription?.patient_last_name
            ]
                .filter(Boolean)
                .join(' ') ||
            prescription?.patient_id ||
            '—'
        );
    }

    function getDoctorName(prescription) {
        return (
            prescription?.doctor_name ||
            prescription?.doctor_full_name ||
            [
                prescription?.doctor_first_name,
                prescription?.doctor_last_name
            ]
                .filter(Boolean)
                .join(' ') ||
            prescription?.doctor_id ||
            '—'
        );
    }

    function getMedicationName(prescription) {
        return (
            prescription?.medication_name ||
            prescription?.medicine_name ||
            prescription?.drug_name ||
            prescription?.medication ||
            prescription?.medicine ||
            '—'
        );
    }

    // ============================================================
    // List prescriptions
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

        const medicalRecordId =
            options.medical_record_id ??
            state.medicalRecordId;

        const status =
            options.status ??
            state.status;

        const prescriptionType =
            options.prescription_type ??
            state.prescriptionType;

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

        if (medicalRecordId) {
            params.set(
                'medical_record_id',
                medicalRecordId
            );
        }

        if (status) {
            params.set('status', status);
        }

        if (prescriptionType) {
            params.set(
                'prescription_type',
                prescriptionType
            );
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

            const prescriptions =
                response?.data?.prescriptions ??
                response?.prescriptions ??
                response?.data ??
                [];

            state.prescriptions =
                Array.isArray(prescriptions)
                    ? prescriptions
                    : [];

            state.total =
                Number(
                    response?.data?.total ??
                    response?.total ??
                    state.prescriptions.length
                ) || 0;

            state.currentPage = page;
            state.perPage = limit;

            renderPrescriptionTable();
            renderPagination(
                state.total,
                state.currentPage,
                state.perPage
            );

            return response;
        } catch (error) {
            console.error(
                'Failed to load prescriptions:',
                error
            );

            state.prescriptions = [];
            state.total = 0;

            renderPrescriptionTable();
            renderPagination(
                0,
                page,
                limit
            );

            showMessage(
                error?.message ||
                'Unable to load prescriptions.',
                'error'
            );

            throw error;
        } finally {
            setLoading(false);
        }
    }

    // ============================================================
    // Get prescription
    // ============================================================

    async function get(id) {
        if (!id) {
            throw new Error(
                'Prescription ID is required.'
            );
        }

        try {
            const response = await API.get(
                `${endpoints.get}?id=${encodeURIComponent(id)}`
            );

            const prescription =
                response?.data?.prescription ??
                response?.prescription ??
                response?.data ??
                null;

            state.currentPrescription =
                prescription;

            return prescription;
        } catch (error) {
            console.error(
                'Failed to get prescription:',
                error
            );

            showMessage(
                error?.message ||
                'Unable to load prescription.',
                'error'
            );

            throw error;
        }
    }

    // ============================================================
    // Create prescription
    // ============================================================

    async function create(prescriptionData) {
        const data =
            normalizePrescriptionData(
                prescriptionData
            );

        const validation =
            validatePrescription(data);

        if (!validation.valid) {
            throw new Error(
                validation.errors.join(' ')
            );
        }

        setLoading(true);

        try {
            const response =
                await API.post(
                    endpoints.create,
                    data
                );

            showMessage(
                response?.message ||
                'Prescription created successfully.',
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
                'Failed to create prescription:',
                error
            );

            showMessage(
                error?.message ||
                'Unable to create prescription.',
                'error'
            );

            throw error;
        } finally {
            setLoading(false);
        }
    }

    // ============================================================
    // Update prescription
    // ============================================================

    async function update(
        id,
        prescriptionData
    ) {
        if (!id) {
            throw new Error(
                'Prescription ID is required.'
            );
        }

        const data =
            normalizePrescriptionData(
                prescriptionData
            );

        data.id = id;
        data.prescription_id = id;

        const validation =
            validatePrescription(data);

        if (!validation.valid) {
            throw new Error(
                validation.errors.join(' ')
            );
        }

        setLoading(true);

        try {
            const response =
                await API.post(
                    endpoints.update,
                    data
                );

            showMessage(
                response?.message ||
                'Prescription updated successfully.',
                'success'
            );

            await list({
                page: state.currentPage,
                limit: state.perPage
            });

            return response;
        } catch (error) {
            console.error(
                'Failed to update prescription:',
                error
            );

            showMessage(
                error?.message ||
                'Unable to update prescription.',
                'error'
            );

            throw error;
        } finally {
            setLoading(false);
        }
    }

    // ============================================================
    // Cancel prescription
    // ============================================================

    async function cancel(
        id,
        reason = ''
    ) {
        if (!id) {
            throw new Error(
                'Prescription ID is required.'
            );
        }

        const data = {
            id: id,
            prescription_id: id
        };

        if (reason) {
            data.cancellation_reason = reason;
            data.reason = reason;
        }

        try {
            const response =
                await API.post(
                    endpoints.cancel,
                    data
                );

            showMessage(
                response?.message ||
                'Prescription cancelled successfully.',
                'success'
            );

            await list({
                page: state.currentPage,
                limit: state.perPage
            });

            return response;
        } catch (error) {
            console.error(
                'Failed to cancel prescription:',
                error
            );

            showMessage(
                error?.message ||
                'Unable to cancel prescription.',
                'error'
            );

            throw error;
        }
    }

    // ============================================================
    // Delete prescription
    // ============================================================

    async function remove(id) {
        if (!id) {
            throw new Error(
                'Prescription ID is required.'
            );
        }

        try {
            const response =
                await API.post(
                    endpoints.delete,
                    {
                        id: id,
                        prescription_id: id
                    }
                );

            showMessage(
                response?.message ||
                'Prescription deleted successfully.',
                'success'
            );

            if (
                state.prescriptions.length === 1 &&
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
                'Failed to delete prescription:',
                error
            );

            showMessage(
                error?.message ||
                'Unable to delete prescription.',
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

        state.medicalRecordId =
            filters.medical_record_id ??
            filters.medicalRecordId ??
            '';

        state.status =
            filters.status ??
            '';

        state.prescriptionType =
            filters.prescription_type ??
            filters.prescriptionType ??
            filters.type ??
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
            medical_record_id:
                state.medicalRecordId,
            status: state.status,
            prescription_type:
                state.prescriptionType,
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
            state.prescriptions.length
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
    // Validation
    // ============================================================

    function validatePrescription(
        prescription
    ) {
        const errors = [];

        if (!prescription.patient_id) {
            errors.push(
                'Patient is required.'
            );
        }

        if (!prescription.doctor_id) {
            errors.push(
                'Doctor is required.'
            );
        }

        if (!prescription.prescription_date) {
            errors.push(
                'Prescription date is required.'
            );
        }

        if (!prescription.medication_name) {
            errors.push(
                'Medication name is required.'
            );
        }

        if (!prescription.dosage) {
            errors.push(
                'Dosage is required.'
            );
        }

        if (!prescription.frequency) {
            errors.push(
                'Frequency is required.'
            );
        }

        if (
            prescription.patient_id &&
            !/^\d+$/.test(
                String(
                    prescription.patient_id
                )
            )
        ) {
            errors.push(
                'Patient ID must be valid.'
            );
        }

        if (
            prescription.doctor_id &&
            !/^\d+$/.test(
                String(
                    prescription.doctor_id
                )
            )
        ) {
            errors.push(
                'Doctor ID must be valid.'
            );
        }

        if (
            prescription.medical_record_id &&
            !/^\d+$/.test(
                String(
                    prescription.medical_record_id
                )
            )
        ) {
            errors.push(
                'Medical record ID must be valid.'
            );
        }

        if (prescription.prescription_date) {
            const date =
                new Date(
                    `${prescription.prescription_date}T00:00:00`
                );

            if (
                Number.isNaN(
                    date.getTime()
                )
            ) {
                errors.push(
                    'Prescription date is invalid.'
                );
            }
        }

        if (
            prescription.quantity !== '' &&
            prescription.quantity !== null &&
            prescription.quantity !== undefined
        ) {
            const quantity =
                Number(
                    prescription.quantity
                );

            if (
                Number.isNaN(quantity) ||
                quantity <= 0
            ) {
                errors.push(
                    'Quantity must be greater than zero.'
                );
            }
        }

        if (
            prescription.refills !== '' &&
            prescription.refills !== null &&
            prescription.refills !== undefined
        ) {
            const refills =
                Number(
                    prescription.refills
                );

            if (
                Number.isNaN(refills) ||
                refills < 0 ||
                !Number.isInteger(refills)
            ) {
                errors.push(
                    'Refills must be a valid whole number.'
                );
            }
        }

        return {
            valid: errors.length === 0,
            errors
        };
    }

    // ============================================================
    // Normalize prescription data
    // ============================================================

    function normalizePrescriptionData(
        prescription = {}
    ) {
        return {
            patient_id:
                prescription.patient_id ??
                '',

            doctor_id:
                prescription.doctor_id ??
                '',

            medical_record_id:
                prescription.medical_record_id ??
                prescription.record_id ??
                '',

            appointment_id:
                prescription.appointment_id ??
                '',

            prescription_date:
                prescription.prescription_date ??
                prescription.date ??
                '',

            prescription_type:
                prescription.prescription_type ??
                prescription.type ??
                '',

            medication_name:
                prescription.medication_name ??
                prescription.medicine_name ??
                prescription.drug_name ??
                prescription.medication ??
                '',

            generic_name:
                prescription.generic_name ??
                '',

            strength:
                prescription.strength ??
                '',

            dosage:
                prescription.dosage ??
                '',

            dosage_form:
                prescription.dosage_form ??
                prescription.form ??
                '',

            route:
                prescription.route ??
                '',

            frequency:
                prescription.frequency ??
                '',

            duration:
                prescription.duration ??
                '',

            quantity:
                prescription.quantity ??
                '',

            unit:
                prescription.unit ??
                '',

            refills:
                prescription.refills ??
                0,

            instructions:
                prescription.instructions ??
                prescription.directions ??
                '',

            indication:
                prescription.indication ??
                '',

            notes:
                prescription.notes ??
                '',

            status:
                prescription.status ??
                'active',

            cancellation_reason:
                prescription.cancellation_reason ??
                '',

            pharmacy_id:
                prescription.pharmacy_id ??
                '',

            dispensed:
                prescription.dispensed ??
                0,

            dispensed_at:
                prescription.dispensed_at ??
                ''
        };
    }

    // ============================================================
    // Form conversion
    // ============================================================

    function formToObject(form) {
        const data = {};

        if (!form) {
            return data;
        }

        const formData =
            new FormData(form);

        formData.forEach(
            (value, key) => {
                data[key] =
                    typeof value === 'string'
                        ? value.trim()
                        : value;
            }
        );

        return data;
    }

    // ============================================================
    // Create form
    // ============================================================

    async function submitCreateForm(form) {
        if (!form) {
            throw new Error(
                'Prescription form was not found.'
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
                'Unable to create prescription.',
                'error'
            );

            throw error;
        }
    }

    // ============================================================
    // Update form
    // ============================================================

    async function submitUpdateForm(
        form,
        prescriptionId
    ) {
        if (!form) {
            throw new Error(
                'Prescription form was not found.'
            );
        }

        if (!prescriptionId) {
            throw new Error(
                'Prescription ID is required.'
            );
        }

        clearMessage();

        const data =
            formToObject(form);

        try {
            return await update(
                prescriptionId,
                data
            );
        } catch (error) {
            showMessage(
                error?.message ||
                'Unable to update prescription.',
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

        const prescription =
            state.prescriptions.find(
                item =>
                    String(
                        getPrescriptionId(item)
                    ) === String(id)
            );

        const medication =
            prescription
                ? getMedicationName(
                    prescription
                )
                : 'this prescription';

        const confirmed =
            window.confirm(
                `Are you sure you want to permanently delete ${medication}?`
            );

        if (!confirmed) {
            return;
        }

        return remove(id);
    }

    // ============================================================
    // Cancel confirmation
    // ============================================================

    async function cancelWithConfirmation(id) {
        if (!id) {
            return;
        }

        const reason =
            window.prompt(
                'Enter a cancellation reason (optional):'
            );

        if (reason === null) {
            return;
        }

        return cancel(
            id,
            reason.trim()
        );
    }

    // ============================================================
    // Refresh
    // ============================================================

    async function refreshList() {
        return list({
            page: state.currentPage,
            limit: state.perPage
        });
    }

    // ============================================================
    // Render prescription table
    // ============================================================

    function renderPrescriptionTable(
        prescriptions =
            state.prescriptions,
        selector =
            '#prescriptionsTableBody'
    ) {
        const tbody =
            getElement(selector);

        if (!tbody) {
            return;
        }

        if (!prescriptions.length) {
            tbody.innerHTML = `
                <tr>
                    <td
                        colspan="11"
                        class="empty-state"
                    >
                        No prescriptions found.
                    </td>
                </tr>
            `;

            return;
        }

        tbody.innerHTML =
            prescriptions.map(
                prescription => {
                    const id =
                        getPrescriptionId(
                            prescription
                        );

                    const patientName =
                        getPatientName(
                            prescription
                        );

                    const doctorName =
                        getDoctorName(
                            prescription
                        );

                    const medicationName =
                        getMedicationName(
                            prescription
                        );

                    const date =
                        prescription.prescription_date ??
                        prescription.date ??
                        '';

                    const dosage =
                        prescription.dosage ??
                        '—';

                    const frequency =
                        prescription.frequency ??
                        '—';

                    const duration =
                        prescription.duration ??
                        '—';

                    const status =
                        prescription.status ??
                        'active';

                    return `
                        <tr
                            data-prescription-id="${escapeHtml(id)}"
                        >
                            <td>
                                ${escapeHtml(id)}
                            </td>

                            <td>
                                ${escapeHtml(
                                    patientName
                                )}
                            </td>

                            <td>
                                ${escapeHtml(
                                    doctorName
                                )}
                            </td>

                            <td>
                                ${escapeHtml(
                                    medicationName
                                )}
                            </td>

                            <td>
                                ${escapeHtml(
                                    dosage
                                )}
                            </td>

                            <td>
                                ${escapeHtml(
                                    frequency
                                )}
                            </td>

                            <td>
                                ${escapeHtml(
                                    duration
                                )}
                            </td>

                            <td>
                                ${escapeHtml(
                                    formatDate(date)
                                )}
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
                                        capitalize(
                                            status
                                        )
                                    )}
                                </span>
                            </td>

                            <td>
                                ${
                                    prescription.dispensed
                                        ? 'Yes'
                                        : 'No'
                                }
                            </td>

                            <td class="actions">
                                <button
                                    type="button"
                                    class="btn btn-sm"
                                    data-action="view-prescription"
                                    data-id="${escapeHtml(id)}"
                                >
                                    View
                                </button>

                                <button
                                    type="button"
                                    class="btn btn-sm"
                                    data-action="edit-prescription"
                                    data-id="${escapeHtml(id)}"
                                >
                                    Edit
                                </button>

                                ${
                                    String(status)
                                        .toLowerCase() !==
                                    'cancelled'
                                        ? `
                                            <button
                                                type="button"
                                                class="btn btn-sm"
                                                data-action="cancel-prescription"
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
                                    data-action="delete-prescription"
                                    data-id="${escapeHtml(id)}"
                                >
                                    Delete
                                </button>
                            </td>
                        </tr>
                    `;
                }
            ).join('');
    }

    // ============================================================
    // Render pagination
    // ============================================================

    function renderPagination(
        total = state.total,
        page = state.currentPage,
        limit = state.perPage,
        selector =
            '#prescriptionsPagination'
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
                prescription${total === 1 ? '' : 's'})
            </div>
        `;

        container.innerHTML = html;
    }

    // ============================================================
    // Show prescription details
    // ============================================================

    async function showDetails(
        id,
        containerSelector =
            '#prescriptionDetails'
    ) {
        const container =
            getElement(containerSelector);

        try {
            const prescription =
                await get(id);

            if (!container) {
                return prescription;
            }

            if (!prescription) {
                container.innerHTML = `
                    <div class="empty-state">
                        Prescription not found.
                    </div>
                `;

                return null;
            }

            const date =
                prescription.prescription_date ??
                prescription.date ??
                '';

            container.innerHTML = `
                <div class="prescription-details">

                    <div class="detail-section">
                        <h3>
                            Prescription Information
                        </h3>

                        <div class="detail-row">
                            <strong>
                                Prescription ID:
                            </strong>
                            <span>
                                ${escapeHtml(
                                    getPrescriptionId(
                                        prescription
                                    )
                                )}
                            </span>
                        </div>

                        <div class="detail-row">
                            <strong>
                                Patient:
                            </strong>
                            <span>
                                ${escapeHtml(
                                    getPatientName(
                                        prescription
                                    )
                                )}
                            </span>
                        </div>

                        <div class="detail-row">
                            <strong>
                                Doctor:
                            </strong>
                            <span>
                                ${escapeHtml(
                                    getDoctorName(
                                        prescription
                                    )
                                )}
                            </span>
                        </div>

                        <div class="detail-row">
                            <strong>
                                Medical Record:
                            </strong>
                            <span>
                                ${escapeHtml(
                                    prescription.medical_record_id ||
                                    '—'
                                )}
                            </span>
                        </div>

                        <div class="detail-row">
                            <strong>
                                Appointment:
                            </strong>
                            <span>
                                ${escapeHtml(
                                    prescription.appointment_id ||
                                    '—'
                                )}
                            </span>
                        </div>

                        <div class="detail-row">
                            <strong>
                                Prescription Date:
                            </strong>
                            <span>
                                ${escapeHtml(
                                    formatDate(date)
                                )}
                            </span>
                        </div>

                        <div class="detail-row">
                            <strong>
                                Type:
                            </strong>
                            <span>
                                ${escapeHtml(
                                    capitalize(
                                        prescription.prescription_type ||
                                        prescription.type ||
                                        ''
                                    )
                                )}
                            </span>
                        </div>

                        <div class="detail-row">
                            <strong>
                                Status:
                            </strong>
                            <span>
                                ${escapeHtml(
                                    capitalize(
                                        prescription.status ||
                                        ''
                                    )
                                )}
                            </span>
                        </div>
                    </div>

                    <div class="detail-section">
                        <h3>
                            Medication
                        </h3>

                        <div class="detail-row">
                            <strong>
                                Medication:
                            </strong>
                            <span>
                                ${escapeHtml(
                                    getMedicationName(
                                        prescription
                                    )
                                )}
                            </span>
                        </div>

                        <div class="detail-row">
                            <strong>
                                Generic Name:
                            </strong>
                            <span>
                                ${escapeHtml(
                                    prescription.generic_name ||
                                    '—'
                                )}
                            </span>
                        </div>

                        <div class="detail-row">
                            <strong>
                                Strength:
                            </strong>
                            <span>
                                ${escapeHtml(
                                    prescription.strength ||
                                    '—'
                                )}
                            </span>
                        </div>

                        <div class="detail-row">
                            <strong>
                                Dosage:
                            </strong>
                            <span>
                                ${escapeHtml(
                                    prescription.dosage ||
                                    '—'
                                )}
                            </span>
                        </div>

                        <div class="detail-row">
                            <strong>
                                Dosage Form:
                            </strong>
                            <span>
                                ${escapeHtml(
                                    prescription.dosage_form ||
                                    prescription.form ||
                                    '—'
                                )}
                            </span>
                        </div>

                        <div class="detail-row">
                            <strong>
                                Route:
                            </strong>
                            <span>
                                ${escapeHtml(
                                    prescription.route ||
                                    '—'
                                )}
                            </span>
                        </div>

                        <div class="detail-row">
                            <strong>
                                Frequency:
                            </strong>
                            <span>
                                ${escapeHtml(
                                    prescription.frequency ||
                                    '—'
                                )}
                            </span>
                        </div>

                        <div class="detail-row">
                            <strong>
                                Duration:
                            </strong>
                            <span>
                                ${escapeHtml(
                                    prescription.duration ||
                                    '—'
                                )}
                            </span>
                        </div>

                        <div class="detail-row">
                            <strong>
                                Quantity:
                            </strong>
                            <span>
                                ${escapeHtml(
                                    prescription.quantity ||
                                    '—'
                                )}
                                ${
                                    prescription.unit
                                        ? ` ${escapeHtml(
                                            prescription.unit
                                        )}`
                                        : ''
                                }
                            </span>
                        </div>

                        <div class="detail-row">
                            <strong>
                                Refills:
                            </strong>
                            <span>
                                ${escapeHtml(
                                    prescription.refills ??
                                    '0'
                                )}
                            </span>
                        </div>
                    </div>

                    <div class="detail-section">
                        <h3>
                            Instructions
                        </h3>

                        <div class="detail-row">
                            <strong>
                                Directions:
                            </strong>
                            <span>
                                ${escapeHtml(
                                    prescription.instructions ||
                                    prescription.directions ||
                                    '—'
                                )}
                            </span>
                        </div>

                        <div class="detail-row">
                            <strong>
                                Indication:
                            </strong>
                            <span>
                                ${escapeHtml(
                                    prescription.indication ||
                                    '—'
                                )}
                            </span>
                        </div>

                        <div class="detail-row">
                            <strong>
                                Notes:
                            </strong>
                            <span>
                                ${escapeHtml(
                                    prescription.notes ||
                                    '—'
                                )}
                            </span>
                        </div>
                    </div>

                    <div class="detail-section">
                        <h3>
                            Dispensing
                        </h3>

                        <div class="detail-row">
                            <strong>
                                Pharmacy:
                            </strong>
                            <span>
                                ${escapeHtml(
                                    prescription.pharmacy_name ||
                                    prescription.pharmacy_id ||
                                    '—'
                                )}
                            </span>
                        </div>

                        <div class="detail-row">
                            <strong>
                                Dispensed:
                            </strong>
                            <span>
                                ${
                                    prescription.dispensed
                                        ? 'Yes'
                                        : 'No'
                                }
                            </span>
                        </div>

                        <div class="detail-row">
                            <strong>
                                Dispensed At:
                            </strong>
                            <span>
                                ${escapeHtml(
                                    prescription.dispensed_at
                                        ? formatDateTime(
                                            prescription.dispensed_at
                                        )
                                        : '—'
                                )}
                            </span>
                        </div>
                    </div>

                    ${
                        prescription.cancellation_reason
                            ? `
                                <div class="detail-section">
                                    <h3>
                                        Cancellation
                                    </h3>

                                    <div class="detail-row">
                                        <strong>
                                            Reason:
                                        </strong>
                                        <span>
                                            ${escapeHtml(
                                                prescription.cancellation_reason
                                            )}
                                        </span>
                                    </div>
                                </div>
                            `
                            : ''
                    }

                </div>
            `;

            return prescription;
        } catch (error) {
            if (container) {
                container.innerHTML = `
                    <div class="message error">
                        Unable to load prescription details.
                    </div>
                `;
            }

            throw error;
        }
    }

    // ============================================================
    // Load prescription into edit form
    // ============================================================

    async function loadPrescriptionIntoForm(
        id,
        formSelector =
            '#editPrescriptionForm'
    ) {
        const form =
            getElement(formSelector);

        if (!form) {
            throw new Error(
                'Edit prescription form was not found.'
            );
        }

        const prescription =
            await get(id);

        if (!prescription) {
            throw new Error(
                'Prescription was not found.'
            );
        }

        const values = {
            id: getPrescriptionId(
                prescription
            ),

            prescription_id:
                getPrescriptionId(
                    prescription
                ),

            patient_id:
                prescription.patient_id ??
                '',

            doctor_id:
                prescription.doctor_id ??
                '',

            medical_record_id:
                prescription.medical_record_id ??
                '',

            appointment_id:
                prescription.appointment_id ??
                '',

            prescription_date:
                prescription.prescription_date ??
                prescription.date ??
                '',

            prescription_type:
                prescription.prescription_type ??
                prescription.type ??
                '',

            medication_name:
                prescription.medication_name ??
                prescription.medicine_name ??
                prescription.drug_name ??
                prescription.medication ??
                '',

            generic_name:
                prescription.generic_name ??
                '',

            strength:
                prescription.strength ??
                '',

            dosage:
                prescription.dosage ??
                '',

            dosage_form:
                prescription.dosage_form ??
                prescription.form ??
                '',

            route:
                prescription.route ??
                '',

            frequency:
                prescription.frequency ??
                '',

            duration:
                prescription.duration ??
                '',

            quantity:
                prescription.quantity ??
                '',

            unit:
                prescription.unit ??
                '',

            refills:
                prescription.refills ??
                0,

            instructions:
                prescription.instructions ??
                prescription.directions ??
                '',

            indication:
                prescription.indication ??
                '',

            notes:
                prescription.notes ??
                '',

            status:
                prescription.status ??
                '',

            cancellation_reason:
                prescription.cancellation_reason ??
                '',

            pharmacy_id:
                prescription.pharmacy_id ??
                '',

            dispensed:
                prescription.dispensed ??
                0
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
                        String(
                            field.value
                        ) ===
                        String(
                            values[name]
                        );
                } else {
                    field.value =
                        values[name] ?? '';
                }
            }
        );

        form.dataset.prescriptionId =
            getPrescriptionId(
                prescription
            );

        return prescription;
    }

    // ============================================================
    // Form handlers
    // ============================================================

    function setupForms() {
        const createForms = [
            '#prescriptionForm',
            '#createPrescriptionForm'
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
                '#editPrescriptionForm'
            );

        if (editForm) {
            editForm.addEventListener(
                'submit',
                async event => {
                    event.preventDefault();

                    const prescriptionId =
                        editForm.dataset
                            .prescriptionId ||
                        editForm.elements.id
                            ?.value ||
                        editForm.elements
                            .prescription_id
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
                            prescriptionId
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
                '#prescriptionSearch'
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
                '#applyPrescriptionFilters'
            );

        if (applyButton) {
            applyButton.addEventListener(
                'click',
                () => {
                    filter({
                        patient_id:
                            getValue(
                                '#prescriptionPatientFilter'
                            ),

                        doctor_id:
                            getValue(
                                '#prescriptionDoctorFilter'
                            ),

                        medical_record_id:
                            getValue(
                                '#prescriptionMedicalRecordFilter'
                            ),

                        prescription_type:
                            getValue(
                                '#prescriptionTypeFilter'
                            ),

                        status:
                            getValue(
                                '#prescriptionStatusFilter'
                            ),

                        date_from:
                            getValue(
                                '#prescriptionDateFrom'
                            ),

                        date_to:
                            getValue(
                                '#prescriptionDateTo'
                            )
                    });
                }
            );
        }

        const clearButton =
            getElement(
                '#clearPrescriptionFilters'
            );

        if (clearButton) {
            clearButton.addEventListener(
                'click',
                async () => {
                    const fields = [
                        '#prescriptionSearch',
                        '#prescriptionPatientFilter',
                        '#prescriptionDoctorFilter',
                        '#prescriptionMedicalRecordFilter',
                        '#prescriptionTypeFilter',
                        '#prescriptionStatusFilter',
                        '#prescriptionDateFrom',
                        '#prescriptionDateTo'
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
                    state.medicalRecordId = '';
                    state.status = '';
                    state.prescriptionType = '';
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
                '#prescriptionsPerPage'
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
                        case 'view-prescription':
                            await showDetails(id);
                            break;

                        case 'edit-prescription':
                            await loadPrescriptionIntoForm(
                                id
                            );

                            document.dispatchEvent(
                                new CustomEvent(
                                    'prescription:edit',
                                    {
                                        detail: {
                                            id: id,
                                            prescription:
                                                state.currentPrescription
                                        }
                                    }
                                )
                            );

                            break;

                        case 'cancel-prescription':
                            await cancelWithConfirmation(
                                id
                            );
                            break;

                        case 'delete-prescription':
                            await deleteWithConfirmation(
                                id
                            );
                            break;

                        default:
                            break;
                    }
                } catch (error) {
                    console.error(
                        `Prescription action "${action}" failed:`,
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
                        '#prescriptionsPagination [data-page]'
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

        const hasPrescriptionUI =
            getElement(
                '#prescriptionsTableBody'
            ) ||
            getElement(
                '#prescriptionForm'
            ) ||
            getElement(
                '#createPrescriptionForm'
            ) ||
            getElement(
                '#editPrescriptionForm'
            );

        if (!hasPrescriptionUI) {
            return;
        }

        try {
            await list({
                page: 1,
                limit: state.perPage
            });
        } catch (error) {
            console.error(
                'Prescription module initialization failed:',
                error
            );
        }
    }

    // ============================================================
    // Public API
    // ============================================================

    const Prescriptions = {
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

        validatePrescription,
        normalizePrescriptionData,
        formToObject,

        submitCreateForm,
        submitUpdateForm,

        deleteWithConfirmation,
        cancelWithConfirmation,

        refreshList,

        renderPrescriptionTable,
        renderPagination,

        showDetails,
        loadPrescriptionIntoForm,

        init
    };

    window.Prescriptions =
        Prescriptions;

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

Prescriptions.list()
Prescriptions.get(id)

Prescriptions.create(data)
Prescriptions.update(id, data)
Prescriptions.cancel(id, reason)
Prescriptions.remove(id)

Prescriptions.search(term)
Prescriptions.filter(filters)

Prescriptions.goToPage(page)
Prescriptions.nextPage()
Prescriptions.previousPage()

Prescriptions.showDetails(id)
Prescriptions.loadPrescriptionIntoForm(id)

Prescriptions.refreshList()