/**
 * Medical Management System
 * Frontend/js/patients.js
 *
 * Patient operations:
 * - Load patients
 * - Search patients
 * - Filter patients
 * - Pagination
 * - Get patient
 * - Create patient
 * - Update patient
 * - Delete patient
 * - Patient form handling
 * - Patient details
 */

'use strict';

const Patients = (() => {

    const state = {
        patients: [],
        currentPatient: null,
        currentPage: 1,
        perPage: 10,
        total: 0,
        search: '',
        status: '',
        gender: '',
        loading: false
    };

    const endpoints = {
        list: '/patients/list.php',
        get: '/patients/get.php',
        create: '/patients/create.php',
        update: '/patients/update.php',
        delete: '/patients/delete.php'
    };


    /* ============================================================
       LIST PATIENTS
       ============================================================ */

    async function list(options = {}) {

        const params = {
            page: options.page || state.currentPage,
            limit: options.limit || state.perPage,
            search: options.search ?? state.search,
            status: options.status ?? state.status,
            gender: options.gender ?? state.gender
        };

        state.loading = true;

        try {

            const query = new URLSearchParams();

            Object.entries(params).forEach(([key, value]) => {

                if (
                    value !== undefined &&
                    value !== null &&
                    value !== ''
                ) {
                    query.append(key, value);
                }

            });

            const url =
                `${endpoints.list}?${query.toString()}`;

            const response = await API.get(url);

            if (!response || response.success === false) {
                throw new Error(
                    response?.message ||
                    'Unable to load patients.'
                );
            }

            const data = response.data || response;

            state.patients =
                Array.isArray(data.patients)
                    ? data.patients
                    : Array.isArray(data)
                        ? data
                        : [];

            state.total =
                Number(
                    data.total ??
                    response.total ??
                    state.patients.length
                );

            state.currentPage =
                Number(
                    data.page ??
                    params.page
                );

            state.perPage =
                Number(
                    data.limit ??
                    params.limit
                );

            return {
                success: true,
                patients: state.patients,
                total: state.total,
                page: state.currentPage,
                limit: state.perPage
            };

        } catch (error) {

            console.error(
                'Patient list error:',
                error
            );

            throw error;

        } finally {

            state.loading = false;
        }
    }


    /* ============================================================
       GET PATIENT
       ============================================================ */

    async function get(id) {

        if (!id) {
            throw new Error('Patient ID is required.');
        }

        try {

            const response = await API.get(
                `${endpoints.get}?id=${encodeURIComponent(id)}`
            );

            if (!response || response.success === false) {
                throw new Error(
                    response?.message ||
                    'Unable to retrieve patient.'
                );
            }

            const patient =
                response.data?.patient ||
                response.patient ||
                response.data;

            state.currentPatient = patient || null;

            return patient;

        } catch (error) {

            console.error(
                'Get patient error:',
                error
            );

            throw error;
        }
    }


    /* ============================================================
       CREATE PATIENT
       ============================================================ */

    async function create(patientData) {

        validatePatient(patientData);

        try {

            const response = await API.post(
                endpoints.create,
                normalizePatientData(patientData)
            );

            if (!response || response.success === false) {
                throw new Error(
                    response?.message ||
                    'Unable to create patient.'
                );
            }

            const patient =
                response.data?.patient ||
                response.patient ||
                response.data;

            return {
                success: true,
                patient,
                message:
                    response.message ||
                    'Patient created successfully.'
            };

        } catch (error) {

            console.error(
                'Create patient error:',
                error
            );

            throw error;
        }
    }


    /* ============================================================
       UPDATE PATIENT
       ============================================================ */

    async function update(id, patientData) {

        if (!id) {
            throw new Error('Patient ID is required.');
        }

        validatePatient(patientData);

        try {

            const payload = {
                id,
                ...normalizePatientData(patientData)
            };

            const response = await API.post(
                endpoints.update,
                payload
            );

            if (!response || response.success === false) {
                throw new Error(
                    response?.message ||
                    'Unable to update patient.'
                );
            }

            const patient =
                response.data?.patient ||
                response.patient ||
                response.data;

            return {
                success: true,
                patient,
                message:
                    response.message ||
                    'Patient updated successfully.'
            };

        } catch (error) {

            console.error(
                'Update patient error:',
                error
            );

            throw error;
        }
    }


    /* ============================================================
       DELETE PATIENT
       ============================================================ */

    async function remove(id) {

        if (!id) {
            throw new Error('Patient ID is required.');
        }

        try {

            const response = await API.post(
                endpoints.delete,
                { id }
            );

            if (!response || response.success === false) {
                throw new Error(
                    response?.message ||
                    'Unable to delete patient.'
                );
            }

            return {
                success: true,
                message:
                    response.message ||
                    'Patient deleted successfully.'
            };

        } catch (error) {

            console.error(
                'Delete patient error:',
                error
            );

            throw error;
        }
    }


    /* ============================================================
       SEARCH
       ============================================================ */

    async function search(term) {

        state.search =
            typeof term === 'string'
                ? term.trim()
                : '';

        state.currentPage = 1;

        return await list();
    }


    /* ============================================================
       FILTER
       ============================================================ */

    async function filter(filters = {}) {

        state.status =
            filters.status ?? '';

        state.gender =
            filters.gender ?? '';

        state.search =
            filters.search ?? '';

        state.currentPage = 1;

        return await list();
    }


    /* ============================================================
       PAGINATION
       ============================================================ */

    async function goToPage(page) {

        page = Number(page);

        if (!Number.isInteger(page) || page < 1) {
            return;
        }

        state.currentPage = page;

        return await list();
    }


    async function nextPage() {

        const totalPages =
            Math.ceil(
                state.total / state.perPage
            );

        if (state.currentPage >= totalPages) {
            return;
        }

        return await goToPage(
            state.currentPage + 1
        );
    }


    async function previousPage() {

        if (state.currentPage <= 1) {
            return;
        }

        return await goToPage(
            state.currentPage - 1
        );
    }


    /* ============================================================
       VALIDATION
       ============================================================ */

    function validatePatient(patient) {

        if (!patient || typeof patient !== 'object') {
            throw new Error(
                'Patient information is required.'
            );
        }

        const firstName =
            patient.first_name ??
            patient.firstName;

        const lastName =
            patient.last_name ??
            patient.lastName;

        if (!firstName || !String(firstName).trim()) {
            throw new Error(
                'First name is required.'
            );
        }

        if (!lastName || !String(lastName).trim()) {
            throw new Error(
                'Last name is required.'
            );
        }

        if (
            patient.email &&
            !isValidEmail(patient.email)
        ) {
            throw new Error(
                'Please enter a valid email address.'
            );
        }

        if (
            patient.date_of_birth &&
            !isValidDate(patient.date_of_birth)
        ) {
            throw new Error(
                'Please enter a valid date of birth.'
            );
        }

        return true;
    }


    /* ============================================================
       NORMALIZE PATIENT DATA
       ============================================================ */

    function normalizePatientData(patient) {

        return {
            first_name:
                clean(patient.first_name ??
                    patient.firstName),

            middle_name:
                clean(patient.middle_name ??
                    patient.middleName),

            last_name:
                clean(patient.last_name ??
                    patient.lastName),

            date_of_birth:
                clean(patient.date_of_birth ??
                    patient.dateOfBirth),

            gender:
                clean(patient.gender),

            blood_group:
                clean(patient.blood_group ??
                    patient.bloodGroup),

            phone:
                clean(patient.phone),

            email:
                clean(patient.email),

            address:
                clean(patient.address),

            city:
                clean(patient.city),

            state:
                clean(patient.state),

            postal_code:
                clean(patient.postal_code ??
                    patient.postalCode),

            emergency_contact_name:
                clean(
                    patient.emergency_contact_name ??
                    patient.emergencyContactName
                ),

            emergency_contact_phone:
                clean(
                    patient.emergency_contact_phone ??
                    patient.emergencyContactPhone
                ),

            emergency_contact_relationship:
                clean(
                    patient.emergency_contact_relationship ??
                    patient.emergencyContactRelationship
                ),

            insurance_provider:
                clean(
                    patient.insurance_provider ??
                    patient.insuranceProvider
                ),

            insurance_number:
                clean(
                    patient.insurance_number ??
                    patient.insuranceNumber
                ),

            status:
                clean(patient.status) || 'active'
        };
    }


    /* ============================================================
       FORM → OBJECT
       ============================================================ */

    function formToObject(form) {

        if (!form) {
            throw new Error('Patient form was not found.');
        }

        const formData =
            new FormData(form);

        const data = {};

        formData.forEach((value, key) => {

            if (
                typeof value === 'string'
            ) {
                data[key] = value.trim();
            } else {
                data[key] = value;
            }
        });

        return data;
    }


    /* ============================================================
       CREATE FORM
       ============================================================ */

    async function submitCreateForm(form) {

        const patient =
            formToObject(form);

        const result =
            await create(patient);

        showMessage(
            result.message,
            'success'
        );

        form.reset();

        await refreshList();

        return result;
    }


    /* ============================================================
       UPDATE FORM
       ============================================================ */

    async function submitUpdateForm(
        form,
        patientId
    ) {

        const patient =
            formToObject(form);

        const result =
            await update(
                patientId,
                patient
            );

        showMessage(
            result.message,
            'success'
        );

        await refreshList();

        return result;
    }


    /* ============================================================
       DELETE WITH CONFIRMATION
       ============================================================ */

    async function deleteWithConfirmation(id) {

        if (!id) {
            return;
        }

        const confirmed =
            window.confirm(
                'Are you sure you want to delete this patient? This action cannot be undone.'
            );

        if (!confirmed) {
            return {
                success: false,
                cancelled: true
            };
        }

        const result =
            await remove(id);

        showMessage(
            result.message,
            'success'
        );

        await refreshList();

        return result;
    }


    /* ============================================================
       REFRESH LIST
       ============================================================ */

    async function refreshList() {

        const result =
            await list();

        renderPatientTable(
            result.patients
        );

        renderPagination(
            result.total,
            result.page,
            result.limit
        );

        return result;
    }


    /* ============================================================
       RENDER TABLE
       ============================================================ */

    function renderPatientTable(
        patients,
        selector = '#patientsTableBody'
    ) {

        const tbody =
            document.querySelector(selector);

        if (!tbody) {
            return;
        }

        tbody.innerHTML = '';

        if (
            !Array.isArray(patients) ||
            patients.length === 0
        ) {

            tbody.innerHTML = `
                <tr>
                    <td colspan="100%" class="empty-state">
                        No patients found.
                    </td>
                </tr>
            `;

            return;
        }

        patients.forEach(patient => {

            const id =
                patient.id ??
                patient.patient_id;

            const name =
                [
                    patient.first_name,
                    patient.middle_name,
                    patient.last_name
                ]
                    .filter(Boolean)
                    .join(' ');

            const row =
                document.createElement('tr');

            row.innerHTML = `
                <td>
                    ${escapeHtml(
                        patient.patient_number ||
                        patient.patient_code ||
                        id ||
                        ''
                    )}
                </td>

                <td>
                    ${escapeHtml(name)}
                </td>

                <td>
                    ${escapeHtml(
                        patient.gender || ''
                    )}
                </td>

                <td>
                    ${escapeHtml(
                        formatDate(
                            patient.date_of_birth
                        )
                    )}
                </td>

                <td>
                    ${escapeHtml(
                        patient.phone || ''
                    )}
                </td>

                <td>
                    ${escapeHtml(
                        patient.email || ''
                    )}
                </td>

                <td>
                    <span class="status-badge status-${escapeHtml(
                        String(patient.status || 'active')
                            .toLowerCase()
                    )}">
                        ${escapeHtml(
                            formatStatus(
                                patient.status
                            )
                        )}
                    </span>
                </td>

                <td class="actions">

                    <button
                        type="button"
                        class="btn btn-sm btn-view"
                        data-action="view-patient"
                        data-id="${escapeHtml(id)}"
                    >
                        View
                    </button>

                    <button
                        type="button"
                        class="btn btn-sm btn-edit"
                        data-action="edit-patient"
                        data-id="${escapeHtml(id)}"
                    >
                        Edit
                    </button>

                    <button
                        type="button"
                        class="btn btn-sm btn-danger"
                        data-action="delete-patient"
                        data-id="${escapeHtml(id)}"
                    >
                        Delete
                    </button>

                </td>
            `;

            tbody.appendChild(row);
        });
    }


    /* ============================================================
       RENDER PAGINATION
       ============================================================ */

    function renderPagination(
        total,
        page,
        limit,
        selector = '#patientsPagination'
    ) {

        const container =
            document.querySelector(selector);

        if (!container) {
            return;
        }

        const totalPages =
            Math.ceil(total / limit);

        container.innerHTML = '';

        if (totalPages <= 1) {
            return;
        }

        const previous =
            document.createElement('button');

        previous.type = 'button';
        previous.className = 'pagination-btn';
        previous.textContent = 'Previous';
        previous.disabled = page <= 1;

        previous.addEventListener(
            'click',
            () => previousPage()
        );

        container.appendChild(previous);


        for (
            let pageNumber = 1;
            pageNumber <= totalPages;
            pageNumber++
        ) {

            const button =
                document.createElement('button');

            button.type = 'button';
            button.className =
                'pagination-btn';

            if (pageNumber === page) {
                button.classList.add('active');
            }

            button.textContent =
                pageNumber;

            button.addEventListener(
                'click',
                () => goToPage(pageNumber)
            );

            container.appendChild(button);
        }


        const next =
            document.createElement('button');

        next.type = 'button';
        next.className = 'pagination-btn';
        next.textContent = 'Next';
        next.disabled =
            page >= totalPages;

        next.addEventListener(
            'click',
            () => nextPage()
        );

        container.appendChild(next);
    }


    /* ============================================================
       SHOW PATIENT DETAILS
       ============================================================ */

    async function showDetails(
        id,
        containerSelector = '#patientDetails'
    ) {

        const container =
            document.querySelector(
                containerSelector
            );

        const patient =
            await get(id);

        if (!container) {
            return patient;
        }

        const fullName =
            [
                patient.first_name,
                patient.middle_name,
                patient.last_name
            ]
                .filter(Boolean)
                .join(' ');

        container.innerHTML = `
            <div class="patient-details">

                <h2>
                    ${escapeHtml(fullName)}
                </h2>

                <div class="details-grid">

                    <div>
                        <strong>Patient ID</strong>
                        <span>
                            ${escapeHtml(
                                patient.patient_number ||
                                patient.patient_code ||
                                patient.id ||
                                ''
                            )}
                        </span>
                    </div>

                    <div>
                        <strong>Date of Birth</strong>
                        <span>
                            ${escapeHtml(
                                formatDate(
                                    patient.date_of_birth
                                )
                            )}
                        </span>
                    </div>

                    <div>
                        <strong>Gender</strong>
                        <span>
                            ${escapeHtml(
                                patient.gender || ''
                            )}
                        </span>
                    </div>

                    <div>
                        <strong>Blood Group</strong>
                        <span>
                            ${escapeHtml(
                                patient.blood_group || ''
                            )}
                        </span>
                    </div>

                    <div>
                        <strong>Phone</strong>
                        <span>
                            ${escapeHtml(
                                patient.phone || ''
                            )}
                        </span>
                    </div>

                    <div>
                        <strong>Email</strong>
                        <span>
                            ${escapeHtml(
                                patient.email || ''
                            )}
                        </span>
                    </div>

                    <div>
                        <strong>Address</strong>
                        <span>
                            ${escapeHtml(
                                patient.address || ''
                            )}
                        </span>
                    </div>

                    <div>
                        <strong>Status</strong>
                        <span>
                            ${escapeHtml(
                                formatStatus(
                                    patient.status
                                )
                            )}
                        </span>
                    </div>

                </div>

            </div>
        `;

        return patient;
    }


    /* ============================================================
       INITIALIZE PATIENT PAGE
       ============================================================ */

    async function init() {

        if (typeof API === 'undefined') {
            console.error(
                'API client is not loaded.'
            );
            return;
        }

        try {

            await refreshList();

            setupSearch();

            setupFilters();

            setupPatientActions();

            setupPatientForms();

        } catch (error) {

            console.error(
                'Patient page initialization failed:',
                error
            );

            showMessage(
                error.message ||
                'Unable to load patients.',
                'error'
            );
        }
    }


    /* ============================================================
       SEARCH EVENTS
       ============================================================ */

    function setupSearch() {

        const input =
            document.querySelector(
                '#patientSearch'
            );

        if (!input) {
            return;
        }

        let timer;

        input.addEventListener(
            'input',
            () => {

                clearTimeout(timer);

                timer = setTimeout(
                    () => search(input.value),
                    400
                );
            }
        );
    }


    /* ============================================================
       FILTER EVENTS
       ============================================================ */

    function setupFilters() {

        const status =
            document.querySelector(
                '#patientStatusFilter'
            );

        const gender =
            document.querySelector(
                '#patientGenderFilter'
            );

        const apply =
            document.querySelector(
                '#applyPatientFilters'
            );

        if (apply) {

            apply.addEventListener(
                'click',
                () => filter({
                    status: status?.value || '',
                    gender: gender?.value || '',
                    search:
                        document.querySelector(
                            '#patientSearch'
                        )?.value || ''
                })
            );
        }

        [status, gender]
            .filter(Boolean)
            .forEach(select => {

                select.addEventListener(
                    'change',
                    () => filter({
                        status:
                            status?.value || '',
                        gender:
                            gender?.value || '',
                        search:
                            document.querySelector(
                                '#patientSearch'
                            )?.value || ''
                    })
                );
            });
    }


    /* ============================================================
       PATIENT ACTION BUTTONS
       ============================================================ */

    function setupPatientActions() {

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

                        case 'view-patient':

                            await showDetails(id);

                            break;

                        case 'edit-patient':

                            await loadPatientIntoForm(id);

                            break;

                        case 'delete-patient':

                            await deleteWithConfirmation(id);

                            break;

                    }

                } catch (error) {

                    console.error(
                        'Patient action failed:',
                        error
                    );

                    showMessage(
                        error.message ||
                        'Patient operation failed.',
                        'error'
                    );
                }
            }
        );
    }


    /* ============================================================
       LOAD PATIENT INTO EDIT FORM
       ============================================================ */

    async function loadPatientIntoForm(id) {

        const patient =
            await get(id);

        const form =
            document.querySelector(
                '#patientForm'
            );

        if (!form) {
            return patient;
        }

        Object.entries(patient)
            .forEach(([key, value]) => {

                const input =
                    form.elements.namedItem(key);

                if (!input) {
                    return;
                }

                input.value =
                    value ?? '';
            });

        const idInput =
            form.elements.namedItem('id');

        if (idInput) {
            idInput.value =
                patient.id ??
                patient.patient_id ??
                '';
        }

        form.dataset.mode = 'edit';

        form.dataset.patientId =
            patient.id ??
            patient.patient_id ??
            '';

        return patient;
    }


    /* ============================================================
       PATIENT FORMS
       ============================================================ */

    function setupPatientForms() {

        const forms =
            document.querySelectorAll(
                '#patientForm, #createPatientForm, #editPatientForm'
            );

        forms.forEach(form => {

            form.addEventListener(
                'submit',
                async event => {

                    event.preventDefault();

                    try {

                        const patient =
                            formToObject(form);

                        const patientId =
                            form.dataset.patientId ||
                            patient.id;

                        let result;

                        if (
                            patientId &&
                            (
                                form.dataset.mode === 'edit' ||
                                form.id === 'editPatientForm'
                            )
                        ) {

                            result =
                                await update(
                                    patientId,
                                    patient
                                );

                        } else {

                            result =
                                await create(
                                    patient
                                );
                        }

                        showMessage(
                            result.message,
                            'success'
                        );

                        form.reset();

                        delete form.dataset.mode;
                        delete form.dataset.patientId;

                        await refreshList();

                    } catch (error) {

                        console.error(
                            'Patient form error:',
                            error
                        );

                        showMessage(
                            error.message ||
                            'Unable to save patient.',
                            'error'
                        );
                    }
                }
            );
        });
    }


    /* ============================================================
       UTILITY FUNCTIONS
       ============================================================ */

    function clean(value) {

        if (
            value === undefined ||
            value === null
        ) {
            return '';
        }

        return String(value).trim();
    }


    function isValidEmail(email) {

        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/
            .test(email);
    }


    function isValidDate(date) {

        const parsed =
            new Date(date);

        return !Number.isNaN(
            parsed.getTime()
        );
    }


    function formatDate(date) {

        if (!date) {
            return '';
        }

        const parsed =
            new Date(date);

        if (Number.isNaN(parsed.getTime())) {
            return date;
        }

        return parsed.toLocaleDateString(
            undefined,
            {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            }
        );
    }


    function formatStatus(status) {

        if (!status) {
            return 'Active';
        }

        return String(status)
            .replace(/[_-]/g, ' ')
            .replace(/\b\w/g, char =>
                char.toUpperCase()
            );
    }


    function escapeHtml(value) {

        if (
            value === undefined ||
            value === null
        ) {
            return '';
        }

        return String(value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }


    function showMessage(
        message,
        type = 'info'
    ) {

        const element =
            document.querySelector(
                '#patientMessage'
            );

        if (!element) {
            return;
        }

        element.textContent =
            message || '';

        element.className =
            `message message-${type}`;

        element.hidden = false;

        setTimeout(() => {
            element.hidden = true;
        }, 5000);
    }


    /* ============================================================
       PUBLIC API
       ============================================================ */

    return {

        state,

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

        refreshList,

        showDetails,

        formToObject,
        validatePatient,

        submitCreateForm,
        submitUpdateForm,

        deleteWithConfirmation,

        init
    };

})();


/*
 * Make Patients available globally.
 */
window.Patients = Patients;


/* ================================================================
   AUTO INITIALIZATION
   ================================================================ */

document.addEventListener(
    'DOMContentLoaded',
    () => {

        /*
         * Only initialize when this is actually
         * the patients page.
         */
        if (
            document.querySelector(
                '#patientsTableBody'
            ) ||
            document.querySelector(
                '#patientForm'
            )
        ) {
            Patients.init();
        }
    }
);

patients.html
     │
     ▼
patients.js
     │
     ▼
api.js
     │
     ├── GET  patients/list.php
     ├── GET  patients/get.php
     ├── POST patients/create.php
     ├── POST patients/update.php
     └── POST patients/delete.php
              │
              ▼
       PatientController
              │
              ▼
          Patient.php
              │
              ▼
           MySQL